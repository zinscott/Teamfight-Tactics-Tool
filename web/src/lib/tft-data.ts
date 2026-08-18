import "server-only";

const CDRAGON_DATA_URL =
  "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json";
const CDRAGON_ASSET_BASE = "https://raw.communitydragon.org/latest/game/";

export type UnitMeta = {
  name: string;
  cost: number;
  traits: string[];
  iconUrl: string | null;
};

export type ItemMeta = {
  name: string;
  iconUrl: string | null;
};

type CDragonChampion = {
  apiName: string;
  name: string;
  cost: number;
  traits?: string[];
  squareIcon?: string;
  tileIcon?: string;
};

type CDragonItem = {
  apiName: string;
  name: string;
  icon?: string;
};

type CDragonSet = {
  number: number;
  champions?: CDragonChampion[];
};

type CDragonData = {
  setData?: CDragonSet[];
  items?: CDragonItem[];
};

// CDragon's raw asset paths are uppercase with a .tex/.dds extension;
// the CDN actually serves them lowercase with a .png extension.
function toAssetUrl(path: string | undefined | null): string | null {
  if (!path) return null;
  const withoutExt = path.replace(/\.(tex|dds|png|jpg)$/i, "");
  return `${CDRAGON_ASSET_BASE}${withoutExt.toLowerCase()}.png`;
}

type TftMaps = {
  units: Map<string, UnitMeta>;
  items: Map<string, ItemMeta>;
};

let cachedMaps: Promise<TftMaps> | null = null;

// Champions are nested per-set in CDragon's data, and set "number" isn't a
// reliable way to pick "the current set" (the dataset contains mislabeled/
// stale revisions). Flattening every set's champions into one map (keyed by
// apiName, which already embeds the set prefix, e.g. TFT17_Aatrox) avoids
// needing to identify the current set at all. Items are already a single
// top-level list, no flattening needed.
async function loadMaps(): Promise<TftMaps> {
  if (!cachedMaps) {
    cachedMaps = (async () => {
      // No `next: { revalidate }` here - this response is ~35MB, well over
      // Next's 2MB fetch-cache limit, so that option would just fail
      // silently (or log a warning) without actually caching anything.
      // The module-level `cachedMaps` promise above is what actually caches
      // this for the lifetime of the server process.
      const res = await fetch(CDRAGON_DATA_URL, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Community Dragon fetch failed: ${res.status}`);
      }
      const data: CDragonData = await res.json();

      const units = new Map<string, UnitMeta>();
      for (const set of data.setData ?? []) {
        for (const champ of set.champions ?? []) {
          units.set(champ.apiName.toLowerCase(), {
            name: champ.name,
            cost: champ.cost,
            traits: champ.traits ?? [],
            iconUrl: toAssetUrl(champ.tileIcon ?? champ.squareIcon),
          });
        }
      }

      const items = new Map<string, ItemMeta>();
      for (const item of data.items ?? []) {
        items.set(item.apiName.toLowerCase(), {
          name: item.name,
          iconUrl: toAssetUrl(item.icon),
        });
      }

      return { units, items };
    })();
  }
  return cachedMaps;
}

export async function getUnitMeta(characterId: string): Promise<UnitMeta> {
  const { units } = await loadMaps();
  return (
    units.get(characterId.toLowerCase()) ?? {
      name: characterId,
      cost: 1,
      traits: [],
      iconUrl: null,
    }
  );
}

export async function getItemMeta(itemName: string): Promise<ItemMeta> {
  const { items } = await loadMaps();
  return (
    items.get(itemName.toLowerCase()) ?? {
      name: itemName,
      iconUrl: null,
    }
  );
}

export async function getUnitMetaMap(): Promise<Map<string, UnitMeta>> {
  return (await loadMaps()).units;
}

export async function getItemMetaMap(): Promise<Map<string, ItemMeta>> {
  return (await loadMaps()).items;
}
