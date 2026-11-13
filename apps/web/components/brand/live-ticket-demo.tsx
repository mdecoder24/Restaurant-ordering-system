"use client";

import { formatDuration, formatInr } from "@krudex/core/format";
import type { OrderStatus } from "@krudex/core/order-status";
import { useEffect, useState } from "react";
import { DietMark } from "@/components/ui/diet-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

/**
 * Marketing illustration only: a looping example ticket that shows the order lifecycle.
 * Not order data (AGENTS.md rule 11) — it is labelled as an example and never fetched.
 */
const steps: OrderStatus[] = ["placed", "accepted", "preparing", "ready", "served"];
const lines = [
  { name: "Masala dosa", qty: 2, paise: 18000, veg: true },
  { name: "Filter coffee", qty: 2, paise: 6000, veg: true },
  { name: "Chicken 65", qty: 1, paise: 26000, veg: false },
];
const total = lines.reduce((sum, l) => sum + l.qty * l.paise, 0);
const STEP_MS = 2400;

export function LiveTicketDemo({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Ticks pause on hidden tabs so the loop never races ahead off-screen.
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setSeconds((s) => s + 1);
    }, 1000);
    const stepId = window.setInterval(() => {
      if (document.hidden) return;
      setStep((s) => {
        const next = (s + 1) % steps.length;
        if (next === 0) setSeconds(0);
        return next;
      });
    }, STEP_MS);
    return () => {
      window.clearInterval(id);
      window.clearInterval(stepId);
    };
  }, []);

  const status = steps[step] ?? "placed";

  return (
    <figure
      aria-label="Example of a live order ticket"
      className={cn(
        "relative w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-lg",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="ping-ring absolute inset-0 rounded-full bg-success" />
            <span className="relative size-2.5 rounded-full bg-success" />
          </span>
          <p className="text-small font-semibold">
            Table 7 <span className="font-normal text-muted">· Example</span>
          </p>
        </div>
        <span className="font-mono text-small text-muted tabular" aria-hidden>
          {formatDuration(seconds)}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {lines.map((l) => (
          <li key={l.name} className="flex items-center gap-3 py-2.5 text-small">
            <DietMark veg={l.veg} size="sm" />
            <span className="min-w-0 flex-1 truncate font-medium">{l.name}</span>
            <span className="text-muted tabular">×{l.qty}</span>
            <span className="w-16 text-right font-medium tabular">{formatInr(l.qty * l.paise)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-small text-muted">Total</span>
        <span className="font-display text-h2 font-bold tabular">{formatInr(total)}</span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {/* Keyed so each status swaps in with a blur crossfade. */}
        <span key={status} className="swap-in">
          <StatusBadge status={status} />
        </span>
        <ol className="flex flex-1 items-center justify-end gap-1" aria-hidden>
          {steps.map((s, i) => (
            <li
              key={s}
              className={cn(
                "h-1.5 w-6 origin-left rounded-pill bg-surface-3 transition-[background-color,transform] duration-[var(--motion-slow)] ease-out",
                i <= step && "bg-primary",
                i === step && "scale-x-110",
              )}
            />
          ))}
        </ol>
      </div>
    </figure>
  );
}
