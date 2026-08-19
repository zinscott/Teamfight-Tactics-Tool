"use client";

import { useMemo, useState } from "react";
import { HexSlot } from "./HexSlot";
import { BuildRow, deriveRates } from "@/lib/stats";
import { ItemMeta } from "@/lib/tft-data";
import { CYAN } from "@/lib/theme";

type SortKey = "place" | "win" | "top4" | "pick" | "games";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "place", label: "Avg place" },
  { key: "win", label: "Win %" },
  { key: "top4", label: "Top 4 %" },
  { key: "pick", label: "Pick %" },
  { key: "games", label: "Games" },
];

function sortValue(row: BuildRow, key: SortKey): number {
  const { winRate, top4Rate } = deriveRates(row);
  switch (key) {
    case "place":
      return row.avg_placement;
    case "win":
      return winRate;
    case "top4":
      return top4Rate;
    case "pick":
      return row.pickRate;
    case "games":
      return row.games_count;
  }
}

export function BuildsTable({
  rows,
  itemMetaById,
}: {
  rows: BuildRow[];
  itemMetaById: Record<string, ItemMeta>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("win");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = useMemo(() => {
    return [...rows].sort(
      (a, b) => (sortValue(a, sortKey) - sortValue(b, sortKey)) * sortDir,
    );
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "place" ? 1 : -1);
    }
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center text-base text-text-mute">
        No full builds recorded for this filter yet.
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-lg">
      <thead>
        <tr>
          <th className="w-8 border-b border-hairline-strong px-3 py-2.5 text-left text-sm uppercase tracking-wide text-text-mute">
            #
          </th>
          <th className="border-b border-hairline-strong px-3 py-2.5 text-left text-sm uppercase tracking-wide text-text-mute">
            Full build
          </th>
          {COLUMNS.map((col) => (
            <th
              key={col.key}
              onClick={() => handleSort(col.key)}
              className={`cursor-pointer border-b border-hairline-strong px-3 py-2.5 text-left text-sm uppercase tracking-wide select-none ${
                sortKey === col.key ? "text-gold" : "text-text-mute hover:text-text-soft"
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, idx) => {
          const { winRate, top4Rate } = deriveRates(row);
          const items = [row.item_a, row.item_b, row.item_c];
          return (
            <tr key={idx}>
              <td className="border-b border-hairline px-3 py-2.5 font-mono text-text-mute">
                {idx + 1}
              </td>
              <td className="border-b border-hairline px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  {items.map((itemName, i) => (
                    <HexSlot
                      key={i}
                      size={32}
                      borderColor={CYAN}
                      fillColor="#1B2A22"
                      iconUrl={itemMetaById[itemName]?.iconUrl}
                      label={(itemMetaById[itemName]?.name ?? itemName)
                        .slice(0, 2)
                        .toUpperCase()}
                      alt={itemMetaById[itemName]?.name ?? itemName}
                    />
                  ))}
                </div>
              </td>
              <td className="border-b border-hairline px-3 py-2.5 font-mono">
                {row.avg_placement.toFixed(2)}
              </td>
              <td className="border-b border-hairline px-3 py-2.5 font-mono">
                {winRate.toFixed(1)}%
              </td>
              <td className="border-b border-hairline px-3 py-2.5 font-mono">
                {top4Rate.toFixed(1)}%
              </td>
              <td className="border-b border-hairline px-3 py-2.5">
                <div className="flex flex-col gap-1">
                  <span className="font-mono">{row.pickRate.toFixed(1)}%</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full bg-cyan"
                      style={{ width: `${Math.min(100, row.pickRate)}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="border-b border-hairline px-3 py-2.5 font-mono">
                {row.games_count.toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
