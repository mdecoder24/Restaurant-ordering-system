import { z } from "zod";

/**
 * Public env: safe for the browser. Only NEXT_PUBLIC_* names belong here, and each is
 * referenced literally so Next can inline it at build time.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_ENABLE_PREVIEW: z.enum(["true", "false"]).default("false"),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_ENABLE_PREVIEW: process.env.NEXT_PUBLIC_ENABLE_PREVIEW,
});

/** The component preview is a dev tool; it is on in development unless explicitly disabled. */
export const previewEnabled =
  process.env.NODE_ENV !== "production" || clientEnv.NEXT_PUBLIC_ENABLE_PREVIEW === "true";
