"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

type QuantityStepperProps = {
  value: number;
  onChange: (next: number) => void;
  /** Used in accessible labels, e.g. "Remove Paneer Tikka". */
  itemName: string;
  max?: number;
  size?: "md" | "lg";
  className?: string;
};

/** Minus, count, plus. At 1 the minus becomes remove (Design System §6). */
export function QuantityStepper({
  value,
  onChange,
  itemName,
  max = 99,
  size = "md",
  className,
}: QuantityStepperProps) {
  const atOne = value <= 1;
  const atMax = value >= max;
  const btn = cn(
    "press hit-area grid place-items-center rounded-pill text-primary",
    "transition-[background-color,opacity] duration-[var(--motion-fast)] ease-out",
    "hover-fine:bg-primary/10 active:bg-primary/15 disabled:opacity-35 disabled:cursor-not-allowed",
    size === "lg" ? "size-11" : "size-9",
  );
  return (
    <div
      role="group"
      aria-label={`Quantity of ${itemName}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-primary/30 bg-primary-soft p-0.5",
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value - 1)}
        aria-label={atOne ? `Remove ${itemName}` : `Decrease ${itemName}`}
      >
        {atOne ? (
          <Trash2 className="size-4" aria-hidden />
        ) : (
          <Minus className="size-4" strokeWidth={2.5} aria-hidden />
        )}
      </button>
      <output
        aria-live="polite"
        className={cn(
          "tabular min-w-7 text-center font-semibold text-primary",
          size === "lg" ? "text-h2" : "text-body",
        )}
      >
        <span key={value} className="count-tick inline-block">
          {value}
        </span>
      </output>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label={`Increase ${itemName}`}
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
