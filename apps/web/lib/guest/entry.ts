import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** QR token that brings a guest back to the right menu for this session. */
export async function entryTokenForSession(session: { outlet_id: string; table_id: string | null }) {
  const admin = createAdminClient();
  if (session.table_id) {
    const { data } = await admin.from("tables").select("qr_token, label").eq("id", session.table_id).maybeSingle();
    return { qrToken: data?.qr_token ?? null, tableLabel: data?.label ?? null };
  }
  const { data } = await admin.from("outlets").select("counter_qr_token").eq("id", session.outlet_id).maybeSingle();
  return { qrToken: data?.counter_qr_token ?? null, tableLabel: null };
}
