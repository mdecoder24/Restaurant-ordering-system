import "server-only";
import type { OrderStatus } from "@krudex/core/order-status";
import { createClient } from "@/lib/supabase/server";

export type StaffOrderItem = {
  id: string;
  name: string;
  qty: number;
  variant: string | null;
  addons: string[];
  note: string | null;
  station: string | null;
  status: "pending" | "done";
  lineTotal: number;
};

export type StaffOrder = {
  id: string;
  orderNo: number;
  status: OrderStatus;
  note: string | null;
  total: number;
  placedAt: string;
  acceptedAt: string | null;
  readyAt: string | null;
  updatedAt: string;
  cancelledReason: string | null;
  sessionId: string;
  tableId: string | null;
  tableLabel: string | null;
  tokenNo: number | null;
  paid: boolean;
  items: StaffOrderItem[];
};

const select =
  "id, order_no, status, note, total, placed_at, accepted_at, ready_at, updated_at, cancelled_reason, session_id, order_items(id, name_snapshot, qty, variant_snapshot, addons_snapshot, note, prep_station, status, line_total), table_sessions(table_id, token_no, tables(label))";

type Row = {
  id: string;
  order_no: number;
  status: OrderStatus;
  note: string | null;
  total: number;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  updated_at: string;
  cancelled_reason: string | null;
  session_id: string;
  order_items: { id: string; name_snapshot: string; qty: number; variant_snapshot: unknown; addons_snapshot: unknown; note: string | null; prep_station: string | null; status: "pending" | "done"; line_total: number }[];
  table_sessions: { table_id: string | null; token_no: number | null; tables: { label: string } | null } | null;
};

export function toStaffOrder(r: Row, paidSessions: Set<string>): StaffOrder {
  return {
    id: r.id,
    orderNo: r.order_no,
    status: r.status,
    note: r.note,
    total: r.total,
    placedAt: r.placed_at,
    acceptedAt: r.accepted_at,
    readyAt: r.ready_at,
    updatedAt: r.updated_at,
    cancelledReason: r.cancelled_reason,
    sessionId: r.session_id,
    tableId: r.table_sessions?.table_id ?? null,
    tableLabel: r.table_sessions?.tables?.label ?? null,
    tokenNo: r.table_sessions?.token_no ?? null,
    paid: paidSessions.has(r.session_id),
    items: r.order_items.map((i) => ({
      id: i.id,
      name: i.name_snapshot,
      qty: i.qty,
      variant: (i.variant_snapshot as { name?: string } | null)?.name ?? null,
      addons: ((i.addons_snapshot as { name: string }[] | null) ?? []).map((a) => a.name),
      note: i.note,
      station: i.prep_station,
      status: i.status,
      lineTotal: i.line_total,
    })),
  };
}

/**
 * Orders for live screens via RLS (GET /api/orders and server renders share this).
 * `since` keeps recently finished orders so screens can show the brief "cancelled" notice.
 */
export async function loadOutletOrders(outletId: string, statuses: OrderStatus[], since?: string): Promise<StaffOrder[]> {
  const supabase = await createClient();
  let q = supabase.from("orders").select(select).eq("outlet_id", outletId).order("placed_at");
  q = since ? q.or(`status.in.(${statuses.join(",")}),updated_at.gte.${since}`) : q.in("status", statuses);
  const { data } = await q.limit(300);
  const rows = (data ?? []) as unknown as Row[];
  const sessionIds = [...new Set(rows.map((r) => r.session_id))];
  const paid = new Set<string>();
  if (sessionIds.length) {
    // Kitchen cannot read payments (RLS) and simply sees nothing here, which is intended.
    const { data: pays } = await supabase.from("payments").select("session_id, status").in("session_id", sessionIds).eq("status", "captured");
    for (const p of pays ?? []) paid.add(p.session_id);
  }
  return rows.map((r) => toStaffOrder(r, paid));
}

export type BoardGroup = {
  sessionId: string;
  tableId: string | null;
  label: string;
  tokenNo: number | null;
  openedAt: string;
  billed: number;
  paid: number;
  requests: ("call_waiter" | "request_bill")[];
  orders: StaffOrder[];
};

/** Live board (D-01): every open session with all its orders and running total. */
export async function loadBoard(outletId: string): Promise<BoardGroup[]> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("table_sessions")
    .select("id, table_id, token_no, opened_at, tables(label)")
    .eq("outlet_id", outletId)
    .eq("status", "open")
    .order("opened_at");
  const ids = (sessions ?? []).map((s) => s.id);
  if (!ids.length) return [];
  const [{ data: rows }, { data: pays }, { data: reqs }] = await Promise.all([
    supabase.from("orders").select(select).in("session_id", ids).order("placed_at"),
    supabase.from("payments").select("session_id, amount, refunded_amount, status").in("session_id", ids),
    supabase.from("service_requests").select("session_id, type").in("session_id", ids).eq("status", "open"),
  ]);
  const paidBy = new Map<string, number>();
  for (const p of pays ?? []) if (p.status === "captured" || p.status === "refunded") paidBy.set(p.session_id, (paidBy.get(p.session_id) ?? 0) + p.amount - p.refunded_amount);
  const paidSessions = new Set([...paidBy.keys()]);
  const orders = ((rows ?? []) as unknown as Row[]).map((r) => toStaffOrder(r, paidSessions));
  return (sessions ?? [])
    .map((s) => {
      const os = orders.filter((o) => o.sessionId === s.id);
      return {
        sessionId: s.id,
        tableId: s.table_id,
        label: s.tables?.label ? `Table ${s.tables.label}` : `Token ${s.token_no ?? "–"}`,
        tokenNo: s.token_no,
        openedAt: s.opened_at,
        billed: os.filter((o) => o.status !== "rejected" && o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
        paid: paidBy.get(s.id) ?? 0,
        requests: (reqs ?? []).filter((r) => r.session_id === s.id).map((r) => r.type),
        orders: os,
      };
    })
    .filter((g) => g.orders.length > 0 || g.requests.length > 0);
}
