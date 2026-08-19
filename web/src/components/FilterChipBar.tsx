import { HexSlot } from "./HexSlot";
import { ItemMeta, UnitMeta } from "@/lib/tft-data";
import { costColor, CYAN } from "@/lib/theme";

const MAX_FILTER_ITEMS = 3;

type FilterChipBarProps = {
  unitMeta: UnitMeta;
  filterItems: string[];
  itemMetaById: Record<string, ItemMeta>;
  onRemove: (index: number) => void;
};

export function FilterChipBar({
  unitMeta,
  filterItems,
  itemMetaById,
  onRemove,
}: FilterChipBarProps) {
  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className="flex min-w-[200px] items-center gap-3 rounded-lg border border-gold-dim bg-panel-raised px-4 py-3">
        <HexSlot
          size={46}
          borderColor={costColor(unitMeta.cost)}
          iconUrl={unitMeta.iconUrl}
          label={unitMeta.name[0]}
          alt={unitMeta.name}
        />
        <div>
          <div className="text-xl font-medium">{unitMeta.name}</div>
          <div className="mt-0.5 text-base text-text-mute">
            {unitMeta.traits.length > 0 ? unitMeta.traits.join(" · ") : "Unmapped unit"}
          </div>
        </div>
      </div>

      {filterItems.map((itemName, idx) => {
        const meta = itemMetaById[itemName];
        const isDupOfPrev = idx > 0 && filterItems[idx - 1] === itemName;
        return (
          <div
            key={`${itemName}-${idx}`}
            className="flex min-w-[200px] items-center gap-3 rounded-lg border border-hairline-strong bg-panel-raised px-4 py-3"
          >
            <HexSlot
              size={46}
              borderColor={CYAN}
              fillColor="#1B2A22"
              iconUrl={meta?.iconUrl}
              label={(meta?.name ?? itemName).slice(0, 3).toUpperCase()}
              alt={meta?.name ?? itemName}
            />
            <div>
              <div className="text-xl font-medium">
                {meta?.name ?? itemName}
              </div>
              <div className="mt-0.5 text-base text-text-mute">
                {idx === 0 ? "On unit" : isDupOfPrev ? "2nd copy" : "And"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              title="Remove filter"
              className="ml-auto px-1.5 text-lg leading-none text-text-mute hover:text-coral"
            >
              ×
            </button>
          </div>
        );
      })}

      {filterItems.length < MAX_FILTER_ITEMS ? (
        <div className="flex min-w-[230px] items-center justify-center rounded-lg border border-dashed border-hairline-strong px-4 py-3 text-center text-base text-text-mute">
          {filterItems.length
            ? "Click an item below to stack another filter"
            : "Click an item below to filter by it"}
        </div>
      ) : (
        <div className="flex min-w-[230px] items-center justify-center rounded-lg border border-dashed border-hairline-strong px-4 py-3 text-center text-base text-text-mute">
          Max build depth (3 items)
        </div>
      )}
    </div>
  );
}
