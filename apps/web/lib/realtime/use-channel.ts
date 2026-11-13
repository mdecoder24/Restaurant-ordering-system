"use client";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

export type ConnectionState = "online" | "reconnecting" | "offline";

/**
 * Subscribes to private broadcast topics (Architecture §8). Clients load state over HTTP
 * first; this hook calls `onEvent` for each event and `onResync` after every (re)connect,
 * because events missed while disconnected are never replayed.
 */
export function useBroadcast({
  client,
  topics,
  onEvent,
  onResync,
  enabled = true,
}: {
  client: SupabaseClient | null;
  topics: string[];
  onEvent: (topic: string, event: string, payload: Record<string, unknown>) => void;
  onResync?: () => void;
  enabled?: boolean;
}): ConnectionState {
  const [state, setState] = useState<ConnectionState>("online");
  const handlers = useRef({ onEvent, onResync });
  useEffect(() => {
    handlers.current = { onEvent, onResync };
  });
  const key = topics.join("|");

  useEffect(() => {
    if (!client || !enabled || !key) return;
    let connectedOnce = false;
    const channels: RealtimeChannel[] = key.split("|").map((topic) =>
      client
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "*" }, (msg) => handlers.current.onEvent(topic, msg.event, (msg.payload ?? {}) as Record<string, unknown>))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setState("online");
            if (connectedOnce) handlers.current.onResync?.();
            connectedOnce = true;
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setState("reconnecting");
          } else if (status === "CLOSED") {
            setState(navigator.onLine ? "reconnecting" : "offline");
          }
        }),
    );
    const offline = () => setState("offline");
    const online = () => {
      setState("reconnecting");
      handlers.current.onResync?.();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      for (const c of channels) void client.removeChannel(c);
    };
  }, [client, key, enabled]);

  return state;
}
