import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { staffForApi } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ status: z.enum(["pending", "done"]) });

/** Mark a single item done on the KDS (K-05). */
export async function PATCH(request: Request, { params }: RouteContext<"/api/order-items/[id]">) {
  const staff = await staffForApi(["owner", "manager", "kitchen"]);
  if (!staff) return fail(401, "unauthorized", "Sign in again.");
  const { id } = await params;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail(400, "invalid_request", "Bad request.");
  // RLS read proves the item belongs to an outlet this staff member can see.
  const { data: item } = await (await createClient()).from("order_items").select("id, orders(status)").eq("id", id).maybeSingle();
  if (!item) return fail(404, "not_found", "Item not found.");
  if (!["accepted", "preparing"].includes(item.orders?.status ?? "")) return fail(409, "order_closed", "This order has moved on.");
  const { error } = await createAdminClient().from("order_items").update({ status: parsed.data.status }).eq("id", id);
  if (error) return fail(500, "update_failed", "Couldn’t update the item.");
  return ok({ id, status: parsed.data.status });
}
