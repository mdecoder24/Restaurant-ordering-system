import "server-only";
import { createHmac } from "node:crypto";
import { requireServerEnv } from "@/lib/env.server";
import type { PaymentGateway } from "./types";

/**
 * Local test gateway used until Razorpay test keys are configured. It never moves money:
 * /pay/test simulates the hosted checkout and settles through the same event handler as
 * real webhooks. Disabled in production unless PAYMENTS_FAKE=true.
 */
export function fakeSignature(providerOrderId: string, providerPaymentId: string) {
  return createHmac("sha256", requireServerEnv("GUEST_SESSION_SECRET")).update(`fake|${providerOrderId}|${providerPaymentId}`).digest("hex");
}

export const fakeGateway: PaymentGateway = {
  name: "fake",
  publicKey: null,
  async createOrder() {
    return { providerOrderId: `fake_order_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}` };
  },
  verifyCheckout({ providerOrderId, providerPaymentId, signature }) {
    return fakeSignature(providerOrderId, providerPaymentId) === signature;
  },
  async refund() {
    return { providerRefundId: `fake_rfnd_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}` };
  },
};
