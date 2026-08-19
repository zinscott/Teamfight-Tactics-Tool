"use client";

import { useMemo, useState } from "react";
import { HexSlot } from "./HexSlot";
import { DrillRow, deriveRates, StatRow } from "@/lib/stats";
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

function sortValue(entry: DrillRow<StatRow>, key: SortKey): number {
  const { winRate, top4Rate } = deriveRates(entry.row);
  switch (key) {
    case "place":
      return entry.row.avg_placement;
    case "win":
      return winRate;
    case "top4":
      return top4Rate;
    case "pick":
      return entry.pickRate;
    case "games":
      return entry.row.games_count;
  }
}

export function ItemsTable({
  rows,
  itemMetaById,
  onDrill,
  atMaxDepth,
}: {
  rows: DrillRow<StatRow>[];
  itemMetaById: Record<string, ItemMeta>;
  onDrill: (addItems: string[]) => void;
  atMaxDepth: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("place");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

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

  if (atMaxDepth) {
    return (
      <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center text-base text-text-mute">
        This is a complete 3-item build — nothing further to drill into.
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center text-base text-text-mute">
        No item data for this filter yet.
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
            Item
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
        {sorted.map((entry, idx) => {
          const { row, addItems, pickRate } = entry;
          const { winRate, top4Rate } = deriveRates(row);
          const addedName = addItems
            .map((id) => itemMetaById[id]?.name ?? id)
            .join(" + ");
          return (
            <tr
              key={idx}
              onClick={() => onDrill(addItems)}
              className="cursor-pointer hover:bg-panel-raised"
            >
              <td className="border-b border-hairline px-3 py-2.5 font-mono text-text-mute">
                {idx + 1}
              </td>
              <td className="border-b border-hairline px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <HexSlot
                    size={36}
                    borderColor={CYAN}
                    fillColor="#1B2A22"
                    iconUrl={itemMetaById[addItems[0]]?.iconUrl}
                    label={addedName.slice(0, 3).toUpperCase()}
                    alt={addedName}
                  />
                  <span>
                    {addedName}
                    <span className="ml-2 text-xs text-text-mute">
                      click to drill in →
                    </span>
                  </span>
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
                  <span className="font-mono">{pickRate.toFixed(1)}%</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-hairline">
                    <div
                      className="h-full bg-cyan"
                      style={{ width: `${Math.min(100, pickRate)}%` }}
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
