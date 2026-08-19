"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HexSlot } from "./HexSlot";
import { costColor } from "@/lib/theme";
import { UnitMeta } from "@/lib/tft-data";

export type UnitEntry = {
  characterId: string;
  gamesCount: number;
  meta: UnitMeta;
};

export function UnitSearch({ units }: { units: UnitEntry[] }) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? units.filter((u) => u.meta.name.toLowerCase().includes(q))
      : units;
    const byCost = new Map<number, UnitEntry[]>();
    for (const u of filtered) {
      const list = byCost.get(u.meta.cost) ?? [];
      list.push(u);
      byCost.set(u.meta.cost, list);
    }
    return [...byCost.entries()].sort((a, b) => a[0] - b[0]);
  }, [units, query]);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search units..."
        className="mb-8 w-full max-w-md rounded-lg border border-hairline bg-panel px-5 py-3 text-xl text-text placeholder:text-text-mute focus:border-hairline-strong focus:outline-none"
      />
      <div className="flex flex-col gap-8">
        {grouped.map(([cost, list]) => (
          <div key={cost}>
            <div className="mb-3 flex items-center gap-3 text-xl uppercase tracking-wide text-text-mute">
              <span
                className="h-2.5 w-2.5 rotate-45"
                style={{ backgroundColor: costColor(cost) }}
              />
              {cost} cost
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[...list]
                .sort((a, b) => a.meta.name.localeCompare(b.meta.name))
                .map((u) => (
                  <Link
                    key={u.characterId}
                    href={`/units/${u.characterId}`}
                    className="flex items-center gap-4 rounded-lg px-3 py-2.5 hover:bg-panel-raised"
                  >
                    <HexSlot
                      size={54}
                      borderColor={costColor(u.meta.cost)}
                      iconUrl={u.meta.iconUrl}
                      label={u.meta.name[0]}
                      alt={u.meta.name}
                    />
                    <div>
                      <div className="text-xl font-medium">
                        {u.meta.name}
                      </div>
                      <div className="text-base text-text-mute">
                        {u.gamesCount.toLocaleString()} games
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
