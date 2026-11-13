"use server";

import {
  availabilitySchema,
  categoryInputSchema,
  menuItemInputSchema,
  reorderSchema,
  uuid,
  type MenuItemInput,
} from "@krudex/core/schemas";
import { refresh, updateTag } from "next/cache";
import { actionStaff, invalid, isResult, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const editors = ["owner", "manager"] as const;
const menuTag = (outletId: string) => `menu:${outletId}`;

function done(outletId: string) {
  updateTag(menuTag(outletId));
  refresh();
}

export async function createCategory(name: string): Promise<ActionResult<{ id: string }>> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = categoryInputSchema.safeParse({ name });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("outlet_id", staff.outlet.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("menu_categories")
    .insert({ tenant_id: staff.outlet.tenantId, outlet_id: staff.outlet.id, name: parsed.data.name, sort_order: (last?.sort_order ?? -1) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Couldn’t add the category. Try again." };
  done(staff.outlet.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateCategory(id: string, input: { name: string; active: boolean }): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(id).success) return { ok: false, error: "Check the category name." };
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("menu_categories")
    .update(parsed.data, { count: "exact" })
    .eq("id", id)
    .eq("outlet_id", staff.outlet.id);
  if (error || !count) return { ok: false, error: "Couldn’t save the category." };
  done(staff.outlet.id);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown category." };
  const supabase = await createClient();
  const { count: items } = await supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (items) return { ok: false, error: "Move or delete the items in this category first." };
  const { error } = await supabase.from("menu_categories").delete().eq("id", id).eq("outlet_id", staff.outlet.id);
  if (error) return { ok: false, error: "Couldn’t delete the category." };
  done(staff.outlet.id);
  return { ok: true };
}

async function reorder(table: "menu_categories" | "menu_items", ids: string[]): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = reorderSchema.safeParse({ ids });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.ids.map((rowId, i) => supabase.from(table).update({ sort_order: i }).eq("id", rowId).eq("outlet_id", staff.outlet.id)),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Couldn’t save the new order." };
  done(staff.outlet.id);
  return { ok: true };
}

export async function reorderCategories(ids: string[]) {
  return reorder("menu_categories", ids);
}

export async function reorderItems(ids: string[]) {
  return reorder("menu_items", ids);
}

/** Waiters may toggle availability (Architecture §4); enforced again in SQL. */
export async function setAvailability(ids: string[], available: boolean): Promise<ActionResult<{ changed: number }>> {
  const staff = await actionStaff(["owner", "manager", "waiter"]);
  if (isResult(staff)) return staff;
  const parsed = availabilitySchema.safeParse({ ids, available });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_items_availability", { item_ids: parsed.data.ids, is_available: parsed.data.available });
  if (error) return { ok: false, error: "Couldn’t update availability." };
  done(staff.outlet.id);
  return { ok: true, data: { changed: data ?? 0 } };
}

export async function saveItem(id: string | null, input: MenuItemInput): Promise<ActionResult<{ id: string }>> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = menuItemInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (id && !uuid.safeParse(id).success) return { ok: false, error: "Unknown item." };
  const { variants, addon_groups, ...fields } = parsed.data;
  const supabase = await createClient();
  const tenant_id = staff.outlet.tenantId;
  const outlet_id = staff.outlet.id;

  // Image paths must live under this tenant's outlet folder.
  if (fields.image_path && !fields.image_path.startsWith(`${tenant_id}/${outlet_id}/`)) {
    return { ok: false, error: "That image belongs to another outlet." };
  }

  let itemId = id;
  if (itemId) {
    const { error, count } = await supabase
      .from("menu_items")
      .update({ ...fields, description: fields.description || null, prep_station: fields.prep_station || null }, { count: "exact" })
      .eq("id", itemId)
      .eq("outlet_id", outlet_id);
    if (error || !count) return { ok: false, error: "Couldn’t save the item." };
  } else {
    const { data: last } = await supabase
      .from("menu_items")
      .select("sort_order")
      .eq("category_id", fields.category_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        ...fields,
        description: fields.description || null,
        prep_station: fields.prep_station || null,
        tenant_id,
        outlet_id,
        sort_order: (last?.sort_order ?? -1) + 1,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Couldn’t add the item. Check the category still exists." };
    itemId = data.id;
  }

  // Variants: replace the set. Order history keeps snapshots, so ids need not be stable.
  await supabase.from("item_variants").delete().eq("item_id", itemId);
  if (variants.length) {
    const { error } = await supabase.from("item_variants").insert(
      variants.map((v, i) => ({ tenant_id, item_id: itemId, name: v.name, price_delta: v.price_delta, is_default: v.is_default, sort_order: i })),
    );
    if (error) return { ok: false, error: "Couldn’t save the variants." };
  }

  await supabase.from("addon_groups").delete().eq("item_id", itemId);
  for (const [gi, g] of addon_groups.entries()) {
    const { data: group, error } = await supabase
      .from("addon_groups")
      .insert({ tenant_id, item_id: itemId, name: g.name, min_select: g.min_select, max_select: g.max_select, sort_order: gi })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Couldn’t save the add-on groups." };
    const { error: addonError } = await supabase.from("addons").insert(
      g.addons.map((a, ai) => ({ tenant_id, group_id: group.id, name: a.name, price: a.price, available: a.available, sort_order: ai })),
    );
    if (addonError) return { ok: false, error: "Couldn’t save the add-ons." };
  }

  done(outlet_id);
  return { ok: true, data: { id: itemId } };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown item." };
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id).eq("outlet_id", staff.outlet.id);
  if (error) return { ok: false, error: "Couldn’t delete the item." };
  done(staff.outlet.id);
  return { ok: true };
}
