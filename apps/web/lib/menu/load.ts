import "server-only";
import type { MenuCategory, MenuItem } from "@/components/menu/types";
import { createClient } from "@/lib/supabase/server";

/** Staff view of an outlet's full menu, via RLS. */
export async function loadStaffMenu(outletId: string): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  const supabase = await createClient();
  const [cats, items] = await Promise.all([
    supabase.from("menu_categories").select("id, name, active, sort_order").eq("outlet_id", outletId).order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, category_id, name, description, price, image_path, is_veg, dietary_tags, available, sort_order, tax_rate_bps, prep_station, item_variants(id, name, price_delta, is_default, sort_order), addon_groups(id, name, min_select, max_select, sort_order, addons(id, name, price, available, sort_order))",
      )
      .eq("outlet_id", outletId)
      .order("sort_order"),
  ]);
  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  return {
    categories: cats.data ?? [],
    items: (items.data ?? []).map(({ item_variants, addon_groups, ...i }) => ({
      ...i,
      variants: [...item_variants].sort(bySort),
      addon_groups: [...addon_groups].sort(bySort).map((g) => ({ ...g, addons: [...g.addons].sort(bySort) })),
    })),
  };
}
