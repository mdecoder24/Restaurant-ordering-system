import { openHoursSchema, paymentOptionsSchema, taxConfigSchema } from "@krudex/core/schemas";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { guestUrl, qrSvg } from "@/lib/tables/qr";

export const metadata: Metadata = { title: "Settings" };

async function Settings() {
  const staff = await requireRole(["owner", "manager"]);
  const supabase = await createClient();
  const [{ data: o }, { data: t }] = await Promise.all([
    supabase
      .from("outlets")
      .select("name, mode, address, timezone, open_hours, tax_config, service_charge_bps, payment_options, auto_accept, ticket_warn_minutes, ticket_overdue_minutes, counter_qr_token")
      .eq("id", staff.outlet.id)
      .single(),
    supabase.from("tenants").select("name, gstin").eq("id", staff.outlet.tenantId).single(),
  ]);
  if (!o) return null;
  const counter = o.mode === "canteen" && o.counter_qr_token ? { svg: await qrSvg(o.counter_qr_token), url: guestUrl(o.counter_qr_token) } : null;
  return (
    <SettingsForm
      key={staff.outlet.id}
      role={staff.role}
      business={{ name: t?.name ?? "", gstin: t?.gstin ?? null }}
      counterQr={counter}
      initial={{
        name: o.name,
        mode: o.mode,
        address: o.address,
        timezone: o.timezone,
        open_hours: openHoursSchema.catch({}).parse(o.open_hours),
        tax_config: taxConfigSchema.catch({ default_rate_bps: 500, prices_include_tax: false }).parse(o.tax_config),
        service_charge_bps: o.service_charge_bps,
        payment_options: paymentOptionsSchema.catch({ online: true, cash: true, prepaid_only: false }).parse(o.payment_options),
        auto_accept: o.auto_accept,
        ticket_warn_minutes: o.ticket_warn_minutes,
        ticket_overdue_minutes: o.ticket_overdue_minutes,
      }}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageBody><Skeleton className="h-9 w-40" /><Skeleton className="h-[600px]" /></PageBody>}>
      <Settings />
    </Suspense>
  );
}
