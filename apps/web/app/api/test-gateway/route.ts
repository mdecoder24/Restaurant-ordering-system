import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { getGateway } from "@/lib/payments";
import { fakeSignature } from "@/lib/payments/fake";
import { applyGatewayEvent } from "@/lib/payments/settle";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ payment_id: z.uuid(), outcome: z.enum(["success", "failure"]) });

/**
 * Local test gateway only (no money moves). Simulates the hosted checkout result and the
 * webhook that follows. 404s whenever the real gateway is configured.
 */
export async function POST(request: Request) {
  if (getGateway()?.name !== "fake") return fail(404, "not_found", "Not found.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Bad request.");
  const admin = createAdminClient();
  const { data: p } = await admin.from("payments").select("id, outlet_id, session_id, provider_order_id, amount").eq("id", parsed.data.payment_id).maybeSingle();
  if (!p?.provider_order_id || (await provenSessionId(p.outlet_id)) !== p.session_id) return fail(404, "not_found", "Payment not found.");
  const providerPaymentId = `fake_pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
  const eventId = crypto.randomUUID();
  if (parsed.data.outcome === "failure") {
    await applyGatewayEvent("fake", { kind: "failed", eventId, providerOrderId: p.provider_order_id, providerPaymentId, raw: { test: true } });
    return ok({ status: "failed" });
  }
  await applyGatewayEvent("fake", { kind: "captured", eventId, providerOrderId: p.provider_order_id, providerPaymentId, amount: p.amount, method: "upi", raw: { test: true } });
  return ok({ status: "captured", provider_payment_id: providerPaymentId, signature: fakeSignature(p.provider_order_id, providerPaymentId) });
}
