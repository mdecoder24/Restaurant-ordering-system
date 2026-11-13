export type CreatedGatewayOrder = { providerOrderId: string };

export type GatewayEvent =
  | { kind: "captured"; eventId: string; providerOrderId: string; providerPaymentId: string; amount: number; method: string | null; raw: unknown }
  | { kind: "failed"; eventId: string; providerOrderId: string; providerPaymentId: string; raw: unknown }
  | { kind: "refunded"; eventId: string; providerRefundId: string; providerPaymentId: string; amount: number; raw: unknown }
  | { kind: "ignored"; eventId: string };

/** One gateway behind an interface (Architecture §9); Razorpay in production. */
export interface PaymentGateway {
  name: "razorpay" | "fake";
  /** Public key for the browser checkout (Razorpay key_id). */
  publicKey: string | null;
  createOrder(input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<CreatedGatewayOrder>;
  verifyCheckout(input: { providerOrderId: string; providerPaymentId: string; signature: string }): boolean;
  refund(input: { providerPaymentId: string; amount: number; notes: Record<string, string> }): Promise<{ providerRefundId: string }>;
}
