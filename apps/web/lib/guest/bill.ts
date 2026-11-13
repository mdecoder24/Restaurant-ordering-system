import "server-only";
import { sumOrderTotals } from "@krudex/core/bill";
import { createAdminClient } from "@/lib/supabase/admin";

export type SessionBill = Awaited<ReturnType<typeof loadSessionBill>>;

/** Everything a guest sees about their session: orders, totals, payments, amount due. */
export async function loadSessionBill(sessionId: string) {
  const admin = createAdminClient();
  const [{ data: session }, { data: orders }, { data: payments }, { data: invoice }, { data: bal }] = await Promise.all([
    admin.from("table_sessions").select("id, outlet_id, table_id, token_no, status, opened_at, closed_at, tables(label)").eq("id", sessionId).single(),
    admin
      .from("orders")
      .select("id, order_no, status, subtotal, service_charge, tax, rounding, total, placed_at, cancelled_reason, order_items(id, name_snapshot, variant_snapshot, addons_snapshot, qty, line_total, note)")
      .eq("session_id", sessionId)
      .order("placed_at"),
    admin.from("payments").select("id, method, amount, refunded_amount, status, created_at").eq("session_id", sessionId).order("created_at"),
    admin.from("invoices").select("id, invoice_no").eq("session_id", sessionId).maybeSingle(),
    admin.rpc("session_balance", { p_session: sessionId }).single(),
  ]);
  const live = (orders ?? []).filter((o) => o.status !== "rejected" && o.status !== "cancelled");
  return {
    session: session!,
    orders: orders ?? [],
    payments: payments ?? [],
    invoice: invoice ?? null,
    totals: sumOrderTotals(live.map((o) => ({ subtotal: o.subtotal, serviceCharge: o.service_charge, tax: o.tax, rounding: o.rounding, total: o.total }))),
    paid: bal?.paid ?? 0,
    due: bal?.due ?? 0,
  };
}
