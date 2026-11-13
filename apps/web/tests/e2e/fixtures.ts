import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "@krudex/core/db-types";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { open } from "./helpers";

/** Reads apps/web/.env.local so specs can seed the local Supabase stack directly. */
function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  const file = readFileSync(join(__dirname, "../../.env.local"), "utf8");
  const line = file.split("\n").find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing from .env.local`);
  return line.slice(name.length + 1).trim();
}

export const url = () => env("NEXT_PUBLIC_SUPABASE_URL");
export const admin = () =>
  createClient<Database>(url(), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

export type Owner = { email: string; password: string; outletId: string; tenantId: string };

/** A fresh owner with one outlet, created through the same RPC the onboarding form uses. */
export async function createOwner(tag: string, mode: "dine_in" | "canteen" = "dine_in"): Promise<Owner> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `owner-${tag}-${stamp}@example.com`;
  const password = "correct-horse-battery";
  const { error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = createClient<Database>(url(), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  const { data: outletId, error: rpcError } = await client.rpc("onboard_tenant", {
    p_tenant_name: `Cafe ${tag} ${stamp}`,
    p_slug: `cafe-${tag}-${stamp}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
    p_outlet_name: "Main",
    p_mode: mode,
    p_display_name: "Test Owner",
  });
  if (rpcError) throw rpcError;
  const { data: outlet } = await admin().from("outlets").select("tenant_id").eq("id", outletId).single();
  return { email, password, outletId, tenantId: outlet!.tenant_id };
}

export async function login(page: Page, owner: Owner, next = "/app") {
  await open(page, `/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password").fill(owner.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, "\\/")}$`));
  await page.waitForLoadState("networkidle");
}

/** Seeds a small menu directly (for specs that are not about menu editing). */
export async function seedMenu(owner: Owner) {
  const db = admin();
  const { data: cat } = await db
    .from("menu_categories")
    .insert({ tenant_id: owner.tenantId, outlet_id: owner.outletId, name: "Mains", sort_order: 0 })
    .select("id")
    .single();
  const base = { tenant_id: owner.tenantId, outlet_id: owner.outletId, category_id: cat!.id };
  const { data: items, error } = await db
    .from("menu_items")
    .insert([
      { ...base, name: "Masala Dosa", price: 12000, is_veg: true, sort_order: 0, prep_station: "Tawa", tax_rate_bps: null, available: true },
      { ...base, name: "Chicken Biryani", price: 28000, is_veg: false, sort_order: 1, prep_station: null, tax_rate_bps: 500, available: true },
      { ...base, name: "Paneer Tikka", price: 22000, is_veg: true, sort_order: 2, prep_station: null, tax_rate_bps: null, available: false },
    ])
    .select("id, name");
  if (error) throw error;
  const dosa = items!.find((i) => i.name === "Masala Dosa")!;
  await db.from("item_variants").insert([
    { tenant_id: owner.tenantId, item_id: dosa.id, name: "Regular", price_delta: 0, is_default: true, sort_order: 0 },
    { tenant_id: owner.tenantId, item_id: dosa.id, name: "Family", price_delta: 8000, is_default: false, sort_order: 1 },
  ]);
  const { data: group } = await db
    .from("addon_groups")
    .insert({ tenant_id: owner.tenantId, item_id: dosa.id, name: "Extras", min_select: 0, max_select: 2, sort_order: 0 })
    .select("id")
    .single();
  await db.from("addons").insert([
    { tenant_id: owner.tenantId, group_id: group!.id, name: "Extra chutney", price: 1000, sort_order: 0 },
    { tenant_id: owner.tenantId, group_id: group!.id, name: "Ghee", price: 2000, sort_order: 1 },
  ]);
  return { categoryId: cat!.id, items: items! };
}
