"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { controlBase, useField } from "./field";

export function Textarea({ className, id, rows = 3, ...props }: ComponentProps<"textarea">) {
  const field = useField();
  return (
    <textarea
      rows={rows}
      id={id ?? field?.controlId}
      aria-describedby={props["aria-describedby"] ?? field?.describedBy}
      aria-invalid={props["aria-invalid"] ?? (field?.invalid || undefined)}
      className={cn(
        controlBase,
        "field-sizing-content min-h-20 resize-none px-3 py-2.5 text-[max(16px,var(--text-body))]",
        className,
      )}
      {...props}
    />
  );
}
