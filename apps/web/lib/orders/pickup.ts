import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Public pickup board data: token numbers and state only, nothing personal (C-03). */
export async function loadPickup(outletId: string) {
  const admin = createAdminClient();
  const { data: outlet } = await admin.from("outlets").select("name, mode").eq("id", outletId).maybeSingle();
  if (!outlet || outlet.mode !== "canteen") return null;
  const since = new Date(Date.now() - 12 * 60 * 60_000).toISOString();
  const { data } = await admin
    .from("orders")
    .select("status, order_no, updated_at, table_sessions(token_no)")
    .eq("outlet_id", outletId)
    .in("status", ["accepted", "preparing", "ready"])
    .gte("placed_at", since)
    .order("updated_at");
  const token = (o: { order_no: number; table_sessions: { token_no: number | null } | null }) => o.table_sessions?.token_no ?? o.order_no;
  const ready = [...new Set((data ?? []).filter((o) => o.status === "ready").map(token))];
  const preparing = [...new Set((data ?? []).filter((o) => o.status !== "ready").map(token))].filter((t) => !ready.includes(t));
  return { name: outlet.name, preparing, ready };
}
