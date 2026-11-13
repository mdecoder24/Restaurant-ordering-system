"use server";

import { memberRoleSchema, staffInputSchema, uuid } from "@krudex/core/schemas";
import { refresh } from "next/cache";
import { z } from "zod";
import { actionStaff, invalid, isResult, type ActionResult } from "@/lib/actions";
import { createPinUser, hashPin, pinInUse } from "@/lib/auth/staff-users";
import { clientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Invite by email and/or set a PIN (D-08). Owners only (Architecture §4). */
export async function addStaff(input: z.input<typeof staffInputSchema>): Promise<ActionResult> {
  const staff = await actionStaff(["owner"]);
  if (isResult(staff)) return staff;
  const parsed = staffInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { display_name, role, outlet_id, email, pin } = parsed.data;
  if (outlet_id && !staff.outlets.some((o) => o.id === outlet_id)) return { ok: false, error: "Unknown outlet." };
  if (pin && (await pinInUse(staff.outlet.tenantId, outlet_id, pin))) {
    return { ok: false, error: "Another staff member already uses that PIN.", fieldErrors: { pin: "Choose a different PIN" } };
  }

  const admin = createAdminClient();
  let userId: string;
  if (email) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/login` });
    if (error || !data.user) {
      return { ok: false, error: error?.message.includes("already") ? "That email already has an account. Ask them to use a different email for now." : "Couldn’t send the invite." };
    }
    userId = data.user.id;
  } else {
    userId = await createPinUser(crypto.randomUUID());
  }

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    tenant_id: staff.outlet.tenantId,
    user_id: userId,
    display_name,
    role,
    outlet_id,
    pin_hash: pin ? await hashPin(pin) : null,
  });
  if (error) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: "Couldn’t add the staff member." };
  }
  refresh();
  return { ok: true };
}

const updateSchema = z.object({
  role: memberRoleSchema.exclude(["owner"]),
  outlet_id: uuid.nullable(),
  active: z.boolean(),
  pin: z.string().regex(/^\d{4,6}$/, "4 to 6 digits").optional().or(z.literal("").transform(() => undefined)),
});

export async function updateStaff(memberId: string, input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const staff = await actionStaff(["owner"]);
  if (isResult(staff)) return staff;
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(memberId).success) return parsed.success ? { ok: false, error: "Unknown staff member." } : invalid(parsed.error);
  if (memberId === staff.memberId) return { ok: false, error: "You can’t change your own owner account here." };
  const { pin, ...fields } = parsed.data;
  if (pin && (await pinInUse(staff.outlet.tenantId, fields.outlet_id, pin, memberId))) {
    return { ok: false, error: "Another staff member already uses that PIN.", fieldErrors: { pin: "Choose a different PIN" } };
  }
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("members")
    .update({ ...fields, ...(pin ? { pin_hash: await hashPin(pin) } : {}) }, { count: "exact" })
    .eq("id", memberId)
    .neq("role", "owner");
  if (error || !count) return { ok: false, error: "Couldn’t save changes." };
  // RLS already ignores inactive members; banning the login also stops token refresh on
  // shared devices, and lifting the ban restores it (revocable device sessions, Arch §12).
  const { data: m } = await supabase.from("members").select("user_id").eq("id", memberId).single();
  if (m?.user_id) {
    const admin = createAdminClient();
    const { data: u } = await admin.auth.admin.getUserById(m.user_id);
    // Only PIN users are single-tenant; an email user may belong to other businesses.
    if (u.user?.email?.endsWith("@staff.krudex.invalid")) {
      await admin.auth.admin.updateUserById(m.user_id, { ban_duration: fields.active ? "none" : "876000h" });
    }
  }
  refresh();
  return { ok: true };
}
