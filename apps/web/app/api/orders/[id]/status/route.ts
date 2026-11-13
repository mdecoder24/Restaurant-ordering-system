import { statusChangeSchema } from "@krudex/core/schemas";
import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { staffForApi } from "@/lib/auth/dal";
import { staffTransition } from "@/lib/orders/staff-transition";

/** PATCH { to, reason? }: the only way staff change an order's status. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/orders/[id]/status">) {
  const staff = await staffForApi(["owner", "manager", "waiter", "kitchen"]);
  if (!staff) return fail(401, "unauthorized", "Sign in again.");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found", "Order not found.");
  const body = statusChangeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail(400, "invalid_request", "Unknown status.");
  const r = await staffTransition(staff, id, body.data.to, body.data.reason);
  return r.ok ? ok({ id, status: body.data.to }) : fail(r.status, r.code, r.message);
}
