"use client";

import { useMemo, useState } from "react";
import { FilterChipBar } from "./FilterChipBar";
import { StatHeader } from "./StatHeader";
import { Tabs, TabKey } from "./Tabs";
import { ItemsTable } from "./ItemsTable";
import { BuildsTable } from "./BuildsTable";
import { GamesFilter } from "./GamesFilter";
import {
  DEFAULT_MIN_GAMES,
  getBuildsTabRows,
  getHeaderRow,
  getItemsTabRows,
  UnitBundle,
} from "@/lib/stats";
import { ItemMeta, UnitMeta } from "@/lib/tft-data";

const MAX_FILTER_ITEMS = 3;

export function Explorer({
  unitMeta,
  bundle,
  itemMetaById,
}: {
  unitMeta: UnitMeta;
  bundle: UnitBundle;
  itemMetaById: Record<string, ItemMeta>;
}) {
  const [filterItems, setFilterItems] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("items");
  const [minGames, setMinGames] = useState<number>(DEFAULT_MIN_GAMES);

  const headerRow = useMemo(
    () => getHeaderRow(filterItems, bundle),
    [filterItems, bundle],
  );
  const itemsRows = useMemo(
    () => getItemsTabRows(filterItems, bundle, minGames),
    [filterItems, bundle, minGames],
  );
  const buildsRows = useMemo(
    () => getBuildsTabRows(filterItems, bundle, minGames),
    [filterItems, bundle, minGames],
  );

  function handleDrill(addItems: string[]) {
    setFilterItems((prev) => {
      const next = [...prev, ...addItems];
      return next.length > MAX_FILTER_ITEMS ? next.slice(0, MAX_FILTER_ITEMS) : next;
    });
  }

  function handleRemove(index: number) {
    setFilterItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterChipBar
        unitMeta={unitMeta}
        filterItems={filterItems}
        itemMetaById={itemMetaById}
        onRemove={handleRemove}
      />

      <StatHeader row={headerRow} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs active={activeTab} onChange={setActiveTab} />
          <GamesFilter value={minGames} onChange={setMinGames} />
        </div>
        {activeTab === "items" ? (
          <ItemsTable
            rows={itemsRows}
            itemMetaById={itemMetaById}
            onDrill={handleDrill}
            atMaxDepth={filterItems.length >= MAX_FILTER_ITEMS}
          />
        ) : (
          <BuildsTable rows={buildsRows} itemMetaById={itemMetaById} />
        )}
      </div>
    </div>
  );
}
