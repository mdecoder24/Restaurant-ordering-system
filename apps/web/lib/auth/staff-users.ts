import "server-only";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PIN-only staff (kitchen, counter) get a synthetic Supabase user so that, once signed in
 * with their PIN, every query still runs through RLS as them (AGENTS.md rule 1).
 * The address uses the reserved .invalid TLD, so it can never receive mail.
 */
export function pinUserEmail(memberKey: string) {
  return `pin-${memberKey}@staff.krudex.invalid`;
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

export async function createPinUser(memberKey: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: pinUserEmail(memberKey),
    email_confirm: true,
    user_metadata: { pin_staff: true },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create staff user");
  return data.user.id;
}

/** Finds the active member at this outlet whose PIN matches, or null. */
export async function findMemberByPin(outletId: string, pin: string) {
  const admin = createAdminClient();
  const { data: outlet } = await admin
    .from("outlets")
    .select("id, tenant_id, tenants(status)")
    .eq("id", outletId)
    .maybeSingle();
  if (!outlet || outlet.tenants?.status !== "active") return null;

  const { data: candidates } = await admin
    .from("members")
    .select("id, user_id, role, pin_hash, outlet_id")
    .eq("tenant_id", outlet.tenant_id)
    .eq("active", true)
    .not("pin_hash", "is", null)
    .or(`outlet_id.is.null,outlet_id.eq.${outletId}`);

  for (const m of candidates ?? []) {
    if (m.pin_hash && m.user_id && (await bcrypt.compare(pin, m.pin_hash))) {
      return { memberId: m.id, userId: m.user_id, role: m.role };
    }
  }
  return null;
}

/** True when another active member at the outlet already uses this PIN. */
export async function pinInUse(tenantId: string, outletId: string | null, pin: string, exceptMemberId?: string) {
  const admin = createAdminClient();
  let q = admin.from("members").select("id, pin_hash").eq("tenant_id", tenantId).eq("active", true).not("pin_hash", "is", null);
  if (outletId) q = q.or(`outlet_id.is.null,outlet_id.eq.${outletId}`);
  const { data } = await q;
  for (const m of data ?? []) {
    if (m.id !== exceptMemberId && m.pin_hash && (await bcrypt.compare(pin, m.pin_hash))) return true;
  }
  return false;
}
