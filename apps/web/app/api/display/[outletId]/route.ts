import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { loadPickup } from "@/lib/orders/pickup";

export async function GET(_: Request, { params }: RouteContext<"/api/display/[outletId]">) {
  const { outletId } = await params;
  if (!z.uuid().safeParse(outletId).success) return fail(404, "not_found", "Not found.");
  const data = await loadPickup(outletId);
  return data ? ok(data, 200, { "Cache-Control": "no-store" }) : fail(404, "not_found", "Not found.");
}
