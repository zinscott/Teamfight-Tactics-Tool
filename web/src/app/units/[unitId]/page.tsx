import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getItemMetaMap, getUnitMeta, ItemMeta } from "@/lib/tft-data";
import { Explorer } from "@/components/Explorer";
import {
  FullBuildStatRow,
  ItemPairStatRow,
  ItemStatRow,
  UnitBundle,
  UnitStatRow,
} from "@/lib/stats";

export const revalidate = 3600;

export default async function UnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  const [unitRes, itemsRes, pairsRes, buildsRes] = await Promise.all([
    supabase
      .from("unit_stats")
      .select("*")
      .eq("character_id", unitId)
      .maybeSingle(),
    supabase.from("item_stats").select("*").eq("character_id", unitId),
    supabase.from("item_pair_stats").select("*").eq("character_id", unitId),
    supabase.from("full_build_stats").select("*").eq("character_id", unitId),
  ]);

  for (const res of [unitRes, itemsRes, pairsRes, buildsRes]) {
    if (res.error) {
      throw new Error(`Supabase select failed: ${res.error.message}`);
    }
  }

  if (!unitRes.data) {
    notFound();
  }

  const bundle: UnitBundle = {
    unit: unitRes.data as UnitStatRow,
    items: (itemsRes.data ?? []) as ItemStatRow[],
    pairs: (pairsRes.data ?? []) as ItemPairStatRow[],
    builds: (buildsRes.data ?? []) as FullBuildStatRow[],
  };

  const unitMeta = await getUnitMeta(unitId);

  const referencedItemIds = new Set<string>();
  for (const r of bundle.items) referencedItemIds.add(r.item_name);
  for (const r of bundle.pairs) {
    referencedItemIds.add(r.item_a);
    referencedItemIds.add(r.item_b);
  }
  for (const r of bundle.builds) {
    referencedItemIds.add(r.item_a);
    referencedItemIds.add(r.item_b);
    referencedItemIds.add(r.item_c);
  }

  const itemMetaMap = await getItemMetaMap();
  const itemMetaById: Record<string, ItemMeta> = {};
  for (const id of referencedItemIds) {
    itemMetaById[id] = itemMetaMap.get(id.toLowerCase()) ?? {
      name: id,
      iconUrl: null,
    };
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link
        href="/"
        className="mb-5 inline-block text-base text-text-mute hover:text-text-soft"
      >
        ← All units
      </Link>
      <Explorer
        unitMeta={unitMeta}
        bundle={bundle}
        itemMetaById={itemMetaById}
      />
    </main>
  );
}
