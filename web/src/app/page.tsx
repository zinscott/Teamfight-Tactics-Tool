import { supabase } from "@/lib/supabase";
import { getUnitMetaMap } from "@/lib/tft-data";
import { UnitStatRow } from "@/lib/stats";
import { UnitSearch, UnitEntry } from "@/components/UnitSearch";

export const revalidate = 3600;

export default async function HomePage() {
  const { data, error } = await supabase
    .from("unit_stats")
    .select("*")
    .order("games_count", { ascending: false });

  if (error) {
    throw new Error(`Supabase select failed: ${error.message}`);
  }

  const rows = (data ?? []) as UnitStatRow[];
  const metaMap = await getUnitMetaMap();

  const units: UnitEntry[] = rows.map((r) => ({
    characterId: r.character_id,
    gamesCount: r.games_count,
    meta: metaMap.get(r.character_id.toLowerCase()) ?? {
      name: r.character_id,
      cost: 1,
      traits: [],
      iconUrl: null,
    },
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-8 py-12">
      <header className="mb-10 flex items-center justify-between border-b border-hairline pb-6">
        <div>
          <h1 className="font-heading text-6xl font-semibold">
            Stats explorer
          </h1>
          <p className="mt-3 text-xl uppercase tracking-wide text-text-mute">
            Item builds · Grandmaster+
          </p>
        </div>
      </header>
      <UnitSearch units={units} />
    </main>
  );
}
