import { fail, ok } from "@/lib/api/respond";
import { serverEnv } from "@/lib/env.server";
import { parseRazorpayEvent, verifyRazorpayWebhook } from "@/lib/payments/razorpay";
import { applyGatewayEvent } from "@/lib/payments/settle";

/**
 * Razorpay webhooks: verify the signature over the raw body, then apply idempotently
 * (AGENTS.md rule 4). Duplicates and replays return 200 so Razorpay stops retrying.
 */
export async function POST(request: Request) {
  const secret = serverEnv.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return fail(503, "not_configured", "Webhooks are not configured.");
  const raw = await request.text();
  if (!verifyRazorpayWebhook(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return fail(401, "bad_signature", "Signature mismatch.");
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "invalid_json", "Bad payload.");
  }
  const eventId = request.headers.get("x-razorpay-event-id") ?? `${body.event}:${body.payload?.payment?.entity?.id ?? body.payload?.refund?.entity?.id ?? raw.length}`;
  const result = await applyGatewayEvent("razorpay", parseRazorpayEvent(eventId, body));
  return ok({ result });
}
