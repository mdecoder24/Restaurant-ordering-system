import "server-only";
import { NextResponse } from "next/server";

/** Route handlers return { data } or { error: { code, message } } (Architecture §7). */
export const ok = <T>(data: T, status = 200, headers?: HeadersInit) => NextResponse.json({ data }, { status, headers });

export const fail = (status: number, code: string, message: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ error: { code, message, ...extra } }, { status });

export const rateLimited = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: { code: "rate_limited", message: "Too many requests. Wait a moment and try again." } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
