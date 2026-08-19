import { deriveRates, StatRow } from "@/lib/stats";

export function StatHeader({ row }: { row: StatRow | null }) {
  if (!row) {
    return (
      <div className="rounded-lg border border-dashed border-hairline-strong p-8 text-center text-lg text-text-mute">
        No data for this exact combination yet.
      </div>
    );
  }

  const { winRate, top4Rate } = deriveRates(row);

  const cells: { label: string; value: string; accent?: boolean }[] = [
    { label: "Avg place", value: row.avg_placement.toFixed(2) },
    { label: "Win %", value: `${winRate.toFixed(1)}%`, accent: true },
    { label: "Top 4 %", value: `${top4Rate.toFixed(1)}%` },
    { label: "Games", value: row.games_count.toLocaleString() },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-panel px-5 py-4">
          <div className="mb-1.5 text-base uppercase tracking-wide text-text-mute">
            {cell.label}
          </div>
          <div
            className="font-mono text-3xl font-medium"
            style={{ color: cell.accent ? "#0AC8B9" : undefined }}
          >
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
