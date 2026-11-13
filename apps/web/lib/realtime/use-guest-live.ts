"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabasePublicConfig } from "@/lib/supabase/config";
import { useBroadcast, type ConnectionState } from "./use-channel";

/**
 * Guest realtime: fetches a short-lived token for the guest's own session channel and
 * subscribes with it (Architecture §4). Guests never get a database session.
 */
export function useGuestLive(
  outletId: string,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
  onResync: () => void,
): ConnectionState {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const { url, anonKey } = supabasePublicConfig();
    const c = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "kx-guest" } });
    const authorise = async () => {
      try {
        const res = await fetch("/api/guest/realtime-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outlet_id: outletId }),
        });
        if (!res.ok) {
          // 4xx: no session for this guest (nothing to follow yet). 5xx/429: retry with backoff,
          // otherwise the tracker would silently stop updating while showing "online".
          if (res.status >= 500 || res.status === 429) timer = setTimeout(authorise, 10_000);
          return;
        }
        const { data } = (await res.json()) as { data: { token: string; expiresAt: number; session_id: string } };
        if (cancelled) return;
        await c.realtime.setAuth(data.token);
        setSessionId(data.session_id);
        setClient(c);
        // Renew a few minutes before expiry.
        timer = setTimeout(authorise, Math.max(60_000, data.expiresAt - Date.now() - 5 * 60_000));
      } catch {
        timer = setTimeout(authorise, 5_000);
      }
    };
    void authorise();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void c.removeAllChannels();
    };
  }, [outletId]);

  return useBroadcast({
    client,
    topics: sessionId ? [`session:${sessionId}`] : [],
    enabled: Boolean(sessionId),
    onEvent: (_t, event, payload) => onEvent(event, payload),
    onResync,
  });
}
