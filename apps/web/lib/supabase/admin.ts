import "server-only";
import type { Database } from "@krudex/core/db-types";
import { createClient } from "@supabase/supabase-js";
import { requireServerEnv } from "@/lib/env.server";
import { supabasePublicConfig } from "./config";

/**
 * Service-role client: bypasses RLS. Only for guest route handlers (after QR token and
 * session validation), PIN sign-in and webhooks. Never import from client code.
 */
export function createAdminClient() {
  const { url } = supabasePublicConfig();
  return createClient<Database>(url, requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
