"use server";

import { gstinSchema, outletModeSchema, outletSettingsSchema, type OutletSettings } from "@krudex/core/schemas";
import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { actionStaff, invalid, isResult, type ActionResult } from "@/lib/actions";
import { OUTLET_COOKIE } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function saveOutletSettings(input: OutletSettings): Promise<ActionResult> {
  const staff = await actionStaff(["owner", "manager"]);
  if (isResult(staff)) return staff;
  const parsed = outletSettingsSchema
    .refine((s) => s.ticket_warn_minutes < s.ticket_overdue_minutes, { message: "Overdue must be later than warning", path: ["ticket_overdue_minutes"] })
    .safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("outlets")
    .update({ ...parsed.data, address: parsed.data.address || null }, { count: "exact" })
    .eq("id", staff.outlet.id);
  if (error || !count) return { ok: false, error: "Couldn’t save settings." };
  updateTag(`menu:${staff.outlet.id}`);
  refresh();
  return { ok: true };
}

const businessSchema = z.object({
  name: z.string().trim().min(1, "Required").max(120),
  gstin: gstinSchema.optional().or(z.literal("").transform(() => undefined)),
});

export async function saveBusiness(input: z.input<typeof businessSchema>): Promise<ActionResult> {
  const staff = await actionStaff(["owner"]);
  if (isResult(staff)) return staff;
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update({ name: parsed.data.name, gstin: parsed.data.gstin ?? null }).eq("id", staff.outlet.tenantId);
  if (error) return { ok: false, error: "Couldn’t save business details." };
  refresh();
  return { ok: true };
}

const newOutlet = z.object({ name: z.string().trim().min(1, "Required").max(120), mode: outletModeSchema });

export async function createOutlet(input: z.infer<typeof newOutlet>): Promise<ActionResult<{ id: string }>> {
  const staff = await actionStaff(["owner"]);
  if (isResult(staff)) return staff;
  const parsed = newOutlet.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("outlets").insert({ tenant_id: staff.outlet.tenantId, ...parsed.data }).select("id").single();
  if (error) return { ok: false, error: "Couldn’t add the outlet." };
  (await cookies()).set(OUTLET_COOKIE, data.id, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  refresh();
  return { ok: true, data: { id: data.id } };
}
