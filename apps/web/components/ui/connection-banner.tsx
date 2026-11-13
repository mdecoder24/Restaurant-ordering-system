"use client";

import { WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type ConnectionState = "online" | "reconnecting" | "offline";

/**
 * "Reconnecting…" strip for KDS and guest tracking (Design System §1.4: state always visible).
 * Stays mounted so the slide is a transition, and announces changes politely.
 */
export function ConnectionBanner({
  state,
  className,
}: {
  state: ConnectionState;
  className?: string;
}) {
  const visible = state !== "online";
  return (
    <div
      role="status"
      aria-live="polite"
      data-visible={visible}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[var(--motion-base)] ease-out",
        visible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 text-small font-semibold",
            state === "offline" ? "bg-danger text-on-solid" : "bg-warning text-on-solid",
          )}
        >
          {state === "offline" ? (
            <>
              <WifiOff className="size-4" aria-hidden /> You’re offline. Showing last known status.
            </>
          ) : visible ? (
            <>
              <Spinner /> Reconnecting…
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
