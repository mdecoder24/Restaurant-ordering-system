import { z } from "zod";
import { orderStatuses } from "./order-status";

/** Zod schemas for every API boundary (AGENTS.md §4). Money fields are integer paise. */

const name = (max: number) => z.string().trim().min(1, "Required").max(max);
const paise = z.number().int().min(0).max(10_000_000_00);
const bps = (max: number) => z.number().int().min(0).max(max);
export const uuid = z.uuid();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens");

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z0-9]{13}$/, "15 characters, starting with the 2-digit state code");

export const outletModeSchema = z.enum(["dine_in", "canteen"]);
export const memberRoleSchema = z.enum(["owner", "manager", "waiter", "kitchen"]);

export const onboardingSchema = z.object({
  businessName: name(120),
  slug: slugSchema,
  gstin: gstinSchema.optional().or(z.literal("").transform(() => undefined)),
  outletName: name(120),
  mode: outletModeSchema,
  displayName: name(80),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const openHoursSchema = z.partialRecord(
  z.enum(weekdays),
  z.object({ open: hhmm, close: hhmm }).nullable(),
);
export type OpenHours = z.infer<typeof openHoursSchema>;

export const taxConfigSchema = z.object({
  default_rate_bps: bps(2800),
  prices_include_tax: z.boolean(),
});
export const paymentOptionsSchema = z.object({
  online: z.boolean(),
  cash: z.boolean(),
  prepaid_only: z.boolean(),
});

export const outletSettingsSchema = z.object({
  name: name(120),
  mode: outletModeSchema,
  address: z.string().trim().max(300).optional().nullable(),
  timezone: z.string().min(1).max(60),
  open_hours: openHoursSchema,
  tax_config: taxConfigSchema,
  service_charge_bps: bps(2000),
  payment_options: paymentOptionsSchema,
  auto_accept: z.boolean(),
  ticket_warn_minutes: z.number().int().min(1).max(120),
  ticket_overdue_minutes: z.number().int().min(1).max(240),
});
export type OutletSettings = z.infer<typeof outletSettingsSchema>;

export const categoryInputSchema = z.object({ name: name(60), active: z.boolean().default(true) });

export const dietaryTags = ["veg", "vegan", "jain", "gluten_free", "spicy"] as const;
export const dietaryTagSchema = z.enum(dietaryTags);

export const variantInputSchema = z.object({
  id: uuid.optional(),
  name: name(40),
  price_delta: z.number().int().min(-10_000_000).max(10_000_000),
  is_default: z.boolean(),
});

export const addonInputSchema = z.object({
  id: uuid.optional(),
  name: name(60),
  price: paise,
  available: z.boolean().default(true),
});

export const addonGroupInputSchema = z
  .object({
    id: uuid.optional(),
    name: name(60),
    min_select: z.number().int().min(0).max(20),
    max_select: z.number().int().min(1).max(20),
    addons: z.array(addonInputSchema).min(1).max(30),
  })
  .refine((g) => g.min_select <= g.max_select, { message: "Min cannot exceed max", path: ["min_select"] })
  .refine((g) => g.min_select <= g.addons.length, { message: "Not enough add-ons to meet the minimum", path: ["min_select"] });

export const menuItemInputSchema = z
  .object({
    category_id: uuid,
    name: name(80),
    description: z.string().trim().max(500).optional().nullable(),
    price: paise,
    is_veg: z.boolean(),
    dietary_tags: z.array(dietaryTagSchema).max(dietaryTags.length),
    available: z.boolean(),
    tax_rate_bps: bps(2800).nullable(),
    prep_station: z.string().trim().max(40).optional().nullable(),
    image_path: z.string().max(300).optional().nullable(),
    variants: z.array(variantInputSchema).max(10),
    addon_groups: z.array(addonGroupInputSchema).max(10),
  })
  .refine((i) => i.variants.length === 0 || i.variants.filter((v) => v.is_default).length === 1, {
    message: "Pick exactly one default variant",
    path: ["variants"],
  });
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export const reorderSchema = z.object({ ids: z.array(uuid).min(1).max(500) });
export const availabilitySchema = z.object({ ids: z.array(uuid).min(1).max(500), available: z.boolean() });

export const tableInputSchema = z.object({ label: name(40), seats: z.number().int().min(1).max(50), active: z.boolean().default(true) });

export const staffInputSchema = z
  .object({
    display_name: name(80),
    role: memberRoleSchema.exclude(["owner"]),
    outlet_id: uuid.nullable(),
    email: z.email().optional().or(z.literal("").transform(() => undefined)),
    pin: z.string().regex(/^\d{4,6}$/, "4 to 6 digits").optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((s) => s.email || s.pin, { message: "Give an email invite, a PIN, or both", path: ["pin"] });

export const pinLoginSchema = z.object({ outletId: uuid, pin: z.string().regex(/^\d{4,6}$/) });

/** One cart line as sent by the guest. Prices are never accepted from the client. */
export const cartLineSchema = z.object({
  item_id: uuid,
  variant_id: uuid.nullable(),
  addon_ids: z.array(uuid).max(30),
  qty: z.number().int().min(1).max(50),
  note: z.string().trim().max(200).optional().nullable(),
});
export type CartLine = z.infer<typeof cartLineSchema>;

export const placeOrderSchema = z.object({
  lines: z.array(cartLineSchema).min(1).max(50),
  note: z.string().trim().max(300).optional().nullable(),
});

export const statusChangeSchema = z.object({
  to: z.enum(orderStatuses),
  reason: z.string().trim().max(200).optional().nullable(),
});

export const serviceRequestSchema = z.object({ type: z.enum(["call_waiter", "request_bill"]) });

export const cashPaymentSchema = z.object({ session_id: uuid, amount: paise.min(1) });
