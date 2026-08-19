import { MIN_GAMES_OPTIONS } from "@/lib/stats";

export function GamesFilter({
  value,
  onChange,
}: {
  value: number;
  onChange: (minGames: number) => void;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <span className="text-sm uppercase tracking-wide text-text-mute">
        Min games
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-hairline-strong bg-panel px-3 py-1.5 text-sm font-medium text-gold focus:outline-none"
      >
        {MIN_GAMES_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}+
          </option>
        ))}
      </select>
    </label>
  );
}
