import { placeOrderSchema } from "@krudex/core/schemas";
import { headers } from "next/headers";
import { z } from "zod";
import { fail, ok, rateLimited } from "@/lib/api/respond";
import { openOrJoinSession, resolveQr, setGuestSessionCookie } from "@/lib/guest/context";
import { transition } from "@/lib/guest/orders";
import { priceCart } from "@/lib/guest/pricing";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = placeOrderSchema.extend({ qr: z.string().min(16).max(64) });
const keySchema = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);

/**
 * Place an order (G-07). Requires an Idempotency-Key header: retries after a network drop
 * return the original order, never a duplicate (Flow §3). Prices are recomputed here.
 */
export async function POST(request: Request) {
  const key = keySchema.safeParse(request.headers.get("idempotency-key"));
  if (!key.success) return fail(400, "idempotency_key_required", "Missing Idempotency-Key header.");

  const ip = clientIp(await headers());
  const ipLimit = rateLimit(`order:ip:${ip}`, 20, 60_000);
  if (!ipLimit.ok) return rateLimited(ipLimit.retryAfterSeconds);

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "invalid_request", "Your cart couldn’t be read. Refresh and try again.");

  const ctx = await resolveQr(body.data.qr);
  if (ctx.status === "invalid") return fail(404, "invalid_qr", "This QR code isn’t active. Ask staff for a new code.");
  if (ctx.status === "closed") return fail(409, "outlet_closed", "We’re not taking orders right now.");

  // Replays of a key we've already processed return the original order before any checks
  // that might have changed since (e.g. an item selling out after the first attempt).
  const admin = createAdminClient();
  const { data: prior } = await admin.from("orders").select("id, order_no, session_id, outlet_id").eq("idempotency_key", key.data).maybeSingle();
  if (prior) {
    if (prior.outlet_id !== ctx.outlet.id) return fail(409, "idempotency_conflict", "Refresh and try again.");
    await setGuestSessionCookie(ctx.outlet.id, prior.session_id);
    return ok({ order_id: prior.id, order_no: prior.order_no, replayed: true }, 200);
  }

  const priced = await priceCart(ctx.outlet, body.data.lines);
  if (!priced.ok) return fail(409, priced.error.code, priced.error.message, { item_id: priced.error.itemId });

  const sessionId = await openOrJoinSession(ctx);
  const sessionLimit = rateLimit(`order:session:${sessionId}`, 10, 60_000);
  if (!sessionLimit.ok) return rateLimited(sessionLimit.retryAfterSeconds);

  const { data, error } = await admin
    .rpc("place_order", {
      p_session: sessionId,
      p_idempotency_key: key.data,
      p_note: (body.data.note ?? null) as string,
      p_totals: {
        subtotal: priced.bill.subtotal,
        serviceCharge: priced.bill.serviceCharge,
        tax: priced.bill.tax,
        rounding: priced.bill.rounding,
        total: priced.bill.total,
      },
      p_items: priced.lines,
    })
    .single();
  if (error || !data) return fail(500, "order_failed", "We couldn’t place your order. Try again; you won’t be charged twice.");
  await setGuestSessionCookie(ctx.outlet.id, sessionId);

  // Auto-accept is an outlet setting; canteen prepaid orders wait for payment (Arch §6).
  const prepaidHold = ctx.outlet.mode === "canteen" && ctx.outlet.paymentOptions.prepaid_only;
  if (data.created && ctx.outlet.autoAccept && !prepaidHold) {
    await transition(data.order_id, "placed", "accepted", { type: "system" });
  }

  return ok({ order_id: data.order_id, order_no: data.order_no, replayed: !data.created }, data.created ? 201 : 200);
}
