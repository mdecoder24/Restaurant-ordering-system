"use client";

import { Check } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Horizontally scrollable row of chips; edge fade hints that more exist. */
export function ChipGroup({
  className,
  label,
  children,
}: {
  className?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 py-1",
        "[mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-24px),transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ChipProps = Omit<ComponentProps<"button">, "onChange"> & {
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  icon?: ReactNode;
};

export function Chip({ selected, onSelectedChange, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelectedChange(!selected)}
      className={cn(
        "press hit-area inline-flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-pill border px-3.5 text-small font-medium",
        "transition-[background-color,border-color,color] duration-[var(--motion-fast)] ease-out",
        selected
          ? "border-text bg-text text-bg"
          : "border-border-strong bg-surface text-text hover-fine:bg-surface-2",
        "[&_svg]:size-4",
        className,
      )}
      {...props}
    >
      {selected ? <Check aria-hidden strokeWidth={2.5} /> : icon}
      {children}
    </button>
  );
}
