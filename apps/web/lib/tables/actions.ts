"use server";

import { tableInputSchema, uuid } from "@krudex/core/schemas";
import { refresh } from "next/cache";
import { z } from "zod";
import { actionStaff, invalid, isResult, type ActionResult } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";

const editors = ["owner", "manager"] as const;

const bulkSchema = z.object({
  prefix: z.string().trim().max(20),
  from: z.number().int().min(0).max(999),
  count: z.number().int().min(1).max(100),
  seats: z.number().int().min(1).max(50),
});

/** Adds tables "T1…Tn" in one go; skips labels that already exist. */
export async function addTables(input: z.infer<typeof bulkSchema>): Promise<ActionResult<{ added: number }>> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { prefix, from, count, seats } = parsed.data;
  const supabase = await createClient();
  const { data: existing } = await supabase.from("tables").select("label").eq("outlet_id", staff.outlet.id);
  const taken = new Set((existing ?? []).map((t) => t.label.toLowerCase()));
  const rows = Array.from({ length: count }, (_, i) => `${prefix}${from + i}`)
    .filter((label) => !taken.has(label.toLowerCase()))
    .map((label) => ({ tenant_id: staff.outlet.tenantId, outlet_id: staff.outlet.id, label, seats }));
  if (rows.length === 0) return { ok: false, error: "Those table labels already exist." };
  const { error } = await supabase.from("tables").insert(rows);
  if (error) return { ok: false, error: "Couldn’t add tables. Try again." };
  refresh();
  return { ok: true, data: { added: rows.length } };
}

export async function updateTable(id: string, input: z.input<typeof tableInputSchema>): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const parsed = tableInputSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(id).success) return parsed.success ? { ok: false, error: "Unknown table." } : invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase.from("tables").update(parsed.data, { count: "exact" }).eq("id", id).eq("outlet_id", staff.outlet.id);
  if (error?.code === "23505") return { ok: false, error: "Another table already uses that label.", fieldErrors: { label: "Already used" } };
  if (error || !count) return { ok: false, error: "Couldn’t save the table." };
  refresh();
  return { ok: true };
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown table." };
  const supabase = await createClient();
  const { count: open } = await supabase
    .from("table_sessions")
    .select("id", { count: "exact", head: true })
    .eq("table_id", id)
    .eq("status", "open");
  if (open) return { ok: false, error: "Close the table’s open bill first." };
  const { error } = await supabase.from("tables").delete().eq("id", id).eq("outlet_id", staff.outlet.id);
  if (error) return { ok: false, error: "Couldn’t delete the table." };
  refresh();
  return { ok: true };
}

/** New random token: printed codes for this table stop working immediately (D-05). */
export async function regenerateQr(id: string): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Unknown table." };
  const supabase = await createClient();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Buffer.from(bytes).toString("base64url");
  const { error, count } = await supabase.from("tables").update({ qr_token: token }, { count: "exact" }).eq("id", id).eq("outlet_id", staff.outlet.id);
  if (error || !count) return { ok: false, error: "Couldn’t regenerate the code." };
  refresh();
  return { ok: true };
}

export async function regenerateCounterQr(): Promise<ActionResult> {
  const staff = await actionStaff(editors);
  if (isResult(staff)) return staff;
  const supabase = await createClient();
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
  const { error } = await supabase.from("outlets").update({ counter_qr_token: token }).eq("id", staff.outlet.id);
  if (error) return { ok: false, error: "Couldn’t regenerate the code." };
  refresh();
  return { ok: true };
}
