"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { controlBase, useField } from "./field";

export function Input({ className, id, type = "text", ...props }: ComponentProps<"input">) {
  const field = useField();
  return (
    <input
      type={type}
      id={id ?? field?.controlId}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
      // 16px minimum stops iOS Safari zooming the page on focus.
      className={cn(controlBase, "h-[var(--control-h)] px-3 text-[max(16px,var(--text-body))]", className)}
      {...props}
    />
  );
}
