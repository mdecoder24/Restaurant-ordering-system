import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireServerEnv } from "@/lib/env.server";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function hmac(value: string) {
  return createHmac("sha256", requireServerEnv("GUEST_SESSION_SECRET")).update(value).digest("base64url");
}

/** Cookie value proving the bearer joined this session: "<sessionId>.<hmac>". */
export function signSessionCookie(sessionId: string) {
  return `${sessionId}.${hmac(`session:${sessionId}`)}`;
}

export function verifySessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const expected = Buffer.from(hmac(`session:${id}`));
  const given = Buffer.from(value.slice(dot + 1));
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}

/**
 * Short-lived Supabase JWT that lets a guest listen to exactly one realtime topic,
 * session:<id> (enforced by private.can_listen). Role "authenticated" with a random sub
 * that matches no member, so every table policy still denies it.
 */
export function guestRealtimeToken(sessionId: string, ttlSeconds = 60 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      aud: "authenticated",
      role: "authenticated",
      sub: crypto.randomUUID(),
      krudex_session: sessionId,
      iat: now,
      exp: now + ttlSeconds,
    }),
  );
  const sig = createHmac("sha256", requireServerEnv("SUPABASE_JWT_SECRET")).update(`${header}.${payload}`).digest("base64url");
  return { token: `${header}.${payload}.${sig}`, expiresAt: (now + ttlSeconds) * 1000 };
}
