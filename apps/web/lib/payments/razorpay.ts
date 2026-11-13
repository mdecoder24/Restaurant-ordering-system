import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayEvent, PaymentGateway } from "./types";

const API = "https://api.razorpay.com/v1";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function razorpayGateway(keyId: string, keySecret: string): PaymentGateway {
  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const call = async <T>(path: string, body: unknown): Promise<T> => {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json()) as T & { error?: { description?: string } };
    if (!res.ok) throw new Error(`Razorpay ${path} failed: ${json.error?.description ?? res.status}`);
    return json;
  };
  return {
    name: "razorpay",
    publicKey: keyId,
    async createOrder({ amount, receipt, notes }) {
      const o = await call<{ id: string }>("/orders", { amount, currency: "INR", receipt, notes });
      return { providerOrderId: o.id };
    },
    verifyCheckout({ providerOrderId, providerPaymentId, signature }) {
      const expected = createHmac("sha256", keySecret).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");
      return safeEqual(expected, signature);
    },
    async refund({ providerPaymentId, amount, notes }) {
      const r = await call<{ id: string }>(`/payments/${providerPaymentId}/refund`, { amount, notes });
      return { providerRefundId: r.id };
    },
  };
}

export function verifyRazorpayWebhook(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

type RzpPayload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; method?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number } };
  };
};

/** Normalises a verified Razorpay webhook into the gateway-neutral event. */
export function parseRazorpayEvent(eventId: string, body: RzpPayload): GatewayEvent {
  const p = body.payload.payment?.entity;
  const r = body.payload.refund?.entity;
  if (body.event === "payment.captured" && p) {
    return { kind: "captured", eventId, providerOrderId: p.order_id, providerPaymentId: p.id, amount: p.amount, method: p.method ?? null, raw: body };
  }
  if (body.event === "payment.failed" && p) return { kind: "failed", eventId, providerOrderId: p.order_id, providerPaymentId: p.id, raw: body };
  if (body.event === "refund.processed" && r) return { kind: "refunded", eventId, providerRefundId: r.id, providerPaymentId: r.payment_id, amount: r.amount, raw: body };
  return { kind: "ignored", eventId };
}
