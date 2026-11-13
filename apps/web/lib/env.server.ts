import "server-only";
import { z } from "zod";

/**
 * Server-only secrets (AGENTS.md rule 6). Importing this file from a client component
 * fails the build via `server-only`. Values are optional until the tasks that need them
 * (T03 Supabase, T15 Razorpay); each consumer must call `requireServerEnv`.
 */
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  GUEST_SESSION_SECRET: z.string().min(32).optional(),
  /** Signs short-lived guest realtime tokens (Architecture §4). Project JWT secret. */
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export const serverEnv: ServerEnv = serverSchema.parse(process.env);

export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv[key];
  if (value === undefined) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}
