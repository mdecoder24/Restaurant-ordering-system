import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { loadSessionBill } from "@/lib/guest/bill";

/** Running bill for the guest's session (G-09). */
export async function GET(request: Request) {
  const outlet = z.uuid().safeParse(new URL(request.url).searchParams.get("outlet"));
  if (!outlet.success) return fail(400, "invalid_request", "Missing outlet.");
  const sessionId = await provenSessionId(outlet.data);
  if (!sessionId) return fail(401, "no_session", "No orders yet.");
  return ok(await loadSessionBill(sessionId), 200, { "Cache-Control": "no-store" });
}
