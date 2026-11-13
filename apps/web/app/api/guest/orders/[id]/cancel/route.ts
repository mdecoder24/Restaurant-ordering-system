import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { provenSessionId } from "@/lib/guest/context";
import { transition } from "@/lib/guest/orders";
import { createAdminClient } from "@/lib/supabase/admin";

/** Guests may cancel only while the order is still "placed" (Architecture §6). */
export async function POST(_: Request, { params }: RouteContext<"/api/guest/orders/[id]/cancel">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found", "Order not found.");
  const { data: o } = await createAdminClient().from("orders").select("outlet_id, session_id, status").eq("id", id).maybeSingle();
  if (!o || (await provenSessionId(o.outlet_id)) !== o.session_id) return fail(404, "not_found", "Order not found.");
  if (o.status !== "placed") return fail(409, "not_cancellable", "The kitchen has already accepted this order. Ask staff to help.");
  const r = await transition(id, "placed", "cancelled", { type: "guest" }, "Cancelled by guest");
  if (!r.ok) return fail(409, "not_cancellable", "The kitchen has already accepted this order. Ask staff to help.");
  return ok({ status: "cancelled" });
}
