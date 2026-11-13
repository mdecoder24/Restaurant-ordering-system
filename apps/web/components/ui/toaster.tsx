"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { Toaster as Sonner } from "sonner";

/**
 * One toaster per surface. Guest passes `visibleToasts={1}` (one at a time, Design System §6).
 * Sonner pauses timers on hidden tabs and supports swipe-to-dismiss.
 */
export function Toaster({ visibleToasts = 3 }: { visibleToasts?: number }) {
  return (
    <Sonner
      position="bottom-center"
      duration={4000}
      visibleToasts={visibleToasts}
      gap={8}
      offset={{ bottom: "calc(16px + env(safe-area-inset-bottom))" }}
      mobileOffset={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
      icons={{
        success: <CircleCheck className="size-5 text-success" aria-hidden />,
        error: <CircleAlert className="size-5 text-danger" aria-hidden />,
        info: <Info className="size-5 text-info" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[min(380px,calc(100vw-32px))] items-start gap-3 rounded-md border border-border bg-surface p-3.5 pr-4 text-text shadow-lg",
          title: "text-small font-semibold",
          description: "text-small text-muted mt-0.5",
          actionButton:
            "press ml-auto shrink-0 rounded-sm bg-surface-2 px-2.5 py-1 text-small font-semibold text-text",
          icon: "mt-px",
        },
      }}
    />
  );
}

export { toast } from "sonner";
