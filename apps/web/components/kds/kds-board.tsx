"use client";

import type { OrderStatus } from "@krudex/core/order-status";
import { Check, ChefHat, Undo2, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import type { StaffOrder } from "@/lib/orders/load";
import { useBroadcast } from "@/lib/realtime/use-channel";
import { chime } from "@/lib/sound";
import { getBrowserClient } from "@/lib/supabase/browser";

type Pending = { orderId: string; from: OrderStatus; to: OrderStatus; timer: ReturnType<typeof setTimeout>; label: string };

const columns: { status: OrderStatus; title: string; action?: { to: OrderStatus; label: string } }[] = [
  { status: "accepted", title: "New", action: { to: "preparing", label: "Start" } },
  { status: "preparing", title: "Preparing", action: { to: "ready", label: "Mark ready" } },
  { status: "ready", title: "Ready" },
];
const UNDO_MS = 5_000;
const CANCEL_NOTICE_MS = 10_000;

function elapsed(fromIso: string, now: number) {
  const s = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Ticket({
  order,
  now,
  warnMin,
  overdueMin,
  fresh,
  action,
  onAction,
  onItem,
}: {
  order: StaffOrder;
  now: number;
  warnMin: number;
  overdueMin: number;
  fresh: boolean;
  action?: { to: OrderStatus; label: string };
  onAction: () => void;
  onItem: (itemId: string, done: boolean) => void;
}) {
  const start = order.acceptedAt ?? order.placedAt;
  const ageMin = (now - Date.parse(start)) / 60_000;
  const age = ageMin >= overdueMin ? "overdue" : ageMin >= warnMin ? "warning" : "normal";
  const cancelled = order.status === "cancelled" || order.status === "rejected";
  return (
    <article
      aria-label={`Order ${order.orderNo}${order.tableLabel ? `, table ${order.tableLabel}` : order.tokenNo ? `, token ${order.tokenNo}` : ""}`}
      className={cn(
        "swap-in flex flex-col overflow-hidden rounded-lg border-2 bg-surface shadow-md",
        age === "overdue" ? "border-danger" : age === "warning" ? "border-warning" : "border-border",
        fresh && "kds-flash",
        cancelled && "border-danger",
      )}
    >
      <header className={cn("flex items-center justify-between gap-3 px-4 py-3", age === "overdue" ? "bg-danger/15" : age === "warning" ? "bg-warning/12" : "bg-surface-2")}>
        <div className="min-w-0">
          <p className="truncate font-display text-h2 font-bold">
            {order.tableLabel ? `Table ${order.tableLabel}` : `Token ${order.tokenNo ?? order.orderNo}`}
          </p>
          <p className="text-small text-muted tabular">#{order.orderNo}</p>
        </div>
        <span
          className={cn("font-mono text-h2 font-bold tabular", age === "overdue" ? "text-danger" : age === "warning" ? "text-warning" : "text-text")}
          aria-label={`Waiting ${Math.floor(ageMin)} minutes`}
        >
          {elapsed(start, now)}
        </span>
      </header>
      {cancelled ? (
        <p className="bg-danger px-4 py-2 text-small font-bold text-on-solid uppercase">Cancelled{order.cancelledReason ? ` · ${order.cancelledReason}` : ""}</p>
      ) : null}
      <ul className="flex-1 divide-y divide-border px-2 py-1">
        {order.items.map((i) => {
          const tickable = order.status === "accepted" || order.status === "preparing";
          return (
            <li key={i.id}>
              <button
                type="button"
                disabled={!tickable || cancelled}
                onClick={() => onItem(i.id, i.status !== "done")}
                aria-pressed={i.status === "done"}
                className="flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left disabled:cursor-default"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md border-2 transition-colors duration-[var(--motion-fast)]",
                    i.status === "done" ? "border-success bg-success text-on-solid" : "border-border-strong",
                  )}
                >
                  {i.status === "done" ? <Check className="check-pop size-4" strokeWidth={3} aria-hidden /> : null}
                </span>
                <span className={cn("min-w-0 flex-1", i.status === "done" && "text-muted line-through")}>
                  <span className="text-body font-semibold">
                    <span className="tabular">{i.qty} ×</span> {i.name}
                  </span>
                  {i.variant || i.addons.length ? (
                    <span className="block pl-6 text-small text-muted">{[i.variant, ...i.addons].filter(Boolean).join(" · ")}</span>
                  ) : null}
                  {i.note ? <span className="mt-1 block rounded-sm bg-warning/15 px-2 py-1 text-small font-semibold text-warning">{i.note}</span> : null}
                </span>
                {i.station ? <span className="shrink-0 text-caption text-muted uppercase">{i.station}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {order.note ? <p className="mx-3 mb-3 rounded-md bg-warning/15 px-3 py-2 text-small font-semibold text-warning">Note: {order.note}</p> : null}
      {action && !cancelled ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "press h-16 w-full text-h2 font-bold transition-[background-color] duration-[var(--motion-fast)]",
            action.to === "ready" ? "bg-success text-on-solid" : "bg-primary text-primary-fg",
          )}
        >
          {action.label}
        </button>
      ) : null}
    </article>
  );
}

export function KdsBoard({
  outletId,
  outletName,
  initial,
  warnMin,
  overdueMin,
}: {
  outletId: string;
  outletName: string;
  initial: StaffOrder[];
  warnMin: number;
  overdueMin: number;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [muted, setMuted] = useState(false);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  const [error, setError] = useState<string | null>(null);
  const known = useRef(new Set(initial.map((o) => o.id)));
  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  const client = useMemo(() => (typeof window === "undefined" ? null : getBrowserClient()), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keep the screen awake while the KDS is open.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        // Not supported or denied; the device's own settings apply.
      }
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const since = new Date(Date.now() - CANCEL_NOTICE_MS).toISOString();
      const res = await fetch(`/api/orders?outlet=${outletId}&status=accepted,preparing,ready&since=${encodeURIComponent(since)}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push(`/pin/${outletId}?next=/kds/${outletId}`);
        return;
      }
      if (!res.ok) throw new Error();
      const { data } = (await res.json()) as { data: StaffOrder[] };
      const incoming = data.filter((o) => o.status !== "placed" && o.status !== "served");
      const newOnes = incoming.filter((o) => o.status === "accepted" && !known.current.has(o.id));
      for (const o of incoming) known.current.add(o.id);
      if (newOnes.length) {
        if (!mutedRef.current) chime();
        setFresh(new Set(newOnes.map((o) => o.id)));
        setTimeout(() => setFresh(new Set()), 2400);
      }
      // A move waiting out its undo window stays shown over the server's state.
      const p = pendingRef.current;
      setOrders(p ? incoming.map((o) => (o.id === p.orderId && o.status === p.from ? { ...o, status: p.to } : o)) : incoming);
      setError(null);
    } catch {
      setError("Couldn’t load orders.");
    }
  }, [outletId, router]);

  const connection = useBroadcast({
    client,
    topics: [`outlet:${outletId}:orders`],
    onEvent: () => void refetch(),
    onResync: () => void refetch(),
  });

  // Cancelled tickets stay for 10 s, then clear (Flow §5).
  const visible = orders.filter(
    (o) => !((o.status === "cancelled" || o.status === "rejected") && now - Date.parse(o.updatedAt) > CANCEL_NOTICE_MS),
  );

  const commit = async (p: Pending) => {
    const res = await fetch(`/api/orders/${p.orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: p.to }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message: string } } | null;
      setError(json?.error?.message ?? "Couldn’t update the ticket.");
    }
    void refetch();
  };

  // Wrong-tap protection (Flow §5): the move shows at once but is sent after 5 s unless undone.
  const advance = (order: StaffOrder, to: OrderStatus, label: string) => {
    if (pending) {
      clearTimeout(pending.timer);
      void commit(pending);
    }
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status: to } : o)));
    const p: Pending = { orderId: order.id, from: order.status, to, label, timer: setTimeout(() => {
      setPending(null);
      void commit(p);
    }, UNDO_MS) };
    setPending(p);
  };

  const undo = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    setOrders((os) => os.map((o) => (o.id === pending.orderId ? { ...o, status: pending.from } : o)));
    setPending(null);
  };

  const tickItem = async (orderId: string, itemId: string, done: boolean) => {
    setOrders((os) => os.map((o) => (o.id === orderId ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, status: done ? "done" : "pending" } : i)) } : o)));
    const res = await fetch(`/api/order-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: done ? "done" : "pending" }),
    });
    if (!res.ok) void refetch();
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-4 border-b border-border px-5 py-3">
        <ChefHat className="size-7 text-primary" aria-hidden />
        <h1 className="font-display text-h2 font-bold">{outletName} · Kitchen</h1>
        <span className="text-small text-muted tabular">{new Date(now).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
        <button
          type="button"
          onClick={() => {
            setMuted((m) => !m);
            if (muted) chime();
          }}
          aria-pressed={muted}
          aria-label={muted ? "Unmute new-order sound" : "Mute new-order sound"}
          className="press ml-auto grid size-14 place-items-center rounded-md bg-surface-2"
        >
          {muted ? <VolumeX className="size-6" aria-hidden /> : <Volume2 className="size-6" aria-hidden />}
        </button>
      </header>
      <ConnectionBanner state={connection} />
      {error ? (
        <div role="alert" className="flex items-center justify-between gap-3 bg-danger/15 px-5 py-2 text-small text-danger">
          {error}
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-auto p-4 md:grid-cols-3">
        {columns.map((col) => {
          const list = visible.filter((o) => (col.status === "accepted" ? o.status === "accepted" || o.status === "cancelled" || o.status === "rejected" : o.status === col.status));
          return (
            <section key={col.status} aria-labelledby={`col-${col.status}`} className="flex min-h-0 flex-col rounded-lg bg-surface-2/50">
              <h2 id={`col-${col.status}`} className="flex items-center justify-between px-3 py-2 text-body font-bold">
                {col.title}
                <span className="grid h-8 min-w-8 place-items-center rounded-pill bg-surface px-2 text-small tabular">{list.length}</span>
              </h2>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
                {list.length === 0 ? (
                  col.status === "accepted" ? <EmptyState icon={ChefHat} title="No active orders" description="New tickets appear here with a chime." /> : null
                ) : (
                  // Oldest first (K-01).
                  list.map((o) => (
                    <Ticket
                      key={o.id}
                      order={o}
                      now={now}
                      warnMin={warnMin}
                      overdueMin={overdueMin}
                      fresh={fresh.has(o.id)}
                      action={col.action}
                      onAction={() => col.action && advance(o, col.action.to, col.action.label)}
                      onItem={(itemId, done) => void tickItem(o.id, itemId, done)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </main>

      <div
        className={cn(
          "fixed inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-4 rounded-lg bg-text px-5 py-3 text-bg shadow-lg transition-[transform,opacity] duration-[var(--motion-base)] ease-out",
          pending ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        )}
        role="status"
      >
        <span className="text-body font-semibold">{pending ? `#${orders.find((o) => o.id === pending.orderId)?.orderNo ?? ""} · ${pending.label}` : ""}</span>
        <button type="button" onClick={undo} className="press flex h-12 items-center gap-2 rounded-md bg-bg px-4 text-body font-bold text-text">
          <Undo2 className="size-5" aria-hidden /> Undo
        </button>
      </div>
    </div>
  );
}
