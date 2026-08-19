# Teamfight Tactics Tool

**Live:** [teamfight-tactics-tool.vercel.app](https://teamfight-tactics-tool.vercel.app/)

A TFT statistics site, in the vein of tactics.tools, focused on item builds: which items are actually good on which units, backed by real Grandmaster+ match data rather than a static tier list.

## Architecture

```
Riot API  →  Trigger.dev (crawl + aggregate)  →  Supabase (Postgres)  →  Next.js frontend
```

Three independent pieces, each deployed separately:

- **Trigger.dev** (`src/trigger/`) — background jobs that crawl Riot's API on a schedule and write to Supabase. Nothing here talks to the frontend directly.
- **Supabase** — the database. Both the crawler and the frontend read/write it, but never talk to each other.
- **Frontend** (`web/`) — a Next.js app that only ever reads from Supabase (and Community Dragon, for unit/item names and icons). It never calls the Riot API.

If the Trigger.dev crons ever stop running, the site doesn't break, it just serves increasingly stale data, since the frontend has no direct dependency on the crawler.

## Backend (`src/trigger/`)

- `riot-api.ts` — shared fetch helper. Adds the `X-Riot-Token` header and automatically retries on 429s (respecting `Retry-After`).
- `seed-summoners.ts` — scheduled daily. Crawls Challenger and Grandmaster via `league-v1`, upserts PUUIDs into `tracked_summoners`. Scope is intentionally limited to these two tiers (see "Known limitations" below).
- `crawl-queue.ts` — scheduled every 4 hours. Fans out `fetch-match-history` runs for whichever tracked summoners haven't been crawled in the last 24h (rotates through the roster, skips if a previous batch is still draining).
- `fetch-match-history.ts` — per-summoner match crawler. Writes `match_history` + `match_participants` (ranked/normal queues only), and snowball-discovers new summoners from the other 7 players in each match.
- `aggregate-item-stats.ts` — scheduled every 4 hours. Rolls up all of `match_participants` into four pre-computed stat tables (below). This is what the frontend actually reads, it never computes aggregates live.



## Database (`supabase/migrations/`)



### Raw crawl tables

`tracked_summoners` — the crawl roster.


| column            | type        | notes                                                               |
| ----------------- | ----------- | ------------------------------------------------------------------- |
| `puuid`           | text        | PK                                                                  |
| `tier`            | text        | nullable — null until a match places a snowball-discovered summoner |
| `division`        | text        | nullable                                                            |
| `last_crawled_at` | timestamptz | nullable, drives the crawl rotation                                 |
| `updated_at`      | timestamptz |                                                                     |


`match_history` — one row per match.


| column              | type        | notes              |
| ------------------- | ----------- | ------------------ |
| `match_id`          | text        | PK                 |
| `game_version`      | text        | patch string       |
| `game_datetime`     | timestamptz |                    |
| `tft_set_core_name` | text        |                    |
| `tft_set_number`    | int4        |                    |
| `queue_id`          | int4        | ranked/normal only |


`match_participants` — one row per (match, player); this is the raw material `aggregate-item-stats.ts` reads.


| column      | type  | notes                                                                                                              |
| ----------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `match_id`  | text  | PK, FK → `match_history.match_id`                                                                                  |
| `puuid`     | text  | PK, FK → `tracked_summoners.puuid`                                                                                 |
| `win`       | bool  | true = 1st place only, not top-4 (Riot's own `win` field means top-4; this is renamed/reinterpreted at write time) |
| `placement` | int4  |                                                                                                                    |
| `units`     | jsonb | the board: `[{character_id, itemNames[]}, ...]`                                                                    |




### Aggregate tables (what the frontend reads)

All four share the same stat columns: `games_count`, `wins_count`, `top4_count`, `avg_placement` (all from `win`/`placement` above), plus `updated_at` and differ only in their key:


| table              | key columns                                  |
| ------------------ | -------------------------------------------- |
| `unit_stats`       | `character_id`                               |
| `item_stats`       | `character_id`, `item_name`                  |
| `item_pair_stats`  | `character_id`, `item_a`, `item_b`           |
| `full_build_stats` | `character_id`, `item_a`, `item_b`, `item_c` |


The item tables are multiset-aware by design, filtering by "2x Nashor's Tooth" is a different, real question from "1x Nashor's Tooth." `item_pair_stats` stores a "2x the same item" state as a self-pair (`item_a == item_b`), and `full_build_stats` keeps duplicate-item triples as their own rows (e.g. 3x Gargoyle Stoneplate) rather than collapsing them.

## Frontend (`web/`)

Next.js (App Router) + TypeScript + Tailwind. See `web/`'s own structure:

- `lib/supabase.ts` — server-only Supabase client (service-role key, never sent to the browser).
- `lib/tft-data.ts` — resolves raw Riot IDs (`TFT17_Aatrox`, `TFT_Item_InfinityEdge`) into real names/icons/costs via Community Dragon.
- `lib/stats.ts` — the actual filter/drill-down logic (multiset containment, depth-based table selection). Pure functions, no React or Supabase. This is where the real behavior lives.
- `components/` — presentational pieces (tables, chips, tabs) plus `Explorer.tsx`, the one stateful component tying them together.
- `app/` — the two pages: a searchable unit list (`/`) and the per-unit stats explorer (`/units/[unitId]`).



## Known limitations

- **Scope is Challenger + Grandmaster only.** Not a deliberate design ceiling, mainly a Supabase free-tier storage constraint that led to narrowing the crawl scope.
- **No patch/rank/queue dimension in the aggregates.** The four stat tables are global rolling numbers, there's no way yet to ask "what were the best builds on patch 16.15" specifically when on 16.16. Data resets per-patch soon to be implemented.
- **Full-build stats require exactly 3 items.** A unit that only ever ran 1 or 2 items won't have a `full_build_stats` row at all, that data still exists at the `item_stats`/`item_pair_stats` level, just not as a "build."
- **A handful of unit IDs won't have Community Dragon metadata** (e.g. Bard's summoned companion) - these render with their raw ID and no icon rather than being filtered out.

