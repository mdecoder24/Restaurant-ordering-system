import "server-only";
import type { Database } from "@krudex/core/db-types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicConfig } from "./config";

/**
 * Staff client for server components, actions and route handlers. Runs as the signed-in
 * user, so every query is subject to RLS (AGENTS.md rule 1).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicConfig();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Server components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
