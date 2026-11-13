import "server-only";
import { connection } from "next/server";

/** Request-time "now" for server components (opts the render out of prerendering). */
export async function requestNow(): Promise<number> {
  await connection();
  return Date.now();
}
