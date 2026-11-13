"use server";

import { uuid } from "@krudex/core/schemas";
import { refresh } from "next/cache";
import { z } from "zod";
import { actionStaff, isResult, type ActionResult } from "@/lib/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getGateway } from ".";

const schema = z.object({ amount: z.number().int().min(1), reason: z.string().trim().min(1, "Add a reason").max(200) });

/**
 * Refunds (D-07). Gateway refunds are confirmed by webhook; manual (cash/terminal) and
 * test-gateway refunds settle immediately. Owners and managers only.
 */
export async function refundPayment(paymentId: string, input: z.infer<typeof schema>): Promise<ActionResult> {
  const staff = await actionStaff(["owner", "manager"]);
  if (isResult(staff)) return staff;
  const parsed = schema.safeParse(input);
  if (!parsed.success || !uuid.safeParse(paymentId).success) return { ok: false, error: parsed.success ? "Unknown payment." : (parsed.error.issues[0]?.message ?? "Check the amount.") };

  // RLS read: proves the payment is in this staff member's outlet scope.
  const { data: p } = await (await createClient())
    .from("payments")
    .select("id, tenant_id, amount, refunded_amount, status, provider, provider_payment_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!p || (p.status !== "captured" && p.status !== "refunded")) return { ok: false, error: "Only captured payments can be refunded." };

  const admin = createAdminClient();
  const { data: pending } = await admin.from("refunds").select("amount").eq("payment_id", p.id).eq("status", "pending");
  const refundable = p.amount - p.refunded_amount - (pending ?? []).reduce((s, r) => s + r.amount, 0);
  if (parsed.data.amount > refundable) return { ok: false, error: "That’s more than can be refunded." };

  let providerRefundId: string | null = null;
  if (p.provider !== "manual") {
    const gateway = getGateway();
    if (!gateway || gateway.name !== p.provider || !p.provider_payment_id) return { ok: false, error: "The payment gateway isn’t available. Try again later." };
    try {
      ({ providerRefundId } = await gateway.refund({ providerPaymentId: p.provider_payment_id, amount: parsed.data.amount, notes: { reason: parsed.data.reason } }));
    } catch {
      return { ok: false, error: "The gateway rejected the refund. Try again or check the gateway dashboard." };
    }
  }
  const { data: refund, error } = await admin
    .from("refunds")
    .insert({ tenant_id: p.tenant_id, payment_id: p.id, amount: parsed.data.amount, provider_refund_id: providerRefundId, reason: parsed.data.reason, created_by: staff.memberId })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Couldn’t record the refund." };
  if (p.provider === "manual" || p.provider === "fake") await admin.rpc("apply_refund", { p_refund: refund.id });
  refresh();
  return { ok: true };
}
