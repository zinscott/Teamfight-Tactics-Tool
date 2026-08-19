// Pure data-shape/filter logic shared between the server (initial fetch) and
// the client explorer component (chip-driven re-filtering of already-fetched
// rows). No Supabase or CDragon imports here on purpose - keeps this usable
// from a client component.

export type StatRow = {
  games_count: number;
  wins_count: number;
  top4_count: number;
  avg_placement: number;
};

export type UnitStatRow = StatRow & { character_id: string };
export type ItemStatRow = StatRow & { character_id: string; item_name: string };
export type ItemPairStatRow = StatRow & {
  character_id: string;
  item_a: string;
  item_b: string;
};
export type FullBuildStatRow = StatRow & {
  character_id: string;
  item_a: string;
  item_b: string;
  item_c: string;
};

export type UnitBundle = {
  unit: UnitStatRow | null;
  items: ItemStatRow[];
  pairs: ItemPairStatRow[];
  builds: FullBuildStatRow[];
};

// Rows below this many games are excluded from "best X" rankings - too
// noisy to trust as a real signal. User-selectable, one of these presets.
export const MIN_GAMES_OPTIONS = [50, 100, 300, 500] as const;
export const DEFAULT_MIN_GAMES: number = MIN_GAMES_OPTIONS[0];

export function deriveRates(row: StatRow) {
  if (row.games_count === 0) {
    return { winRate: 0, top4Rate: 0 };
  }
  return {
    winRate: (row.wins_count / row.games_count) * 100,
    top4Rate: (row.top4_count / row.games_count) * 100,
  };
}

function byAvgPlacementAsc(a: StatRow, b: StatRow) {
  return a.avg_placement - b.avg_placement;
}

function sortPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a];
}

function multisetCounts(items: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of items) m.set(item, (m.get(item) ?? 0) + 1);
  return m;
}

// Does `have` contain at least every item in `need`, counting duplicates?
// e.g. have=[A,A,B] need=[A,A] -> true, have=[A,B] need=[A,A] -> false.
function containsMultiset(have: string[], need: string[]): boolean {
  const haveCounts = multisetCounts(have);
  const needCounts = multisetCounts(need);
  for (const [item, count] of needCounts) {
    if ((haveCounts.get(item) ?? 0) < count) return false;
  }
  return true;
}

function subtractMultiset(have: string[], take: string[]): string[] {
  const remaining = [...have];
  for (const item of take) {
    const idx = remaining.indexOf(item);
    if (idx > -1) remaining.splice(idx, 1);
  }
  return remaining;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

// A row the Items tab can offer to drill into: "click this to add these
// items to the filter". addItems is always length 1 in the current schema
// (max filter depth is 3), but kept general.
export type DrillRow<T extends StatRow> = {
  row: T;
  addItems: string[];
};

export function getHeaderRow(
  filterItems: string[],
  bundle: UnitBundle,
): StatRow | null {
  if (filterItems.length === 0) return bundle.unit;

  if (filterItems.length === 1) {
    const [a] = filterItems;
    return bundle.items.find((r) => r.item_name === a) ?? null;
  }

  if (filterItems.length === 2) {
    const [sa, sb] = sortPair(filterItems[0], filterItems[1]);
    return (
      bundle.pairs.find((r) => r.item_a === sa && r.item_b === sb) ?? null
    );
  }

  const sorted = [...filterItems].sort();
  return (
    bundle.builds.find((r) =>
      arraysEqual([r.item_a, r.item_b, r.item_c].sort(), sorted),
    ) ?? null
  );
}

export function getItemsTabRows(
  filterItems: string[],
  bundle: UnitBundle,
  minGames: number = DEFAULT_MIN_GAMES,
): DrillRow<StatRow>[] {
  if (filterItems.length === 0) {
    return bundle.items
      .filter((r) => r.games_count >= minGames)
      .sort(byAvgPlacementAsc)
      .map((row) => ({ row, addItems: [row.item_name] }));
  }

  if (filterItems.length === 1) {
    const [a] = filterItems;
    return bundle.pairs
      .filter((r) => (r.item_a === a || r.item_b === a) && r.games_count >= minGames)
      .sort(byAvgPlacementAsc)
      .map((row) => ({
        row,
        addItems: [row.item_a === a ? row.item_b : row.item_a],
      }));
  }

  if (filterItems.length === 2) {
    return bundle.builds
      .filter(
        (r) =>
          containsMultiset([r.item_a, r.item_b, r.item_c], filterItems) &&
          r.games_count >= minGames,
      )
      .sort(byAvgPlacementAsc)
      .map((row) => ({
        row,
        addItems: subtractMultiset([row.item_a, row.item_b, row.item_c], filterItems),
      }));
  }

  // depth 3: max filter depth, nothing further to drill into
  return [];
}

export function getBuildsTabRows(
  filterItems: string[],
  bundle: UnitBundle,
  minGames: number = DEFAULT_MIN_GAMES,
): FullBuildStatRow[] {
  if (filterItems.length === 3) {
    const sorted = [...filterItems].sort();
    return bundle.builds.filter((r) =>
      arraysEqual([r.item_a, r.item_b, r.item_c].sort(), sorted),
    );
  }

  return bundle.builds
    .filter(
      (r) =>
        containsMultiset([r.item_a, r.item_b, r.item_c], filterItems) &&
        r.games_count >= minGames,
    )
    .sort(byAvgPlacementAsc);
}
