"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { useBroadcast, type ConnectionState } from "./use-channel";

/**
 * Staff screens rendered on the server: refresh the route (debounced) whenever an outlet
 * event arrives or the socket reconnects. Returns the connection state for a banner.
 */
export function useStaffLiveRefresh(
  outletId: string,
  channels: ("orders" | "tables")[],
  onEvent?: (event: string, payload: Record<string, unknown>) => void,
): ConnectionState {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Browser-only; on the server render this component never subscribes.
  const client = useMemo(() => (typeof window === "undefined" ? null : getBrowserClient()), []);
  const refresh = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 150);
  };
  return useBroadcast({
    client,
    topics: channels.map((c) => `outlet:${outletId}:${c}`),
    onEvent: (_topic, event, payload) => {
      onEvent?.(event, payload);
      refresh();
    },
    onResync: refresh,
  });
}
