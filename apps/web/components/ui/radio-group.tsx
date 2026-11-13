"use client";

import { RadioGroup as RadioPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioPrimitive.Root>) {
  return <RadioPrimitive.Root className={cn("grid gap-2", className)} {...props} />;
}

export function Radio({ className, ...props }: ComponentProps<typeof RadioPrimitive.Item>) {
  return (
    <RadioPrimitive.Item
      className={cn(
        "hit-area peer grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-border-strong bg-surface",
        "transition-[border-color] duration-[var(--motion-fast)] ease-out",
        "data-[state=checked]:border-primary disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="check-pop block size-2.5 rounded-full bg-primary" />
    </RadioPrimitive.Item>
  );
}
