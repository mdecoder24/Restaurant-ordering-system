import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { getGateway } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  payment_id: z.uuid(),
  provider_order_id: z.string().min(1).max(100),
  provider_payment_id: z.string().min(1).max(100),
  signature: z.string().min(1).max(200),
});

/**
 * Checkout success hint (Architecture §9 step 4): marks the payment "authorized" for a fast
 * UI update. The webhook remains the source of truth for "captured".
 */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Bad payment data.");
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, outlet_id, session_id, status, provider_order_id")
    .eq("id", parsed.data.payment_id)
    .maybeSingle();
  if (!payment || payment.provider_order_id !== parsed.data.provider_order_id) return fail(404, "not_found", "Payment not found.");
  if ((await provenSessionId(payment.outlet_id)) !== payment.session_id) return fail(404, "not_found", "Payment not found.");
  const gateway = getGateway();
  if (!gateway?.verifyCheckout({ providerOrderId: parsed.data.provider_order_id, providerPaymentId: parsed.data.provider_payment_id, signature: parsed.data.signature })) {
    return fail(400, "bad_signature", "We couldn’t confirm this payment yet. If money left your account it will reflect shortly.");
  }
  if (payment.status === "created") {
    await admin.from("payments").update({ status: "authorized", provider_payment_id: parsed.data.provider_payment_id }).eq("id", payment.id).eq("status", "created");
  }
  return ok({ status: payment.status === "created" ? "authorized" : payment.status });
}
