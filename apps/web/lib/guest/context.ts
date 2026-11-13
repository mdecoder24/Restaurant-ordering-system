import "server-only";
import { openHoursSchema, paymentOptionsSchema, taxConfigSchema, type OpenHours } from "@krudex/core/schemas";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { signSessionCookie, verifySessionCookie } from "./crypto";
import { isOpenNow } from "./hours";

export type GuestOutlet = {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  mode: "dine_in" | "canteen";
  timezone: string;
  openHours: OpenHours;
  taxConfig: { default_rate_bps: number; prices_include_tax: boolean };
  serviceChargeBps: number;
  paymentOptions: { online: boolean; cash: boolean; prepaid_only: boolean };
  autoAccept: boolean;
  gstin: string | null;
  address: string | null;
};

export type GuestContext =
  | { status: "invalid" }
  | { status: "closed"; outlet: GuestOutlet; reason: "hours" | "suspended" }
  | { status: "ok"; outlet: GuestOutlet; table: { id: string; label: string } | null; qrToken: string };

const QR = /^[A-Za-z0-9_-]{16,64}$/;

/**
 * Resolves a QR token to its outlet and table with the service role (guests have no DB
 * credentials, AGENTS.md rule 5). Table tokens are per table; canteen outlets also have a
 * counter token that is not tied to a table.
 */
export async function resolveQr(qrToken: string): Promise<GuestContext> {
  if (!QR.test(qrToken)) return { status: "invalid" };
  const admin = createAdminClient();
  const outletCols =
    "id, tenant_id, name, mode, timezone, open_hours, tax_config, service_charge_bps, payment_options, auto_accept, address, tenants(name, status, gstin)";

  let table: { id: string; label: string } | null = null;
  let outletRow;
  const { data: t } = await admin.from("tables").select(`id, label, active, outlets(${outletCols})`).eq("qr_token", qrToken).maybeSingle();
  if (t) {
    if (!t.active) return { status: "invalid" };
    table = { id: t.id, label: t.label };
    outletRow = t.outlets;
  } else {
    const { data: o } = await admin.from("outlets").select(outletCols).eq("counter_qr_token", qrToken).eq("mode", "canteen").maybeSingle();
    outletRow = o;
  }
  if (!outletRow) return { status: "invalid" };

  const outlet: GuestOutlet = {
    id: outletRow.id,
    tenantId: outletRow.tenant_id,
    tenantName: outletRow.tenants?.name ?? "",
    name: outletRow.name,
    mode: outletRow.mode,
    timezone: outletRow.timezone,
    openHours: openHoursSchema.catch({}).parse(outletRow.open_hours),
    taxConfig: taxConfigSchema.catch({ default_rate_bps: 500, prices_include_tax: false }).parse(outletRow.tax_config),
    serviceChargeBps: outletRow.service_charge_bps,
    paymentOptions: paymentOptionsSchema.catch({ online: true, cash: true, prepaid_only: false }).parse(outletRow.payment_options),
    autoAccept: outletRow.auto_accept,
    gstin: outletRow.tenants?.gstin ?? null,
    address: outletRow.address,
  };
  if (outletRow.tenants?.status !== "active") return { status: "closed", outlet, reason: "suspended" };
  if (!isOpenNow(outlet.openHours, outlet.timezone)) return { status: "closed", outlet, reason: "hours" };
  // A canteen table token behaves like the counter token: tokens, not tables.
  return { status: "ok", outlet, table: outlet.mode === "canteen" ? null : table, qrToken };
}

const cookieName = (outletId: string) => `kx_g_${outletId.replace(/-/g, "").slice(0, 16)}`;

/** The guest's current session at this outlet, if their cookie proves one that is still open. */
export async function currentGuestSession(outletId: string) {
  const id = verifySessionCookie((await cookies()).get(cookieName(outletId))?.value);
  if (!id) return null;
  const { data } = await createAdminClient()
    .from("table_sessions")
    .select("id, outlet_id, table_id, token_no, status")
    .eq("id", id)
    .eq("outlet_id", outletId)
    .maybeSingle();
  return data && data.status === "open" ? data : null;
}

/** Any session (open or closed) the cookie proves, for receipts after the table closes. */
export async function provenSessionId(outletId: string) {
  return verifySessionCookie((await cookies()).get(cookieName(outletId))?.value);
}

export async function setGuestSessionCookie(outletId: string, sessionId: string) {
  (await cookies()).set(cookieName(outletId), signSessionCookie(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

/**
 * Dine-in: everyone at a table shares its one open session (Flow §3, "second guest joins").
 * Canteen: each guest gets their own session; it closes at handover.
 */
export async function openOrJoinSession(ctx: Extract<GuestContext, { status: "ok" }>) {
  const admin = createAdminClient();
  const existing = await currentGuestSession(ctx.outlet.id);
  if (existing && (ctx.table ? existing.table_id === ctx.table.id : existing.table_id === null)) return existing.id;

  if (ctx.table) {
    const { data: open } = await admin.from("table_sessions").select("id").eq("table_id", ctx.table.id).eq("status", "open").maybeSingle();
    if (open) return open.id;
  }
  const { data, error } = await admin
    .from("table_sessions")
    .insert({ tenant_id: ctx.outlet.tenantId, outlet_id: ctx.outlet.id, table_id: ctx.table?.id ?? null, secret_hash: "hmac-cookie" })
    .select("id")
    .single();
  if (error?.code === "23505" && ctx.table) {
    // Another guest at the same table opened it a moment ago.
    const { data: open } = await admin.from("table_sessions").select("id").eq("table_id", ctx.table.id).eq("status", "open").single();
    return open!.id;
  }
  if (error) throw error;
  return data.id;
}
