"use client";

import { formatInr, paiseToInput, parseInr } from "@krudex/core/format";
import { BellRing, Banknote, CircleCheck, CreditCard, Receipt, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { acknowledgeRequests, closeSession, recordPayment } from "@/lib/sessions/actions";
import type { TableTileData } from "@/lib/tables/load";

const methods = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
] as const;

const methodLabel: Record<string, string> = { cash: "Cash", card: "Card", upi: "UPI", online: "Online" };

/** Running bill for a table, with settle and close (D-06) and service requests (G-15). */
export function SessionPanel({ table, role, onClosed }: { table: TableTileData; role: Role; onClosed: () => void }) {
  const s = table.session;
  const [method, setMethod] = useState<(typeof methods)[number]["value"]>("cash");
  const [amount, setAmount] = useState(s ? paiseToInput(s.due) : "");
  const [pending, start] = useTransition();

  if (!s) {
    return (
      <EmptyState
        icon={Receipt}
        title="No open bill"
        description="When guests scan this table’s QR and order, their running bill shows here."
      />
    );
  }

  const inProgress = s.orders.some((o) => ["placed", "accepted", "preparing", "ready"].includes(o.status));
  const settled = s.due === 0;

  return (
    <div className="flex flex-col gap-5">
      {s.requestTypes.length ? (
        <div className="swap-in flex items-center gap-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5">
          <BellRing className="size-5 shrink-0 text-warning" aria-hidden />
          <p className="flex-1 text-small font-medium">
            {s.requestTypes.includes("request_bill") ? "Guest asked for the bill" : "Guest is calling a waiter"}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              start(async () => {
                const r = await acknowledgeRequests(s.id);
                if (!r.ok) toast.error(r.error);
              })
            }
          >
            On my way
          </Button>
        </div>
      ) : null}

      <section aria-label="Orders" className="flex flex-col gap-3">
        {s.orders.length === 0 ? <p className="text-small text-muted">Session open, no orders yet.</p> : null}
        {s.orders.map((o) => (
          <article key={o.id} className="rounded-md border border-border">
            <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="text-small font-semibold tabular">Order #{o.orderNo}</span>
              <StatusBadge status={o.status} />
            </header>
            <ul className={cn("px-3 py-2 text-small", (o.status === "rejected" || o.status === "cancelled") && "text-muted line-through")}>
              {o.items.map((i, idx) => (
                <li key={idx} className="flex gap-2 py-0.5">
                  <span className="w-6 text-muted tabular">{i.qty}×</span>
                  <span className="min-w-0 flex-1">
                    {i.name}
                    {i.variant ? <span className="text-muted"> · {i.variant}</span> : null}
                    {i.addons.length ? <span className="block text-caption text-muted">+ {i.addons.join(", ")}</span> : null}
                  </span>
                  <span className="tabular">{formatInr(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <dl className="grid grid-cols-2 gap-y-1.5 rounded-md bg-surface-2 p-3 text-small">
        <dt className="text-muted">Billed (incl. tax)</dt>
        <dd className="text-right tabular">{formatInr(s.billed)}</dd>
        <dt className="text-muted">Paid</dt>
        <dd className="text-right tabular">{formatInr(s.paid)}</dd>
        <dt className="font-semibold">Due</dt>
        <dd className="text-right font-display text-h2 font-bold tabular">{formatInr(s.due)}</dd>
      </dl>

      {s.payments.length ? (
        <ul className="flex flex-col gap-1 text-small">
          {s.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <CircleCheck className={cn("size-4", p.status === "captured" ? "text-success" : "text-muted")} aria-hidden />
              <span>{methodLabel[p.method] ?? p.method}</span>
              <span className="text-muted">· {p.status}</span>
              <span className="ml-auto tabular">{formatInr(p.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {role !== "kitchen" && !settled ? (
        <form
          className="flex flex-col gap-3 rounded-md border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const paise = parseInr(amount);
            if (!paise) return toast.error("Enter the amount received.");
            start(async () => {
              const r = await recordPayment(s.id, { method, amount: paise });
              if (r.ok) toast.success(`${formatInr(paise)} recorded`);
              else toast.error(r.error);
            });
          }}
        >
          <p className="text-small font-semibold">Settle at the table</p>
          <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={method === m.value}
                onClick={() => setMethod(m.value)}
                className={cn(
                  "press flex h-11 items-center justify-center gap-1.5 rounded-md border text-small font-semibold transition-colors duration-[var(--motion-fast)]",
                  method === m.value ? "border-primary bg-primary-soft text-primary" : "border-border-strong",
                )}
              >
                <m.icon className="size-4" aria-hidden /> {m.label}
              </button>
            ))}
          </div>
          <Field label="Amount received (₹)" helper="Split bills: record each part separately.">
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Button type="submit" variant="secondary" loading={pending}>
            Record payment
          </Button>
        </form>
      ) : null}

      <Button
        size="lg"
        disabled={!settled || inProgress}
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await closeSession(s.id);
            if (r.ok) {
              toast.success(`Table ${table.label} closed`, {
                action: r.data?.invoiceId
                  ? { label: "Invoice", onClick: () => window.open(`/api/invoices/${r.data!.invoiceId}`, "_blank") }
                  : undefined,
              });
              onClosed();
            } else toast.error(r.error);
          })
        }
      >
        Close table
      </Button>
      <p className="-mt-3 text-center text-caption text-muted">
        {inProgress ? "Serve or cancel open orders first." : !settled ? "Collect the amount due to close." : "Creates the GST invoice and frees the table."}
      </p>
      <Link href="/app/orders" className="text-center text-small font-semibold text-primary">
        Go to live orders
      </Link>
    </div>
  );
}
