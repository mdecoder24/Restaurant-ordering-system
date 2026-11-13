"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "hit-area peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-pill p-0.5",
        "bg-border-strong transition-colors duration-[var(--motion-base)] ease-out",
        "data-[state=checked]:bg-success",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-surface shadow-md",
          "transition-transform duration-[var(--motion-base)] ease-out",
          "data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
