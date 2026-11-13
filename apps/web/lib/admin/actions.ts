"use server";

import { slugSchema } from "@krudex/core/schemas";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { clientEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdmin } from "./auth";

async function audit(adminUserId: string, action: string, tenantId: string | null, payload: Record<string, unknown> = {}) {
  await createAdminClient().from("admin_audit").insert({ admin_user_id: adminUserId, action, tenant_id: tenantId, payload: payload as never });
}

const statusSchema = z.object({ tenantId: z.uuid(), status: z.enum(["active", "suspended"]) });

/** Suspend or reactivate a tenant. Suspended: staff lose access (RLS) and QR codes show a closed page. */
export async function setTenantStatus(input: z.infer<typeof statusSchema>): Promise<ActionResult> {
  const me = await getPlatformAdmin();
  if (!me) return { ok: false, error: "Platform admins only." };
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { error } = await createAdminClient().from("tenants").update({ status: parsed.data.status }).eq("id", parsed.data.tenantId);
  if (error) return { ok: false, error: "Couldn’t update the tenant." };
  await audit(me.userId, `tenant.${parsed.data.status}`, parsed.data.tenantId);
  refresh();
  return { ok: true };
}

const planSchema = z.object({ tenantId: z.uuid(), plan: z.enum(["starter", "growth", "enterprise"]) });

export async function setTenantPlan(input: z.infer<typeof planSchema>): Promise<ActionResult> {
  const me = await getPlatformAdmin();
  if (!me) return { ok: false, error: "Platform admins only." };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bad request." };
  const { error } = await createAdminClient().from("tenants").update({ plan: parsed.data.plan }).eq("id", parsed.data.tenantId);
  if (error) return { ok: false, error: "Couldn’t change the plan." };
  await audit(me.userId, "tenant.plan", parsed.data.tenantId, { plan: parsed.data.plan });
  refresh();
  return { ok: true };
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
  ownerEmail: z.email(),
  ownerName: z.string().trim().min(1).max(80),
  outletName: z.string().trim().min(1).max(120),
  mode: z.enum(["dine_in", "canteen"]),
});

/** Onboard a tenant on someone's behalf: creates it and emails the owner an invite. */
export async function createTenant(input: z.infer<typeof createSchema>): Promise<ActionResult> {
  const me = await getPlatformAdmin();
  if (!me) return { ok: false, error: "Platform admins only." };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const db = createAdminClient();
  const { data: tenant, error } = await db.from("tenants").insert({ name: parsed.data.name, slug: parsed.data.slug }).select("id").single();
  if (error) return { ok: false, error: error.code === "23505" ? "That short name is taken." : "Couldn’t create the tenant." };
  await db.from("outlets").insert({ tenant_id: tenant.id, name: parsed.data.outletName, mode: parsed.data.mode });
  const { data: invite, error: inviteError } = await db.auth.admin.inviteUserByEmail(parsed.data.ownerEmail, {
    redirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/login`,
  });
  if (inviteError || !invite.user) {
    await db.from("tenants").delete().eq("id", tenant.id);
    return { ok: false, error: "Couldn’t invite the owner (email may already have an account)." };
  }
  await db.from("members").insert({ tenant_id: tenant.id, user_id: invite.user.id, display_name: parsed.data.ownerName, role: "owner" });
  await audit(me.userId, "tenant.create", tenant.id, { owner: parsed.data.ownerEmail });
  refresh();
  return { ok: true };
}
