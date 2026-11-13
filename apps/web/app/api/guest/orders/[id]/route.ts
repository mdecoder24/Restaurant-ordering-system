import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { loadGuestOrder } from "@/lib/guest/orders";
import { createAdminClient } from "@/lib/supabase/admin";

/** Order and status for the guest who placed it (or shares its table session). */
export async function GET(_: Request, { params }: RouteContext<"/api/guest/orders/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found", "Order not found.");
  const { data: o } = await createAdminClient().from("orders").select("outlet_id").eq("id", id).maybeSingle();
  if (!o) return fail(404, "not_found", "Order not found.");
  const sessionId = await provenSessionId(o.outlet_id);
  const order = sessionId ? await loadGuestOrder(id, sessionId) : null;
  if (!order) return fail(404, "not_found", "Order not found.");
  return ok(order, 200, { "Cache-Control": "no-store" });
}
