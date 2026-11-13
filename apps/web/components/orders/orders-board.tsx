"use client";

import { formatInr } from "@krudex/core/format";
import { nextStatuses, type OrderStatus } from "@krudex/core/order-status";
import { BellRing, ClipboardList, Clock, Hand, History, Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import type { BoardGroup, StaffOrder } from "@/lib/orders/load";
import { useStaffLiveRefresh } from "@/lib/realtime/use-staff-live";
import { acknowledgeRequests } from "@/lib/sessions/actions";
import { chime } from "@/lib/sound";

const actionLabel: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept",
  rejected: "Reject",
  served: "Mark served",
  cancelled: "Cancel",
};

const quickReasons = ["Item sold out", "Kitchen closing", "Duplicate order", "Guest asked to cancel"];

type EventRow = { id: number; type: string; actor_type: string; actor_name: string | null; payload: { reason?: string | null }; created_at: string };

function eventText(e: EventRow) {
  const who = e.actor_type === "guest" ? "Guest" : e.actor_type === "system" ? "Auto" : (e.actor_name ?? "Staff");
  const what = e.type.replace("order.", "");
  return { who, what: what === "created" ? "placed the order" : what };
}

function OrderDrawer({ order, onClose }: { order: StaffOrder; onClose: () => void }) {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    void fetch(`/api/orders/${order.id}/events`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { data?: EventRow[] }) => alive && setEvents(j.data ?? []));
    return () => {
      alive = false;
    };
  }, [order.id, order.status]);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()} title={`Order #${order.orderNo}`} description={order.tableLabel ? `Table ${order.tableLabel}` : `Token ${order.tokenNo ?? order.orderNo}`}>
      <div className="flex flex-col gap-5">
        <StatusBadge status={order.status} size="lg" className="self-start" />
        <ul className="divide-y divide-border rounded-md border border-border text-small">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-2 px-3 py-2">
              <span className="w-7 text-muted tabular">{i.qty}×</span>
              <span className="min-w-0 flex-1">
                {i.name}
                {i.variant || i.addons.length ? <span className="block text-caption text-muted">{[i.variant, ...i.addons].filter(Boolean).join(" · ")}</span> : null}
                {i.note ? <span className="block text-caption font-semibold text-warning">“{i.note}”</span> : null}
              </span>
              <span className="tabular">{formatInr(i.lineTotal)}</span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 font-semibold">
            <span>Total incl. taxes</span>
            <span className="tabular">{formatInr(order.total)}</span>
          </li>
        </ul>
        {order.note ? <p className="rounded-md bg-warning/10 px-3 py-2 text-small">Note: {order.note}</p> : null}
        <section aria-labelledby="timeline">
          <h3 id="timeline" className="mb-2 flex items-center gap-1.5 text-small font-semibold">
            <History className="size-4" aria-hidden /> Timeline
          </h3>
          {events === null ? (
            <p className="text-small text-muted">Loading…</p>
          ) : (
            <ol className="relative ml-2 border-l border-border pl-4">
              {events.map((e) => {
                const t = eventText(e);
                return (
                  <li key={e.id} className="swap-in relative pb-3 text-small">
                    <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface bg-primary" aria-hidden />
                    <span className="font-semibold">{t.who}</span> {t.what}
                    {e.payload?.reason ? <span className="text-muted"> · {e.payload.reason}</span> : null}
                    <span className="block text-caption text-muted tabular">{new Date(e.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </Sheet>
  );
}

function Minutes({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return <>{Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))} min</>;
}

export function OrdersBoard({ outletId, groups, role, canteen }: { outletId: string; groups: BoardGroup[]; role: Role; canteen: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<{ order: StaffOrder; to: OrderStatus } | null>(null);
  const [reason, setReason] = useState("");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "ready">("all");
  const [, start] = useTransition();

  const connection = useStaffLiveRefresh(outletId, ["orders", "tables"], (event) => {
    if (event === "order.created") {
      chime();
      toast.info("New order", { description: "Review and accept it." });
    }
    if (event === "service_request.created") {
      chime();
      toast.info("A table needs you");
    }
  });

  const send = async (order: StaffOrder, to: OrderStatus, why?: string) => {
    setBusy(order.id);
    const res = await fetch(`/api/orders/${order.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, reason: why ?? null }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message: string } };
    setBusy(null);
    if (!res.ok) toast.error(json.error?.message ?? "Couldn’t update the order.");
    router.refresh();
  };

  const all = groups.flatMap((g) => g.orders);
  const counts = { new: all.filter((o) => o.status === "placed").length, ready: all.filter((o) => o.status === "ready").length };
  const shown = groups
    .map((g) => ({ ...g, visible: g.orders.filter((o) => (filter === "new" ? o.status === "placed" : filter === "ready" ? o.status === "ready" : true)) }))
    .filter((g) => filter === "all" || g.visible.length);
  const drawerOrder = all.find((o) => o.id === drawer) ?? null;
  const actor = role === "kitchen" ? "kitchen" : role;

  return (
    <PageBody>
      <ConnectionBanner state={connection} />
      <PageHeader
        title="Live orders"
        description={groups.length ? `${groups.length} ${canteen ? "open tokens" : "tables with orders"}` : "Orders appear here the moment guests place them."}
        actions={
          <div className="inline-flex rounded-md bg-surface-2 p-1" role="tablist" aria-label="Filter orders">
            {([
              ["all", "All"],
              ["new", `New${counts.new ? ` · ${counts.new}` : ""}`],
              ["ready", `Ready${counts.ready ? ` · ${counts.ready}` : ""}`],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={cn("press h-8 rounded-sm px-3 text-small font-semibold transition-colors", filter === k ? "bg-surface text-text shadow-sm" : "text-muted")}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {shown.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <EmptyState icon={ClipboardList} title={filter === "all" ? "No orders yet" : "Nothing here right now"} description="New orders will appear here." />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((g, gi) => (
            <section
              key={g.sessionId}
              aria-label={g.label}
              style={{ "--i": Math.min(gi, 8) } as CSSProperties}
              className={cn(
                "rise-in flex flex-col rounded-lg border bg-surface shadow-sm",
                g.requests.length ? "border-warning/60" : g.orders.some((o) => o.status === "placed") ? "border-info/50" : "border-border",
              )}
            >
              <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                <h2 className="font-display text-h2 font-bold">{g.label}</h2>
                <span className="flex items-center gap-1 text-caption text-muted">
                  <Clock className="size-3.5" aria-hidden /> <Minutes iso={g.openedAt} />
                </span>
                <span className="ml-auto text-right">
                  <span className="block font-display text-body font-bold tabular">{formatInr(Math.max(g.billed - g.paid, 0))}</span>
                  <span className="block text-caption text-muted">{g.paid >= g.billed && g.billed > 0 ? "Paid" : "Due"}</span>
                </span>
              </header>
              {g.requests.length ? (
                <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 text-small">
                  {g.requests.includes("request_bill") ? <Receipt className="size-4 text-warning" aria-hidden /> : <Hand className="size-4 text-warning" aria-hidden />}
                  <span className="flex-1 font-medium">{g.requests.includes("request_bill") ? "Asked for the bill" : "Calling a waiter"}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      start(async () => {
                        const r = await acknowledgeRequests(g.sessionId);
                        if (!r.ok) toast.error(r.error);
                      })
                    }
                  >
                    <BellRing aria-hidden /> On my way
                  </Button>
                </div>
              ) : null}
              <ul className="divide-y divide-border">
                {(filter === "all" ? g.orders : g.visible).map((o) => {
                  const moves = nextStatuses(o.status, actor).filter((s) => s !== "preparing" && s !== "ready");
                  return (
                    <li key={o.id} className={cn("px-4 py-3", (o.status === "rejected" || o.status === "cancelled") && "opacity-60")}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDrawer(o.id)} className="text-small font-semibold tabular underline-offset-4 hover-fine:underline">
                          #{o.orderNo}
                        </button>
                        <StatusBadge status={o.status} />
                        <span className="ml-auto text-small font-semibold tabular">{formatInr(o.total)}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-small text-muted">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                      {o.cancelledReason ? <p className="mt-1 text-caption text-danger">{o.cancelledReason}</p> : null}
                      {moves.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {moves.map((to) => (
                            <Button
                              key={to}
                              size="sm"
                              variant={to === "rejected" || to === "cancelled" ? "ghost" : to === "served" ? "secondary" : "primary"}
                              className={cn((to === "rejected" || to === "cancelled") && "text-danger")}
                              loading={busy === o.id && to !== "rejected" && to !== "cancelled"}
                              onClick={() => (to === "rejected" || (to === "cancelled" && o.status !== "placed") ? (setReason(""), setReasonFor({ order: o, to })) : void send(o, to))}
                            >
                              {actionLabel[to] ?? to}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {g.tableId && !canteen ? (
                <Link href="/app/tables" className="mt-auto border-t border-border px-4 py-2.5 text-small font-semibold text-primary">
                  Open bill
                </Link>
              ) : null}
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={reasonFor !== null}
        onOpenChange={(o) => !o && setReasonFor(null)}
        title={reasonFor?.to === "rejected" ? `Reject order #${reasonFor?.order.orderNo}?` : `Cancel order #${reasonFor?.order.orderNo}?`}
        description="The guest sees this reason. If they paid, a refund is needed."
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Back</Button>
            </DialogClose>
            <Button
              variant="danger"
              disabled={!reason.trim()}
              onClick={() => {
                const r = reasonFor!;
                setReasonFor(null);
                void send(r.order, r.to, reason);
              }}
            >
              {reasonFor?.to === "rejected" ? "Reject order" : "Cancel order"}
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-2 pb-3">
          {quickReasons.map((q) => (
            <button key={q} type="button" onClick={() => setReason(q)} className={cn("press rounded-pill border px-3 py-1.5 text-small", reason === q ? "border-primary bg-primary-soft text-primary" : "border-border-strong")}>
              {q}
            </button>
          ))}
        </div>
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </Field>
      </Dialog>

      {drawerOrder ? <OrderDrawer order={drawerOrder} onClose={() => setDrawer(null)} /> : null}
    </PageBody>
  );
}
