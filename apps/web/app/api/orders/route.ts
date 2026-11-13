import { orderStatuses, type OrderStatus } from "@krudex/core/order-status";
import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { staffForApi } from "@/lib/auth/dal";
import { loadOutletOrders } from "@/lib/orders/load";

const query = z.object({
  outlet: z.uuid(),
  status: z.string().optional(),
  since: z.iso.datetime().optional(),
});

/** Live board and KDS load and resync (Architecture §7). RLS scopes the outlet. */
export async function GET(request: Request) {
  const staff = await staffForApi(["owner", "manager", "waiter", "kitchen"]);
  if (!staff) return fail(401, "unauthorized", "Sign in again.");
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return fail(400, "invalid_request", "Bad query.");
  if (!staff.outlets.some((o) => o.id === parsed.data.outlet)) return fail(403, "forbidden", "Not your outlet.");
  const statuses = (parsed.data.status?.split(",") ?? ["placed", "accepted", "preparing", "ready"]).filter((s): s is OrderStatus =>
    (orderStatuses as readonly string[]).includes(s),
  );
  return ok(await loadOutletOrders(parsed.data.outlet, statuses, parsed.data.since), 200, { "Cache-Control": "no-store" });
}
