"use client";

import type { Database } from "@krudex/core/db-types";
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicConfig } from "./config";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client for realtime subscriptions; one instance per tab. */
export function getBrowserClient() {
  if (!client) {
    const { url, anonKey } = supabasePublicConfig();
    client = createBrowserClient<Database>(url, anonKey);
  }
  return client;
}
