"use client";

import { formatInr } from "@krudex/core/format";
import { nextStatuses } from "@krudex/core/order-status";
import { Banknote, Monitor, Search, Store, UtensilsCrossed } from "lucide-react";
import { useState, useTransition, type CSSProperties } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { setAvailability } from "@/lib/menu/actions";
import type { BoardGroup } from "@/lib/orders/load";
import { useStaffLiveRefresh } from "@/lib/realtime/use-staff-live";
import { changeOrderStatus, handOver, recordPayment } from "@/lib/sessions/actions";
import { chime } from "@/lib/sound";

type QuickItem = { id: string; name: string; available: boolean };

/** Canteen live panel (C-01 to C-03): queue by token on the left, selected order on the right. */
export function CanteenPanel({ outletId, groups, items, role, prepaidOnly }: { outletId: string; groups: BoardGroup[]; items: QuickItem[]; role: Role; prepaidOnly: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(groups[0]?.sessionId ?? null);
  const [quick, setQuick] = useState(false);
  const [q, setQ] = useState("");
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const connection = useStaffLiveRefresh(outletId, ["orders", "tables"], (event) => {
    if (event === "order.created") chime();
  });

  const selected = groups.find((g) => g.sessionId === selectedId) ?? groups[0] ?? null;
  const due = selected ? Math.max(selected.billed - selected.paid, 0) : 0;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else if (success) toast.success(success);
    });

  return (
    <PageBody>
      <ConnectionBanner state={connection} />
      <PageHeader
        title="Counter"
        description={prepaidOnly ? "Prepaid only: orders reach the kitchen after payment." : "Guests order with a token and collect here."}
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuick(true)}>
              <UtensilsCrossed aria-hidden /> Quick availability
            </Button>
            <Button asChild variant="secondary">
              <a href={`/display/${outletId}`} target="_blank" rel="noopener">
                <Monitor aria-hidden /> Pickup display
              </a>
            </Button>
          </>
        }
      />

      {groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <EmptyState icon={Store} title="No orders yet" description="New tokens appear here the moment guests order." />
        </div>
      ) : (
        <div className="grid min-h-[60dvh] gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <ul aria-label="Queue" className="flex flex-col gap-2">
            {groups.map((g, i) => {
              const top = g.orders.find((o) => ["placed", "accepted", "preparing", "ready"].includes(o.status)) ?? g.orders.at(-1);
              const paid = g.billed > 0 && g.paid >= g.billed;
              return (
                <li key={g.sessionId} style={{ "--i": Math.min(i, 10) } as CSSProperties} className="rise-in">
                  <button
                    type="button"
                    onClick={() => setSelectedId(g.sessionId)}
                    aria-current={selected?.sessionId === g.sessionId || undefined}
                    className={cn(
                      "press flex w-full items-center gap-3 rounded-lg border bg-surface px-4 py-3 text-left shadow-sm transition-colors duration-[var(--motion-fast)]",
                      selected?.sessionId === g.sessionId ? "border-primary ring-1 ring-primary" : "border-border hover-fine:border-border-strong",
                    )}
                  >
                    <span className="font-display text-[1.75rem] leading-none font-extrabold tabular">{g.tokenNo ?? "–"}</span>
                    <span className="min-w-0 flex-1">
                      {top ? <StatusBadge status={top.status} /> : null}
                      <span className="mt-1 block truncate text-caption text-muted">{g.orders.flatMap((o) => o.items).map((it) => `${it.qty}× ${it.name}`).join(", ")}</span>
                    </span>
                    <Badge tone={paid ? "success" : "warning"}>{paid ? "Paid" : "Unpaid"}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <section key={selected.sessionId} aria-label={`Token ${selected.tokenNo ?? ""}`} className="swap-in flex flex-col rounded-lg border border-border bg-surface shadow-sm">
              <header className="flex items-end justify-between gap-4 border-b border-border p-5">
                <div>
                  <p className="text-caption font-semibold tracking-wide text-muted uppercase">Token</p>
                  <p className="font-display text-[3.5rem] leading-none font-extrabold tabular">{selected.tokenNo ?? "–"}</p>
                </div>
                <div className="text-right">
                  <p className="text-small text-muted">{due > 0 ? "Due" : "Paid"}</p>
                  <p className="font-display text-h1 font-bold tabular">{formatInr(due > 0 ? due : selected.paid)}</p>
                </div>
              </header>
              <div className="flex flex-1 flex-col gap-4 p-5">
                {selected.orders.map((o) => {
                  const moves = nextStatuses(o.status, role).filter((s) => s !== "rejected" && s !== "cancelled");
                  return (
                    <article key={o.id} className="rounded-md border border-border">
                      <header className="flex items-center justify-between border-b border-border px-3 py-2">
                        <span className="text-small font-semibold tabular">Order #{o.orderNo}</span>
                        <StatusBadge status={o.status} />
                      </header>
                      <ul className="px-3 py-2 text-body">
                        {o.items.map((it) => (
                          <li key={it.id} className="flex gap-2 py-0.5">
                            <span className="w-8 font-semibold tabular">{it.qty}×</span>
                            <span className="flex-1">
                              {it.name}
                              {it.variant || it.addons.length ? <span className="block text-small text-muted">{[it.variant, ...it.addons].filter(Boolean).join(" · ")}</span> : null}
                              {it.note ? <span className="block text-small font-semibold text-warning">“{it.note}”</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {moves.length ? (
                        <div className="flex flex-wrap gap-2 border-t border-border p-3">
                          {moves.map((to) =>
                            to === "served" ? (
                              <Button key={to} size="lg" disabled={pending || due > 0} onClick={() => run(() => handOver(o.id), `Token ${selected.tokenNo} handed over`)}>
                                Handed over
                              </Button>
                            ) : (
                              <Button key={to} size="lg" variant={to === "accepted" ? "primary" : "secondary"} disabled={pending} onClick={() => run(() => changeOrderStatus(o.id, to))}>
                                {to === "accepted" ? "Accept" : to === "preparing" ? "Start" : "Mark ready"}
                              </Button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
                {due > 0 ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    className="mt-auto"
                    loading={pending}
                    onClick={() => run(() => recordPayment(selected.sessionId, { method: "cash", amount: due }), `${formatInr(due)} cash recorded`)}
                  >
                    <Banknote aria-hidden /> Take {formatInr(due)} cash
                  </Button>
                ) : null}
                {due > 0 && selected.orders.some((o) => o.status === "ready") ? <p className="text-center text-caption text-muted">Collect payment before handing over.</p> : null}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <Sheet open={quick} onOpenChange={setQuick} title="Quick availability" description="Mark items sold out during the rush.">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input aria-label="Search items" placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <ul className="divide-y divide-border">
          {items
            .filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
            .map((i) => {
              const on = optimistic[i.id] ?? i.available;
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className={cn("text-body", !on && "text-muted line-through")}>{i.name}</span>
                  <Switch
                    aria-label={`${i.name} available`}
                    checked={on}
                    onCheckedChange={(v) => {
                      setOptimistic((o) => ({ ...o, [i.id]: v }));
                      run(() => setAvailability([i.id], v));
                    }}
                  />
                </li>
              );
            })}
        </ul>
      </Sheet>
    </PageBody>
  );
}
