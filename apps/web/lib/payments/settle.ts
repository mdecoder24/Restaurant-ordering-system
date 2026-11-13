import "server-only";
import { transition } from "@/lib/guest/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GatewayEvent } from "./types";

export type ApplyResult = "applied" | "duplicate" | "unknown_payment" | "ignored";

/**
 * The webhook is the source of truth (AGENTS.md rule 4). Idempotent: each event id is
 * recorded once, and state only moves forward (captured never goes back to failed).
 */
export async function applyGatewayEvent(provider: string, event: GatewayEvent): Promise<ApplyResult> {
  const admin = createAdminClient();
  const { error: seen } = await admin.from("webhook_events").insert({ id: `${provider}:${event.eventId}`, provider, event: event.kind });
  if (seen?.code === "23505") return "duplicate";
  if (event.kind === "ignored") return "ignored";

  if (event.kind === "refunded") {
    const { data: refund } = await admin.from("refunds").select("id").eq("provider_refund_id", event.providerRefundId).maybeSingle();
    if (!refund) return "unknown_payment";
    await admin.rpc("apply_refund", { p_refund: refund.id });
    return "applied";
  }

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, session_id, outlet_id, amount")
    .eq("provider_order_id", event.providerOrderId)
    .maybeSingle();
  if (!payment) return "unknown_payment";

  if (event.kind === "failed") {
    // Out-of-order delivery: a late "failed" must not undo a capture.
    if (payment.status === "created" || payment.status === "authorized") {
      await admin.from("payments").update({ status: "failed", provider_payment_id: event.providerPaymentId, raw: event.raw as never }).eq("id", payment.id);
    }
    return "applied";
  }

  if (payment.status !== "captured" && payment.status !== "refunded") {
    const method = event.method === "upi" ? "upi" : event.method === "card" ? "card" : "online";
    await admin
      .from("payments")
      .update({ status: "captured", provider_payment_id: event.providerPaymentId, method, raw: event.raw as never })
      .eq("id", payment.id);
    await afterCapture(payment.session_id, payment.outlet_id);
  }
  return "applied";
}

/** Canteen prepaid orders are held at "placed" until payment is captured (C-04, Arch §6). */
async function afterCapture(sessionId: string, outletId: string) {
  const admin = createAdminClient();
  const { data: outlet } = await admin.from("outlets").select("mode, payment_options, auto_accept").eq("id", outletId).single();
  const prepaid = outlet?.mode === "canteen" && (outlet.payment_options as { prepaid_only?: boolean } | null)?.prepaid_only;
  if (!prepaid) return;
  const { data: held } = await admin.from("orders").select("id").eq("session_id", sessionId).eq("status", "placed");
  for (const o of held ?? []) await transition(o.id, "placed", "accepted", { type: "system" });
}
