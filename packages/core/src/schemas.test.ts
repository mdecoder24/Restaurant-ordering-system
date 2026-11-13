import { describe, expect, it } from "vitest";
import {
  addonGroupInputSchema,
  menuItemInputSchema,
  onboardingSchema,
  placeOrderSchema,
  slugSchema,
  staffInputSchema,
} from "./schemas";

const cat = "5d9c2f6e-8a51-4b0e-9a0e-5d0f1f2a3b4c";

describe("schemas", () => {
  it("normalises slugs and rejects bad ones", () => {
    expect(slugSchema.parse("  Spice-Route ")).toBe("spice-route");
    expect(slugSchema.safeParse("a--b").success).toBe(false);
  });

  it("accepts onboarding without a GSTIN and uppercases one", () => {
    const base = { businessName: "Spice Route", slug: "spice-route", outletName: "MG Road", mode: "dine_in", displayName: "Asha" };
    expect(onboardingSchema.parse({ ...base, gstin: "" }).gstin).toBeUndefined();
    expect(onboardingSchema.parse({ ...base, gstin: "29abcde1234f1z5" }).gstin).toBe("29ABCDE1234F1Z5");
  });

  it("enforces add-on group rules", () => {
    const addons = [{ name: "Cheese", price: 3000 }];
    expect(addonGroupInputSchema.safeParse({ name: "Extras", min_select: 2, max_select: 1, addons }).success).toBe(false);
    expect(addonGroupInputSchema.safeParse({ name: "Extras", min_select: 2, max_select: 3, addons }).success).toBe(false);
    expect(addonGroupInputSchema.safeParse({ name: "Extras", min_select: 0, max_select: 1, addons }).success).toBe(true);
  });

  it("requires exactly one default variant when variants exist", () => {
    const item = {
      category_id: cat, name: "Dosa", price: 9000, is_veg: true, dietary_tags: [], available: true,
      tax_rate_bps: null, addon_groups: [],
    };
    expect(menuItemInputSchema.safeParse({ ...item, variants: [] }).success).toBe(true);
    expect(menuItemInputSchema.safeParse({ ...item, variants: [{ name: "Half", price_delta: 0, is_default: false }] }).success).toBe(false);
    expect(menuItemInputSchema.safeParse({ ...item, variants: [{ name: "Half", price_delta: 0, is_default: true }] }).success).toBe(true);
  });

  it("requires an email or a PIN for staff", () => {
    const s = { display_name: "Ravi", role: "waiter", outlet_id: null };
    expect(staffInputSchema.safeParse({ ...s, email: "", pin: "" }).success).toBe(false);
    expect(staffInputSchema.safeParse({ ...s, pin: "1234" }).success).toBe(true);
    expect(staffInputSchema.safeParse({ ...s, role: "owner", pin: "1234" }).success).toBe(false);
  });

  it("never accepts a client price on order lines", () => {
    const parsed = placeOrderSchema.parse({ lines: [{ item_id: cat, variant_id: null, addon_ids: [], qty: 1, price: 1 }] });
    expect(parsed.lines[0]).not.toHaveProperty("price");
  });
});
