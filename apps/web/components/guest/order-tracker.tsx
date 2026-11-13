"use client";

import { formatInr } from "@krudex/core/format";
import type { OrderStatus } from "@krudex/core/order-status";
import { ArrowLeft, BellRing, Check, ChefHat, CircleSlash, Hand, Plus, Receipt, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { useGuestLive } from "@/lib/realtime/use-guest-live";

export type TrackedOrder = {
  id: string;
  outlet_id: string;
  order_no: number;
  status: OrderStatus;
  note: string | null;
  subtotal: number;
  service_charge: number;
  tax: number;
  rounding: number;
  total: number;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  served_at: string | null;
  cancelled_reason: string | null;
  updated_at: string;
  order_items: { id: string; name_snapshot: string; variant_snapshot: unknown; addons_snapshot: unknown; qty: number; line_total: number; note: string | null }[];
};

const steps: { status: OrderStatus; label: string; icon: typeof Check; at: keyof TrackedOrder }[] = [
  { status: "placed", label: "Order sent", icon: Receipt, at: "placed_at" },
  { status: "accepted", label: "Confirmed", icon: Check, at: "accepted_at" },
  { status: "preparing", label: "Being prepared", icon: ChefHat, at: "accepted_at" },
  { status: "ready", label: "Ready", icon: BellRing, at: "ready_at" },
  { status: "served", label: "Served", icon: UtensilsCrossed, at: "served_at" },
];
const rank: Record<OrderStatus, number> = { placed: 0, accepted: 1, preparing: 2, ready: 3, served: 4, rejected: -1, cancelled: -1 };

function headline(o: TrackedOrder, canteen: boolean, token: number | null) {
  switch (o.status) {
    case "placed":
      return { title: "Order sent", body: "Waiting for the restaurant to confirm." };
    case "accepted":
      return { title: "Confirmed", body: "The kitchen has your order." };
    case "preparing":
      return { title: "Being prepared", body: "Fresh from the kitchen, coming up." };
    case "ready":
      return canteen
        ? { title: `Ready. Collect with token ${token ?? o.order_no}`, body: "Show this screen at the counter." }
        : { title: "On its way", body: "Your food is heading to your table." };
    case "served":
      return { title: "Served. Enjoy!", body: canteen ? "Thanks for ordering." : "Order more any time, or pay when you’re done." };
    case "rejected":
      return { title: "The restaurant couldn’t take this order", body: o.cancelled_reason ?? "Ask staff for help." };
    case "cancelled":
      return { title: "Order cancelled", body: o.cancelled_reason ?? "" };
  }
}

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");

export function OrderTracker({
  initial,
  qrToken,
  canteen,
  tokenNo,
  tableLabel,
}: {
  initial: TrackedOrder;
  qrToken: string | null;
  canteen: boolean;
  tokenNo: number | null;
  tableLabel: string | null;
}) {
  const [order, setOrder] = useState(initial);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const last = useRef(initial.status);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/guest/orders/${initial.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const { data } = (await res.json()) as { data: TrackedOrder };
    // Discard stale responses (Architecture §8: every event carries updated_at).
    setOrder((cur) => (Date.parse(data.updated_at) >= Date.parse(cur.updated_at) ? data : cur));
  }, [initial.id]);

  const connection = useGuestLive(
    initial.outlet_id,
    (event, payload) => {
      if (event.startsWith("order.") && payload.id === initial.id) void refetch();
    },
    () => void refetch(),
  );

  // Alert on "ready" (G-14): vibration where supported, plus the visual change.
  useEffect(() => {
    if (order.status === "ready" && last.current !== "ready") {
      navigator.vibrate?.([200, 100, 200]);
      toast.success(canteen ? `Token ${tokenNo ?? order.order_no} is ready` : "Your order is on its way");
    }
    last.current = order.status;
  }, [order.status, canteen, tokenNo, order.order_no]);

  const h = headline(order, canteen, tokenNo);
  const current = rank[order.status];
  const ended = order.status === "rejected" || order.status === "cancelled";

  const cancel = async () => {
    setBusy(true);
    const res = await fetch(`/api/guest/orders/${order.id}/cancel`, { method: "POST" });
    const json = (await res.json()) as { error?: { message: string } };
    setBusy(false);
    setConfirmCancel(false);
    if (res.ok) void refetch();
    else toast.error(json.error?.message ?? "Couldn’t cancel.");
  };

  const callStaff = async (type: "call_waiter" | "request_bill") => {
    const res = await fetch("/api/guest/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, outlet_id: order.outlet_id }),
    });
    if (res.ok) toast.success(type === "call_waiter" ? "A waiter is on the way" : "We’ll bring your bill");
    else toast.error("Couldn’t reach staff. Try again.");
  };

  return (
    <main className="flex min-h-dvh flex-col px-4 pt-4 pb-10">
      <ConnectionBanner state={connection} className="-mx-4 mb-2" />
      <div className="flex items-center justify-between">
        {qrToken ? (
          <Link href={`/t/${qrToken}`} className="press -ml-2 inline-flex h-10 items-center gap-1 rounded-md px-2 text-small font-semibold">
            <ArrowLeft className="size-4" aria-hidden /> Menu
          </Link>
        ) : (
          <span />
        )}
        <span className="text-small text-muted tabular">
          Order #{order.order_no}
          {tableLabel ? ` · Table ${tableLabel}` : ""}
        </span>
      </div>

      {canteen && !ended ? (
        <section
          aria-label="Your token"
          // Ready is the moment guests wait for: the token card flips up in 3D (rare, so it can delight).
          key={order.status === "ready" ? "ready" : "waiting"}
          className={cn(order.status === "ready" ? "flip-in" : "rise-in", "mt-6 rounded-lg border border-border bg-surface p-6 text-center shadow-md")}
        >
          <p className="text-small font-semibold tracking-wide text-muted uppercase">Your token</p>
          <p className={cn("font-display text-[4.5rem] leading-none font-extrabold tracking-tight tabular", order.status === "ready" ? "text-success" : "text-text")}>
            {tokenNo ?? order.order_no}
          </p>
          <p className="mt-2 text-small text-muted">Show at the counter when it’s ready</p>
        </section>
      ) : null}

      <div aria-live="polite" className={cn(order.status === "ready" ? "flip-in" : "rise-in", "mt-6")} key={order.status}>
        <h1 className={cn("swap-in font-display text-h1 font-bold tracking-tight text-balance", ended && "text-danger")}>{h.title}</h1>
        {h.body ? <p className="mt-1 text-body text-muted">{h.body}</p> : null}
      </div>

      {ended ? (
        <div className="mt-6 flex items-center gap-3 rounded-md bg-danger/10 p-4 text-small text-danger">
          <CircleSlash className="size-5 shrink-0" aria-hidden />
          Nothing was charged for this order.
        </div>
      ) : (
        <ol className="mt-6 flex flex-col" aria-label="Order progress">
          {steps.map((s, i) => {
            const done = i < current || (i === current && order.status === "served");
            const now = i === current && order.status !== "served";
            const at = order[s.at] as string | null;
            return (
              <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={now ? "step" : undefined}>
                {i < steps.length - 1 ? (
                  <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-0.5 overflow-hidden rounded-pill bg-border">
                    <span className={cn("block h-full origin-top bg-primary transition-transform duration-[var(--motion-slow)] ease-out", i < current ? "scale-y-100" : "scale-y-0")} />
                  </span>
                ) : null}
                <span
                  className={cn(
                    "relative grid size-9 shrink-0 place-items-center rounded-full border-2 transition-[background-color,border-color,color] duration-[var(--motion-base)]",
                    done ? "border-primary bg-primary text-primary-fg" : now ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted",
                  )}
                >
                  {now ? <span className="ping-ring absolute inset-0 rounded-full border-2 border-primary" aria-hidden /> : null}
                  {done ? <Check className="check-pop size-4" strokeWidth={3} aria-hidden /> : <s.icon className="size-4" aria-hidden />}
                </span>
                <div className="pt-1.5">
                  <p className={cn("text-body font-semibold", !done && !now && "text-muted")}>{s.label}</p>
                  {(done || now) && at ? <p className="text-caption text-muted tabular">{time(at)}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-label="Items" className="mt-8 rounded-lg border border-border bg-surface">
        <ul className="divide-y divide-border">
          {order.order_items.map((i) => {
            const v = (i.variant_snapshot as { name?: string } | null)?.name;
            const adds = ((i.addons_snapshot as { name: string }[] | null) ?? []).map((a) => a.name);
            return (
              <li key={i.id} className="flex gap-3 px-4 py-3 text-small">
                <span className="w-6 font-semibold text-muted tabular">{i.qty}×</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{i.name_snapshot}</span>
                  {v || adds.length ? <span className="block text-caption text-muted">{[v, ...adds].filter(Boolean).join(" · ")}</span> : null}
                  {i.note ? <span className="block text-caption text-warning">“{i.note}”</span> : null}
                </span>
                <span className="tabular">{formatInr(i.line_total)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between border-t border-border px-4 py-3 text-body font-semibold">
          <span>
            Total <span className="text-small font-normal text-muted">incl. taxes</span>
          </span>
          <span className="tabular">{formatInr(order.total)}</span>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2">
        {qrToken ? (
          <Button asChild size="lg" block>
            <Link href={`/t/${qrToken}/orders`}>{canteen ? "Pay and view orders" : "View bill and pay"}</Link>
          </Button>
        ) : null}
        {qrToken && !canteen ? (
          <Button asChild size="lg" variant="secondary" block>
            <Link href={`/t/${qrToken}`}>
              <Plus aria-hidden /> Add more items
            </Link>
          </Button>
        ) : null}
        {!canteen && !ended ? (
          <Button variant="ghost" block onClick={() => callStaff("call_waiter")}>
            <Hand aria-hidden /> Call a waiter
          </Button>
        ) : null}
        {order.status === "placed" ? (
          <Button variant="ghost" block className="text-danger" onClick={() => setConfirmCancel(true)}>
            Cancel order
          </Button>
        ) : null}
      </div>

      <Dialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this order?"
        description="You can cancel until the restaurant confirms it."
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Keep order</Button>
            </DialogClose>
            <Button variant="danger" onClick={cancel} loading={busy}>
              Cancel order
            </Button>
          </>
        }
      />
    </main>
  );
}
