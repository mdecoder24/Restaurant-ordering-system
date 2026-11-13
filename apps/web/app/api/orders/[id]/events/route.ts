import { z } from "zod";
import { fail, ok } from "@/lib/api/respond";
import { staffForApi } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/** Audit timeline for the order drawer, read through RLS. */
export async function GET(_: Request, { params }: RouteContext<"/api/orders/[id]/events">) {
  const staff = await staffForApi(["owner", "manager", "waiter"]);
  if (!staff) return fail(401, "unauthorized", "Sign in again.");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail(404, "not_found", "Order not found.");
  const supabase = await createClient();
  // RLS hides other tenants' orders, so "not visible" and "doesn't exist" both answer 404.
  const { data: order } = await supabase.from("orders").select("id").eq("id", id).maybeSingle();
  if (!order) return fail(404, "not_found", "Order not found.");
  const { data, error } = await supabase.from("order_events").select("id, type, actor_type, actor_id, payload, created_at").eq("order_id", id).order("created_at");
  if (error) return fail(500, "server_error", "Couldn’t load the timeline. Try again.");
  const actorIds = [...new Set((data ?? []).map((e) => e.actor_id).filter((a): a is string => Boolean(a)))];
  // Names are visible to owners and managers (RLS); others see "Staff".
  const { data: names } = actorIds.length ? await supabase.from("members").select("id, display_name").in("id", actorIds) : { data: [] };
  const byId = new Map((names ?? []).map((m) => [m.id, m.display_name]));
  return ok(
    (data ?? []).map((e) => ({ ...e, actor_name: e.actor_id ? (byId.get(e.actor_id) ?? "Staff") : null })),
    200,
    { "Cache-Control": "no-store" },
  );
}
