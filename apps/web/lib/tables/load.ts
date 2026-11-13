import "server-only";
import { createClient } from "@/lib/supabase/server";
import { qrSvg, guestUrl } from "./qr";

export type TableTileData = {
  id: string;
  label: string;
  seats: number;
  active: boolean;
  status: "free" | "occupied" | "bill_requested";
  qrToken: string;
  qrSvg: string;
  url: string;
  session: {
    id: string;
    openedAt: string;
    billed: number;
    paid: number;
    due: number;
    openRequests: number;
    requestTypes: ("call_waiter" | "request_bill")[];
    orders: SessionOrder[];
    payments: { id: string; method: string; amount: number; status: string; createdAt: string }[];
  } | null;
};

export type SessionOrder = {
  id: string;
  orderNo: number;
  status: "placed" | "accepted" | "preparing" | "ready" | "served" | "rejected" | "cancelled";
  total: number;
  placedAt: string;
  items: { name: string; qty: number; variant: string | null; addons: string[]; note: string | null; lineTotal: number }[];
};

/** Tables with their open session and running bill, all through RLS. */
export async function loadTables(outletId: string): Promise<TableTileData[]> {
  const supabase = await createClient();
  const [{ data: tables }, { data: sessions }] = await Promise.all([
    supabase.from("tables").select("id, label, seats, active, status, qr_token").eq("outlet_id", outletId).order("label"),
    supabase.from("table_sessions").select("id, table_id, opened_at").eq("outlet_id", outletId).eq("status", "open").not("table_id", "is", null),
  ]);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const [orders, payments, requests] = sessionIds.length
    ? await Promise.all([
        supabase
          .from("orders")
          .select("id, session_id, order_no, total, status, placed_at, order_items(name_snapshot, qty, variant_snapshot, addons_snapshot, note, line_total)")
          .in("session_id", sessionIds)
          .order("placed_at"),
        supabase.from("payments").select("id, session_id, method, amount, refunded_amount, status, created_at").in("session_id", sessionIds).order("created_at"),
        supabase.from("service_requests").select("session_id, type").in("session_id", sessionIds).eq("status", "open"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const billed = new Map<string, number>();
  for (const o of orders.data ?? []) {
    if (o.status !== "rejected" && o.status !== "cancelled") billed.set(o.session_id, (billed.get(o.session_id) ?? 0) + o.total);
  }
  const paid = new Map<string, number>();
  for (const p of payments.data ?? []) {
    if (p.status === "captured" || p.status === "refunded") paid.set(p.session_id, (paid.get(p.session_id) ?? 0) + p.amount - p.refunded_amount);
  }
  const reqs = new Map<string, ("call_waiter" | "request_bill")[]>();
  for (const r of requests.data ?? []) reqs.set(r.session_id, [...(reqs.get(r.session_id) ?? []), r.type]);
  const ordersBySession = new Map<string, SessionOrder[]>();
  for (const o of orders.data ?? []) {
    const list = ordersBySession.get(o.session_id) ?? [];
    list.push({
      id: o.id,
      orderNo: o.order_no,
      status: o.status,
      total: o.total,
      placedAt: o.placed_at,
      items: o.order_items.map((i) => ({
        name: i.name_snapshot,
        qty: i.qty,
        variant: (i.variant_snapshot as { name?: string } | null)?.name ?? null,
        addons: ((i.addons_snapshot as { name: string }[] | null) ?? []).map((a) => a.name),
        note: i.note,
        lineTotal: i.line_total,
      })),
    });
    ordersBySession.set(o.session_id, list);
  }
  const paymentsBySession = new Map<string, NonNullable<TableTileData["session"]>["payments"]>();
  for (const p of payments.data ?? []) {
    const list = paymentsBySession.get(p.session_id) ?? [];
    list.push({ id: p.id, method: p.method, amount: p.amount, status: p.status, createdAt: p.created_at });
    paymentsBySession.set(p.session_id, list);
  }
  const byTable = new Map((sessions ?? []).map((s) => [s.table_id!, s]));

  return Promise.all(
    (tables ?? [])
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map(async (t) => {
        const s = byTable.get(t.id);
        const b = s ? (billed.get(s.id) ?? 0) : 0;
        const p = s ? (paid.get(s.id) ?? 0) : 0;
        return {
          id: t.id,
          label: t.label,
          seats: t.seats,
          active: t.active,
          status: t.status,
          qrToken: t.qr_token,
          qrSvg: await qrSvg(t.qr_token),
          url: guestUrl(t.qr_token),
          session: s
            ? {
                id: s.id,
                openedAt: s.opened_at,
                billed: b,
                paid: p,
                due: Math.max(b - p, 0),
                openRequests: reqs.get(s.id)?.length ?? 0,
                requestTypes: reqs.get(s.id) ?? [],
                orders: ordersBySession.get(s.id) ?? [],
                payments: paymentsBySession.get(s.id) ?? [],
              }
            : null,
        };
      }),
  );
}
