import "server-only";
import { computeBill, unitPrice, type Bill } from "@krudex/core/bill";
import type { CartLine } from "@krudex/core/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GuestOutlet } from "./context";

export type PricedLine = {
  item_id: string;
  name: string;
  variant: { id: string; name: string; price_delta: number } | null;
  addons: { id: string; name: string; price: number }[];
  unit_price: number;
  qty: number;
  tax_rate_bps: number;
  line_total: number;
  note: string | null;
  prep_station: string | null;
};

export type PricingError = { code: "item_unavailable" | "invalid_options"; message: string; itemId?: string };

/**
 * Re-prices a guest cart from the database (AGENTS.md rule 2: never trust client prices).
 * Rejects sold-out items, foreign variants/add-ons and add-on selections outside min/max.
 */
export async function priceCart(outlet: GuestOutlet, lines: CartLine[]): Promise<{ ok: true; lines: PricedLine[]; bill: Bill } | { ok: false; error: PricingError }> {
  const admin = createAdminClient();
  const ids = [...new Set(lines.map((l) => l.item_id))];
  const { data: items } = await admin
    .from("menu_items")
    .select("id, name, price, available, tax_rate_bps, prep_station, outlet_id, menu_categories(active), item_variants(id, name, price_delta), addon_groups(id, name, min_select, max_select, addons(id, name, price, available))")
    .in("id", ids)
    .eq("outlet_id", outlet.id);
  const byId = new Map((items ?? []).map((i) => [i.id, i]));

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const item = byId.get(line.item_id);
    if (!item || !item.menu_categories?.active) {
      return { ok: false, error: { code: "item_unavailable", message: "An item in your cart is no longer on the menu. Remove it to continue.", itemId: line.item_id } };
    }
    if (!item.available) {
      return { ok: false, error: { code: "item_unavailable", message: `${item.name} just sold out. Remove it to continue.`, itemId: item.id } };
    }
    let variant: PricedLine["variant"] = null;
    if (item.item_variants.length) {
      const v = item.item_variants.find((x) => x.id === line.variant_id);
      if (!v) return { ok: false, error: { code: "invalid_options", message: `Choose a size for ${item.name}.`, itemId: item.id } };
      variant = { id: v.id, name: v.name, price_delta: v.price_delta };
    } else if (line.variant_id) {
      return { ok: false, error: { code: "invalid_options", message: `${item.name} has no sizes.`, itemId: item.id } };
    }

    const chosen = new Set(line.addon_ids);
    const addons: PricedLine["addons"] = [];
    for (const g of item.addon_groups) {
      const picked = g.addons.filter((a) => chosen.has(a.id));
      if (picked.some((a) => !a.available)) {
        return { ok: false, error: { code: "item_unavailable", message: `An add-on for ${item.name} just sold out.`, itemId: item.id } };
      }
      if (picked.length < g.min_select || picked.length > g.max_select) {
        return { ok: false, error: { code: "invalid_options", message: `Check the “${g.name}” choices for ${item.name}.`, itemId: item.id } };
      }
      for (const a of picked) {
        addons.push({ id: a.id, name: a.name, price: a.price });
        chosen.delete(a.id);
      }
    }
    if (chosen.size) return { ok: false, error: { code: "invalid_options", message: `Some options for ${item.name} aren’t available.`, itemId: item.id } };

    const unit = unitPrice(item.price, variant?.price_delta ?? 0, addons.map((a) => a.price));
    priced.push({
      item_id: item.id,
      name: item.name,
      variant,
      addons,
      unit_price: unit,
      qty: line.qty,
      tax_rate_bps: item.tax_rate_bps ?? outlet.taxConfig.default_rate_bps,
      line_total: 0,
      note: line.note ?? null,
      prep_station: item.prep_station,
    });
  }

  const bill = computeBill(
    priced.map((p) => ({ unitPrice: p.unit_price, qty: p.qty, taxRateBps: p.tax_rate_bps })),
    {
      defaultTaxRateBps: outlet.taxConfig.default_rate_bps,
      pricesIncludeTax: outlet.taxConfig.prices_include_tax,
      serviceChargeBps: outlet.serviceChargeBps,
    },
  );
  bill.lines.forEach((l, i) => (priced[i]!.line_total = l.gross));
  return { ok: true, lines: priced, bill };
}
