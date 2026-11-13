"use client";

import { formatInr } from "@krudex/core/format";
import { ArrowLeft, CircleCheck, Download, Hand, Plus, Receipt, Smartphone, Store } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toaster";
import type { SessionBill as Bill } from "@/lib/guest/bill";
import { cn } from "@/lib/cn";
import { useGuestLive } from "@/lib/realtime/use-guest-live";

type CheckoutStart = { payment_id: string; provider: "razorpay" | "fake"; key_id: string | null; provider_order_id: string; amount: number; name: string };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function SessionBillView({
  initial,
  outletId,
  qrToken,
  canteen,
  payOnline,
  payCash,
}: {
  initial: Bill;
  outletId: string;
  qrToken: string;
  canteen: boolean;
  payOnline: boolean;
  payCash: boolean;
}) {
  const [bill, setBill] = useState(initial);
  const [paying, setPaying] = useState(false);
  const [testCheckout, setTestCheckout] = useState<CheckoutStart | null>(null);
  const [failed, setFailed] = useState(false);
  const payKey = useRef<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/guest/session/bill?outlet=${outletId}`, { cache: "no-store" });
    if (res.ok) setBill(((await res.json()) as { data: Bill }).data);
  }, [outletId]);

  const connection = useGuestLive(
    outletId,
    (event, payload) => {
      if (event === "payment.updated" && payload.status === "captured") toast.success("Payment received. Thank you!");
      if (event === "payment.updated" && payload.status === "failed") setFailed(true);
      void refetch();
    },
    () => void refetch(),
  );

  const startPayment = async () => {
    setPaying(true);
    setFailed(false);
    payKey.current ??= crypto.randomUUID();
    try {
      const res = await fetch("/api/guest/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": payKey.current },
        body: JSON.stringify({ outlet_id: outletId }),
      });
      const json = (await res.json()) as { data?: CheckoutStart; error?: { message: string } };
      if (!res.ok || !json.data) {
        toast.error(json.error?.message ?? "Couldn’t start the payment.");
        return;
      }
      const start = json.data;
      if (start.provider === "fake") {
        setTestCheckout(start);
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) {
        toast.error("Couldn’t open the payment page. Check your connection.");
        return;
      }
      const rzp = new window.Razorpay({
        key: start.key_id,
        amount: start.amount,
        currency: "INR",
        name: start.name,
        order_id: start.provider_order_id,
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() },
        handler: async (r: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          await fetch("/api/guest/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment_id: start.payment_id, provider_order_id: r.razorpay_order_id, provider_payment_id: r.razorpay_payment_id, signature: r.razorpay_signature }),
          });
          payKey.current = null;
          void refetch();
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on("payment.failed", () => setFailed(true));
      rzp.open();
    } finally {
      setPaying(false);
    }
  };

  const testOutcome = async (outcome: "success" | "failure") => {
    if (!testCheckout) return;
    const res = await fetch("/api/test-gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_id: testCheckout.payment_id, outcome }),
    });
    setTestCheckout(null);
    payKey.current = null;
    if (!res.ok || outcome === "failure") setFailed(true);
    void refetch();
  };

  const payAtCounter = async () => {
    const res = await fetch("/api/guest/service-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "request_bill", outlet_id: outletId }),
    });
    if (res.ok) toast.success(canteen ? "Pay at the counter when you collect" : "We’ll bring your bill to the table");
    else toast.error("Couldn’t reach staff. Try again.");
  };

  const closed = bill.session.status === "closed";
  const paidUp = bill.due === 0 && bill.totals.total > 0;

  return (
    <main className="flex min-h-dvh flex-col px-4 pt-4 pb-10">
      <ConnectionBanner state={connection} className="-mx-4 mb-2" />
      <div className="flex items-center justify-between">
        <Link href={`/t/${qrToken}`} className="press -ml-2 inline-flex h-10 items-center gap-1 rounded-md px-2 text-small font-semibold">
          <ArrowLeft className="size-4" aria-hidden /> Menu
        </Link>
        <span className="text-small text-muted">{bill.session.tables?.label ? `Table ${bill.session.tables.label}` : `Token ${bill.session.token_no ?? "–"}`}</span>
      </div>
      <h1 className="mt-4 font-display text-h1 font-bold tracking-tight">{closed ? "Your receipt" : "Your bill"}</h1>

      {bill.orders.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders yet" action={<Button asChild><Link href={`/t/${qrToken}`}>Browse menu</Link></Button>} />
      ) : (
        <>
          <ul className="mt-5 flex flex-col gap-3">
            {bill.orders.map((o, i) => (
              <li key={o.id} className="rise-in rounded-lg border border-border bg-surface" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/o/${o.id}`} className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                  <span className="text-small font-semibold tabular">Order #{o.order_no}</span>
                  <StatusBadge status={o.status} />
                </Link>
                <ul className={cn("px-4 py-2 text-small", (o.status === "rejected" || o.status === "cancelled") && "text-muted line-through")}>
                  {o.order_items.map((it) => (
                    <li key={it.id} className="flex gap-2 py-0.5">
                      <span className="w-6 text-muted tabular">{it.qty}×</span>
                      <span className="flex-1">{it.name_snapshot}</span>
                      <span className="tabular">{formatInr(it.line_total)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <dl className="mt-5 flex flex-col gap-1 rounded-lg bg-surface-2 p-4 text-small">
            {([
              ["Subtotal", bill.totals.subtotal],
              ...(bill.totals.serviceCharge ? [["Service charge", bill.totals.serviceCharge] as const] : []),
              ["CGST", bill.totals.cgst],
              ["SGST", bill.totals.sgst],
              ...(bill.totals.rounding ? [["Rounding", bill.totals.rounding] as const] : []),
            ] as const).map(([l, v]) => (
              <div key={l} className="flex justify-between text-muted">
                <dt>{l}</dt>
                <dd className="tabular">{formatInr(v)}</dd>
              </div>
            ))}
            <div className="mt-1 flex justify-between border-t border-border pt-2 text-body font-semibold">
              <dt>Total</dt>
              <dd className="tabular">{formatInr(bill.totals.total)}</dd>
            </div>
            {bill.paid ? (
              <div className="flex justify-between text-success">
                <dt>Paid</dt>
                <dd className="tabular">−{formatInr(bill.paid)}</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-semibold">Amount due</dt>
              <dd className="font-display text-h1 font-bold tabular">{formatInr(bill.due)}</dd>
            </div>
          </dl>

          <div aria-live="polite" className="mt-5 flex flex-col gap-2">
            {paidUp ? (
              <p className="swap-in flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-body font-semibold text-success">
                <CircleCheck className="size-5" aria-hidden /> Paid in full. Thank you!
              </p>
            ) : null}
            {failed ? (
              <p className="swap-in rounded-md bg-danger/10 px-4 py-3 text-small text-danger" role="alert">
                The payment didn’t go through. Nothing was charged. Try again or pay at the counter.
              </p>
            ) : null}
            {!closed && bill.due > 0 && payOnline ? (
              <Button size="lg" block onClick={startPayment} loading={paying} className="sheen">
                <Smartphone aria-hidden /> {failed ? "Retry" : "Pay"} {formatInr(bill.due)} · UPI or card
              </Button>
            ) : null}
            {!closed && bill.due > 0 && payCash ? (
              <Button size="lg" variant="secondary" block onClick={payAtCounter}>
                {canteen ? <Store aria-hidden /> : <Hand aria-hidden />} Pay at the counter
              </Button>
            ) : null}
            {bill.totals.total > 0 ? (
              <Button asChild variant="ghost" block>
                <a href={`/api/guest/receipt?outlet=${outletId}`} target="_blank" rel="noopener">
                  <Download aria-hidden /> {closed && bill.invoice ? `Download invoice ${bill.invoice.invoice_no}` : "Download receipt"}
                </a>
              </Button>
            ) : null}
            {!closed && !canteen ? (
              <Button asChild variant="ghost" block>
                <Link href={`/t/${qrToken}`}>
                  <Plus aria-hidden /> Order more
                </Link>
              </Button>
            ) : null}
          </div>
        </>
      )}

      <Sheet open={testCheckout !== null} onOpenChange={(o) => !o && setTestCheckout(null)} title="Test payment" description="Test mode: no money moves. Add Razorpay keys to take real payments.">
        {testCheckout ? (
          <div className="flex flex-col gap-3">
            <p className="text-center font-display text-[2.5rem] font-bold tabular">{formatInr(testCheckout.amount)}</p>
            <Button size="lg" block onClick={() => testOutcome("success")}>
              Simulate successful payment
            </Button>
            <Button size="lg" variant="secondary" block onClick={() => testOutcome("failure")}>
              Simulate failed payment
            </Button>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
