import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuestMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imagePath: string | null;
  isVeg: boolean;
  tags: string[];
  available: boolean;
  taxRateBps: number | null;
  variants: { id: string; name: string; priceDelta: number; isDefault: boolean }[];
  addonGroups: { id: string; name: string; min: number; max: number; addons: { id: string; name: string; price: number }[] }[];
};
export type GuestMenu = { categories: { id: string; name: string }[]; items: GuestMenuItem[] };

/**
 * Public menu for an outlet, cached per outlet and invalidated by any menu write
 * (Architecture §13, tag "menu:<outletId>"). Sold-out items stay listed (G-12).
 */
export async function getGuestMenu(outletId: string): Promise<GuestMenu> {
  "use cache";
  cacheTag(`menu:${outletId}`);
  cacheLife("hours");

  const admin = createAdminClient();
  const [cats, items] = await Promise.all([
    admin.from("menu_categories").select("id, name, sort_order").eq("outlet_id", outletId).eq("active", true).order("sort_order"),
    admin
      .from("menu_items")
      .select(
        "id, category_id, name, description, price, image_path, is_veg, dietary_tags, available, sort_order, tax_rate_bps, item_variants(id, name, price_delta, is_default, sort_order), addon_groups(id, name, min_select, max_select, sort_order, addons(id, name, price, available, sort_order))",
      )
      .eq("outlet_id", outletId)
      .order("sort_order"),
  ]);
  const activeCats = new Set((cats.data ?? []).map((c) => c.id));
  const bySort = <T extends { sort_order: number }>(a: T, b: T) => a.sort_order - b.sort_order;
  return {
    categories: (cats.data ?? []).map((c) => ({ id: c.id, name: c.name })),
    items: (items.data ?? [])
      .filter((i) => activeCats.has(i.category_id))
      .map((i) => ({
        id: i.id,
        categoryId: i.category_id,
        name: i.name,
        description: i.description,
        price: i.price,
        imagePath: i.image_path,
        isVeg: i.is_veg,
        tags: i.dietary_tags,
        available: i.available,
        taxRateBps: i.tax_rate_bps,
        variants: [...i.item_variants].sort(bySort).map((v) => ({ id: v.id, name: v.name, priceDelta: v.price_delta, isDefault: v.is_default })),
        addonGroups: [...i.addon_groups].sort(bySort).map((g) => ({
          id: g.id,
          name: g.name,
          min: g.min_select,
          max: g.max_select,
          addons: [...g.addons].filter((a) => a.available).sort(bySort).map((a) => ({ id: a.id, name: a.name, price: a.price })),
        })),
      })),
  };
}
