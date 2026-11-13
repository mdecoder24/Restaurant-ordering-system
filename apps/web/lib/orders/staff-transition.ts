import "server-only";
import type { OrderStatus } from "@krudex/core/order-status";
import type { StaffContext } from "@/lib/auth/dal";
import { transition } from "@/lib/guest/orders";
import { createClient } from "@/lib/supabase/server";

export type StaffTransitionResult = { ok: true } | { ok: false; status: number; code: string; message: string };

const messages: Record<string, string> = {
  invalid_transition: "That step isn’t possible for this order any more.",
  forbidden: "Your role can’t do that.",
  reason_required: "Add a reason.",
  conflict: "Someone else just updated this order. The screen will refresh.",
  server_error: "Couldn’t update the order. Try again.",
};

/**
 * Staff status change (Architecture §6). The order is read through RLS first, which proves
 * the staff member can see it; the state machine then checks role and step.
 */
export async function staffTransition(staff: StaffContext, orderId: string, to: OrderStatus, reason?: string | null): Promise<StaffTransitionResult> {
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, status").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, status: 404, code: "not_found", message: "Order not found." };
  const r = await transition(orderId, order.status, to, { type: "staff", role: staff.role, memberId: staff.memberId }, reason);
  if (r.ok) return r;
  const status = r.code === "forbidden" ? 403 : r.code === "server_error" ? 500 : r.code === "reason_required" ? 400 : 409;
  return { ok: false, status, code: r.code, message: messages[r.code] ?? "Couldn’t update the order." };
}
