import "server-only";
import { serverEnv } from "@/lib/env.server";
import { fakeGateway } from "./fake";
import { razorpayGateway } from "./razorpay";
import type { PaymentGateway } from "./types";

/** Razorpay when keys are configured; otherwise the local test gateway outside production. */
export function getGateway(): PaymentGateway | null {
  if (serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET) {
    return razorpayGateway(serverEnv.RAZORPAY_KEY_ID, serverEnv.RAZORPAY_KEY_SECRET);
  }
  if (process.env.NODE_ENV !== "production" || serverEnv.PAYMENTS_FAKE === "true") return fakeGateway;
  return null;
}

export type { PaymentGateway } from "./types";
