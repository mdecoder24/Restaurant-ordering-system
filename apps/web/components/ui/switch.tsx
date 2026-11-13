"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "group hit-area peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-pill p-0.5",
        "bg-border-strong transition-colors duration-[var(--motion-base)] ease-out",
        "data-[state=checked]:bg-success",
        "disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-surface shadow-md",
          "transition-[transform,width] duration-[var(--motion-base)] ease-out",
          "data-[state=checked]:translate-x-4",
          // Press squish: the thumb stretches toward its destination, like iOS.
          "group-active:group-enabled:w-6 data-[state=checked]:group-active:group-enabled:translate-x-3",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
