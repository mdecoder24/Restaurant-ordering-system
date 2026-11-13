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
  isPrivate = true,
}: {
  client: SupabaseClient | null;
  topics: string[];
  onEvent: (topic: string, event: string, payload: Record<string, unknown>) => void;
  onResync?: () => void;
  enabled?: boolean;
  /** Only the canteen pickup topic is public (token numbers only). */
  isPrivate?: boolean;
}): ConnectionState {
  const [state, setState] = useState<ConnectionState>("online");
  const handlers = useRef({ onEvent, onResync });
  useEffect(() => {
    handlers.current = { onEvent, onResync };
  });
  const key = topics.join("|");

  useEffect(() => {
    if (!client || !enabled || !key) return;
    // Callbacks from channels torn down by this effect's cleanup (Strict Mode remounts, outlet
    // switches) arrive after the replacement subscribes; `active` drops them so a stale CLOSED
    // can't leave the banner stuck on "Reconnecting".
    let active = true;
    const topicList = key.split("|");
    // One status per topic; the screen is only "online" when every topic is subscribed.
    const status = new Map<string, "up" | "down">();
    const joinedOnce = new Set<string>();
    const publish = () => {
      if (!active) return;
      if (!navigator.onLine) return setState("offline");
      setState(topicList.every((t) => status.get(t) === "up") ? "online" : "reconnecting");
    };
    const channels: RealtimeChannel[] = topicList.map((topic) =>
      client
        .channel(topic, { config: { private: isPrivate } })
        .on("broadcast", { event: "*" }, (msg) => {
          if (active) handlers.current.onEvent(topic, msg.event, (msg.payload ?? {}) as Record<string, unknown>);
        })
        .subscribe((s) => {
          if (!active) return;
          if (s === "SUBSCRIBED") {
            status.set(topic, "up");
            // Events missed while this topic was down are never replayed: reload state.
            if (joinedOnce.has(topic)) handlers.current.onResync?.();
            joinedOnce.add(topic);
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            status.set(topic, "down");
          }
          publish();
        }),
    );
    const offline = () => {
      if (active) setState("offline");
    };
    const online = () => {
      publish();
      handlers.current.onResync?.();
    };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      active = false;
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
      for (const c of channels) void client.removeChannel(c);
    };
  }, [client, key, enabled, isPrivate]);

  return state;
}
