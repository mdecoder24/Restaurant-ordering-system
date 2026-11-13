import { serviceRequestSchema } from "@krudex/core/schemas";
import { z } from "zod";
import { fail, ok, rateLimited } from "@/lib/api/respond";
import { currentGuestSession } from "@/lib/guest/context";
import { rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const body = serviceRequestSchema.extend({ outlet_id: z.uuid() });

/** Call waiter / request bill (G-15). One open request of each type per session. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Unknown request.");
  const session = await currentGuestSession(parsed.data.outlet_id);
  if (!session) return fail(401, "no_session", "Place an order first, then you can call staff.");
  const limit = rateLimit(`svc:${session.id}`, 6, 5 * 60_000);
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const admin = createAdminClient();
  const { data: open } = await admin
    .from("service_requests")
    .select("id")
    .eq("session_id", session.id)
    .eq("type", parsed.data.type)
    .eq("status", "open")
    .maybeSingle();
  if (!open) {
    const { data: s } = await admin.from("table_sessions").select("tenant_id, outlet_id, table_id").eq("id", session.id).single();
    const { error } = await admin.from("service_requests").insert({
      tenant_id: s!.tenant_id,
      outlet_id: s!.outlet_id,
      session_id: session.id,
      table_id: s!.table_id,
      type: parsed.data.type,
    });
    if (error) return fail(500, "request_failed", "Couldn’t reach staff. Try again.");
  }
  if (parsed.data.type === "request_bill" && session.table_id) {
    await admin.from("tables").update({ status: "bill_requested" }).eq("id", session.table_id);
  }
  return ok({ status: "sent" }, 201);
}
