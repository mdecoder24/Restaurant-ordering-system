"use client";

import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Drawer } from "vaul";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

type SheetProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Sticky footer, e.g. the "Add ₹X" action. */
  footer?: ReactNode;
  /** Hide the visible header, keeping the title for screen readers (e.g. image-led item sheet). */
  hideHeader?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Bottom sheet on phones, side drawer from md up (Design System §6).
 * Vaul gives drag-to-dismiss with velocity, focus trap and Escape for free.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  hideHeader,
  className,
  children,
}: SheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={desktop ? "right" : "bottom"}
      repositionInputs={false}
      // Move focus into the sheet for keyboard and screen-reader users; the first focusable is
      // the Close button, so no on-screen keyboard pops up on phones.
      autoFocus
    >
      {trigger ? <Drawer.Trigger asChild>{trigger}</Drawer.Trigger> : null}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[var(--z-sheet)] bg-overlay" />
        <Drawer.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "fixed z-[var(--z-sheet)] flex flex-col bg-surface outline-none",
            desktop
              ? "inset-y-2 right-2 w-[min(440px,calc(100vw-16px))] rounded-lg shadow-lg"
              : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-lg shadow-sheet",
            className,
          )}
        >
          {desktop ? null : (
            <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-pill bg-border-strong" />
          )}
          <div
            className={cn(
              "flex items-start justify-between gap-3 px-5 pt-3 pb-2",
              hideHeader && "sr-only",
            )}
          >
            <div className="min-w-0">
              <Drawer.Title className="text-h2 font-semibold tracking-tight">{title}</Drawer.Title>
              {description ? (
                <Drawer.Description className="mt-0.5 text-small text-muted">
                  {description}
                </Drawer.Description>
              ) : null}
            </div>
            <Drawer.Close asChild>
              <IconButton aria-label="Close" size="sm" className="-mr-2 rounded-full">
                <X />
              </IconButton>
            </Drawer.Close>
          </div>
          {/* data-vaul-no-drag lets content scroll without dragging the sheet. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4" data-vaul-no-drag={desktop || undefined}>
            {children}
          </div>
          {footer ? (
            <div className="border-t border-border bg-surface px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export const SheetClose = Drawer.Close as (props: ComponentProps<typeof Drawer.Close>) => ReactNode;
