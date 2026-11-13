import "server-only";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { fakeGateway } from "./fake";
import { razorpayGateway } from "./razorpay";
import type { PaymentGateway } from "./types";

/**
 * The test gateway lets anyone holding a bill mark it paid, so it may only ever run on a
 * developer machine: never on a public host, whatever PAYMENTS_FAKE says.
 */
function testGatewayAllowed() {
  const host = new URL(clientEnv.NEXT_PUBLIC_APP_URL).hostname;
  const local = host === "localhost" || host === "127.0.0.1";
  return local && (process.env.NODE_ENV !== "production" || serverEnv.PAYMENTS_FAKE === "true");
}

/** Razorpay when keys are configured; otherwise the local test gateway on localhost only. */
export function getGateway(): PaymentGateway | null {
  if (serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET) {
    return razorpayGateway(serverEnv.RAZORPAY_KEY_ID, serverEnv.RAZORPAY_KEY_SECRET);
  }
  return testGatewayAllowed() ? fakeGateway : null;
}

export type { PaymentGateway } from "./types";
