import "server-only";
import { checkTransition, type OrderStatus } from "@krudex/core/order-status";
import { createAdminClient } from "@/lib/supabase/admin";

/** Server-side status change with the state machine check and conditional update. */
export async function transition(
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  actor: { type: "guest" | "system" } | { type: "staff"; role: "owner" | "manager" | "waiter" | "kitchen"; memberId: string },
  reason?: string | null,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const check = checkTransition(from, to, actor.type === "staff" ? actor.role : actor.type, reason);
  if (!check.ok) return check;
  const { data, error } = await createAdminClient().rpc("transition_order", {
    p_order: orderId,
    p_from: from,
    p_to: to,
    p_actor_type: actor.type,
    p_actor_id: actor.type === "staff" ? actor.memberId : (null as unknown as string),
    p_reason: (reason ?? null) as string,
  });
  if (error) return { ok: false, code: "server_error" };
  return data ? { ok: true } : { ok: false, code: "conflict" };
}

/** Order with items, scoped to a session the guest has proven. */
export async function loadGuestOrder(orderId: string, sessionId: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select(
      "id, outlet_id, session_id, order_no, status, note, subtotal, service_charge, tax, rounding, total, placed_at, accepted_at, ready_at, served_at, cancelled_reason, updated_at, order_items(id, name_snapshot, variant_snapshot, addons_snapshot, qty, unit_price, line_total, note), table_sessions(token_no, table_id, tables(label))",
    )
    .eq("id", orderId)
    .eq("session_id", sessionId)
    .maybeSingle();
  return data;
}
