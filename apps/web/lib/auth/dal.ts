import "server-only";
import type { Database } from "@krudex/core/db-types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Role = Database["public"]["Enums"]["member_role"];
export type OutletMode = Database["public"]["Enums"]["outlet_mode"];

export type StaffOutlet = {
  id: string;
  name: string;
  mode: OutletMode;
  tenantId: string;
  tenantName: string;
};

export type StaffContext = {
  userId: string;
  email: string | null;
  memberId: string;
  displayName: string;
  role: Role;
  outlet: StaffOutlet;
  outlets: StaffOutlet[];
};

export const OUTLET_COOKIE = "krudex_outlet";

/** Home screen per role (Application Flow §13: unauthorised routes go to the role's home). */
export const roleHome: Record<Role, string> = {
  owner: "/app",
  manager: "/app",
  waiter: "/app/orders",
  kitchen: "/kds",
};

/**
 * Data Access Layer: the one place that turns a request into a staff identity. Every
 * staff page and handler calls this; RLS still applies to all queries on top.
 * `requireStaff` and `requireRole` redirect; `staffForApi` returns null for handlers.
 */
type Session =
  | { status: "signed-out" }
  | { status: "no-tenant"; userId: string; email: string | null }
  | ({ status: "ok" } & StaffContext);

export const getSession = cache(async (): Promise<Session> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signed-out" };

  const { data: memberships } = await supabase
    .from("members")
    .select("id, tenant_id, display_name, role, outlet_id, tenants(name, status)")
    .eq("user_id", user.id)
    .eq("active", true);

  const active = (memberships ?? []).filter((m) => m.tenants?.status === "active");
  if (active.length === 0) return { status: "no-tenant", userId: user.id, email: user.email ?? null };

  // RLS already limits outlets to the caller's scope.
  const { data: outletRows } = await supabase
    .from("outlets")
    .select("id, name, mode, tenant_id, tenants(name)")
    .order("created_at");

  const outlets: StaffOutlet[] = (outletRows ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    mode: o.mode,
    tenantId: o.tenant_id,
    tenantName: o.tenants?.name ?? "",
  }));
  if (outlets.length === 0) return { status: "no-tenant", userId: user.id, email: user.email ?? null };

  const preferred = (await cookies()).get(OUTLET_COOKIE)?.value;
  const outlet = outlets.find((o) => o.id === preferred) ?? outlets[0]!;
  const membership = active.find((m) => m.tenant_id === outlet.tenantId)!;

  return {
    status: "ok",
    userId: user.id,
    email: user.email ?? null,
    memberId: membership.id,
    displayName: membership.display_name,
    role: membership.role,
    outlet,
    outlets,
  };
});

/** Signed-in staff with a tenant, or redirect to login / onboarding. */
export async function requireStaff(): Promise<StaffContext> {
  const session = await getSession();
  if (session.status === "signed-out") redirect("/login");
  if (session.status === "no-tenant") redirect("/onboarding");
  return session;
}

/** Same, but also enforces a role; other roles go to their own home screen. */
export async function requireRole(roles: readonly Role[]): Promise<StaffContext> {
  const staff = await requireStaff();
  if (!roles.includes(staff.role)) redirect(roleHome[staff.role]);
  return staff;
}

/** Route-handler variant: returns a staff context or null (caller answers 401/403). */
export async function staffForApi(roles: readonly Role[]): Promise<StaffContext | null> {
  const session = await getSession();
  if (session.status !== "ok" || !roles.includes(session.role)) return null;
  return session;
}
