"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Actions row: put the confirming action last. */
  actions: ReactNode;
  children?: ReactNode;
  className?: string;
};

/** Confirmations only: reject, cancel, refund (Design System §6). */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  actions,
  children,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="overlay-motion fixed inset-0 z-[var(--z-modal)] bg-overlay" />
        <DialogPrimitive.Content
          className={cn(
            "dialog-motion fixed top-1/2 left-1/2 z-[var(--z-modal)] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-surface p-6 shadow-lg outline-none",
            className,
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogPrimitive.Title className="text-h2 font-semibold tracking-tight">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1.5 text-body text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const DialogClose = DialogPrimitive.Close;
