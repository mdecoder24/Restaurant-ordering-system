import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, rateLimited } from "@/lib/api/respond";
import { currentGuestSession } from "@/lib/guest/context";
import { getGateway } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({ outlet_id: z.uuid() });
const keySchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);

/**
 * Create a gateway order for the session's amount due (Architecture §9 step 1–2).
 * The amount comes from the database, never from the client.
 */
export async function POST(request: Request) {
  const key = keySchema.safeParse(request.headers.get("idempotency-key"));
  if (!key.success) return fail(400, "idempotency_key_required", "Missing Idempotency-Key header.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Missing outlet.");
  const limit = rateLimit(`pay:${clientIp(await headers())}`, 10, 60_000);
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const session = await currentGuestSession(parsed.data.outlet_id);
  if (!session) return fail(401, "no_session", "This bill is closed. Ask staff for help.");
  const gateway = getGateway();
  const admin = createAdminClient();
  const { data: outlet } = await admin.from("outlets").select("tenant_id, name, payment_options").eq("id", session.outlet_id).single();
  if (!outlet) return fail(404, "not_found", "Outlet not found.");
  if (!gateway || !(outlet.payment_options as { online?: boolean } | null)?.online) {
    return fail(409, "online_disabled", "Online payment isn’t available here. Please pay at the counter.");
  }

  const { data: existing } = await admin.from("payments").select("id, provider_order_id, amount, status").eq("idempotency_key", key.data).maybeSingle();
  if (existing) {
    return ok({ payment_id: existing.id, provider: gateway.name, key_id: gateway.publicKey, provider_order_id: existing.provider_order_id, amount: existing.amount, name: outlet.name });
  }

  const { data: bal } = await admin.rpc("session_balance", { p_session: session.id }).single();
  if (!bal || bal.due <= 0) return fail(409, "nothing_due", "Nothing is due on this bill.");

  let providerOrderId: string;
  try {
    ({ providerOrderId } = await gateway.createOrder({ amount: bal.due, receipt: session.id.slice(0, 32), notes: { session_id: session.id } }));
  } catch {
    return fail(502, "gateway_error", "The payment service didn’t respond. Try again or pay at the counter.");
  }
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      tenant_id: outlet.tenant_id,
      outlet_id: session.outlet_id,
      session_id: session.id,
      method: "online",
      provider: gateway.name,
      provider_order_id: providerOrderId,
      amount: bal.due,
      status: "created",
      idempotency_key: key.data,
    })
    .select("id")
    .single();
  if (error) return fail(500, "payment_failed", "Couldn’t start the payment. Try again.");
  return ok(
    { payment_id: payment.id, provider: gateway.name, key_id: gateway.publicKey, provider_order_id: providerOrderId, amount: bal.due, name: outlet.name },
    201,
  );
}
