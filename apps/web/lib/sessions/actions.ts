"use server";

import { sumOrderTotals } from "@krudex/core/bill";
import type { OrderStatus } from "@krudex/core/order-status";
import { uuid } from "@krudex/core/schemas";
import { refresh } from "next/cache";
import { z } from "zod";
import { actionStaff, isResult, type ActionResult } from "@/lib/actions";
import type { StaffContext } from "@/lib/auth/dal";
import { staffTransition } from "@/lib/orders/staff-transition";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const floor = ["owner", "manager", "waiter"] as const;

/** Confirms through RLS that the staff member can see this session, and returns it. */
async function visibleSession(staff: StaffContext, sessionId: string) {
  if (!uuid.safeParse(sessionId).success) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("table_sessions")
    .select("id, tenant_id, outlet_id, table_id, status")
    .eq("id", sessionId)
    .eq("outlet_id", staff.outlet.id)
    .maybeSingle();
  return data;
}

const paymentSchema = z.object({
  method: z.enum(["cash", "card", "upi"]),
  amount: z.number().int().min(1).max(10_000_000_00),
});

/** Cash, or card/UPI taken on the outlet's own terminal (D-06: settle by cash or mixed). */
export async function recordPayment(sessionId: string, input: z.infer<typeof paymentSchema>): Promise<ActionResult> {
  const staff = await actionStaff(floor);
  if (isResult(staff)) return staff;
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter an amount." };
  const session = await visibleSession(staff, sessionId);
  if (!session || session.status !== "open") return { ok: false, error: "This bill is already closed." };

  const admin = createAdminClient();
  const { data: bal } = await admin.rpc("session_balance", { p_session: sessionId }).single();
  if (!bal || parsed.data.amount > bal.due) return { ok: false, error: "That’s more than the amount due." };

  const { error } = await admin.from("payments").insert({
    tenant_id: session.tenant_id,
    outlet_id: session.outlet_id,
    session_id: session.id,
    method: parsed.data.method,
    provider: "manual",
    amount: parsed.data.amount,
    status: "captured",
    recorded_by: staff.memberId,
  });
  if (error) return { ok: false, error: "Couldn’t record the payment." };
  refresh();
  return { ok: true };
}

/** Settle and close (D-06): requires nothing due and no order still in progress. */
export async function closeSession(sessionId: string): Promise<ActionResult<{ invoiceId: string | null }>> {
  const staff = await actionStaff(floor);
  if (isResult(staff)) return staff;
  const r = await closeSessionAs(staff, sessionId);
  if (r.ok) refresh();
  return r;
}

async function closeSessionAs(staff: StaffContext, sessionId: string): Promise<ActionResult<{ invoiceId: string | null }>> {
  const session = await visibleSession(staff, sessionId);
  if (!session || session.status !== "open") return { ok: false, error: "This bill is already closed." };

  const admin = createAdminClient();
  const { data: bal } = await admin.rpc("session_balance", { p_session: sessionId }).single();
  if (bal && bal.due > 0) return { ok: false, error: "Collect the remaining amount before closing." };

  const { data: orders } = await admin
    .from("orders")
    .select("subtotal, service_charge, tax, rounding, total, status")
    .eq("session_id", sessionId);
  if ((orders ?? []).some((o) => ["placed", "accepted", "preparing", "ready"].includes(o.status))) {
    return { ok: false, error: "Some orders are still in progress. Serve or cancel them first." };
  }
  const billable = (orders ?? []).filter((o) => o.status === "served");

  let invoiceNo: string | null = null;
  let totals = {};
  if (billable.length) {
    const { data: outlet } = await admin.from("outlets").select("timezone").eq("id", session.outlet_id).single();
    const { data: no } = await admin.rpc("next_invoice_no", { p_tenant: session.tenant_id, p_timezone: outlet?.timezone ?? "Asia/Kolkata" });
    invoiceNo = no ?? null;
    totals = sumOrderTotals(
      billable.map((o) => ({ subtotal: o.subtotal, serviceCharge: o.service_charge, tax: o.tax, rounding: o.rounding, total: o.total })),
    );
  }
  const { data: invoiceId, error } = await admin.rpc("close_session", {
    p_session: sessionId,
    // SQL accepts null (no orders, so no invoice); generated types mark params non-null.
    p_invoice_no: invoiceNo as string,
    p_totals: totals,
  });
  if (error) return { ok: false, error: error.message.includes("progress") ? "Some orders are still in progress." : "Couldn’t close the table." };
  return { ok: true, data: { invoiceId: invoiceId ?? null } };
}

export async function acknowledgeRequests(sessionId: string): Promise<ActionResult> {
  const staff = await actionStaff(floor);
  if (isResult(staff)) return staff;
  const session = await visibleSession(staff, sessionId);
  if (!session) return { ok: false, error: "Unknown table." };
  const admin = createAdminClient();
  const { error } = await admin.from("service_requests").update({ status: "acknowledged" }).eq("session_id", sessionId).eq("status", "open");
  if (error) return { ok: false, error: "Couldn’t update requests." };
  refresh();
  return { ok: true };
}

/**
 * Canteen handover (C-03): ready → served, then the session closes on its own once it is
 * fully paid and nothing else is in progress (Flow §4 step 6).
 */
export async function handOver(orderId: string): Promise<ActionResult<{ closed: boolean }>> {
  const staff = await actionStaff(floor);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Unknown order." };
  const t = await staffTransition(staff, orderId, "served");
  if (!t.ok) return { ok: false, error: t.message };
  const { data: o } = await (await createClient()).from("orders").select("session_id").eq("id", orderId).single();
  let closed = false;
  if (o) {
    const admin = createAdminClient();
    const { data: bal } = await admin.rpc("session_balance", { p_session: o.session_id }).single();
    const { count: active } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("session_id", o.session_id)
      .in("status", ["placed", "accepted", "preparing", "ready"]);
    if (bal?.due === 0 && !active) closed = (await closeSessionAs(staff, o.session_id)).ok;
  }
  refresh();
  return { ok: true, data: { closed } };
}

/** Status change from a server-rendered panel (canteen) using the same rules as the API. */
export async function changeOrderStatus(orderId: string, to: OrderStatus, reason?: string): Promise<ActionResult> {
  const staff = await actionStaff(["owner", "manager", "waiter"]);
  if (isResult(staff)) return staff;
  if (!uuid.safeParse(orderId).success) return { ok: false, error: "Unknown order." };
  const t = await staffTransition(staff, orderId, to, reason);
  if (!t.ok) return { ok: false, error: t.message };
  refresh();
  return { ok: true };
}
