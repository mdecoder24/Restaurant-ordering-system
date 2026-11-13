import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { guestRealtimeToken } from "@/lib/guest/crypto";

const body = z.object({ outlet_id: z.uuid() });

/** Short-lived token for the guest's own session channel only (Architecture §4, §8). */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Missing outlet.");
  const sessionId = await provenSessionId(parsed.data.outlet_id);
  if (!sessionId) return fail(401, "no_session", "Scan your table’s QR code again.");
  return ok({ ...guestRealtimeToken(sessionId), session_id: sessionId }, 200, { "Cache-Control": "no-store" });
}
