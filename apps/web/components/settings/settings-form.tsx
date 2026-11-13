"use client";

import type { OpenHours, OutletSettings } from "@krudex/core/schemas";
import { Download, Plus, RefreshCw, Store, UtensilsCrossed } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { createOutlet, saveBusiness, saveOutletSettings } from "@/lib/settings/actions";
import { regenerateCounterQr } from "@/lib/tables/actions";

const days = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

const gstRates = [
  { v: "0", l: "0%" },
  { v: "500", l: "5% (restaurants)" },
  { v: "1200", l: "12%" },
  { v: "1800", l: "18%" },
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-border py-8 first:pt-2 last:border-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <h2 className="text-h2 font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-small text-muted">{description}</p> : null}
      </div>
      <div className="flex max-w-2xl flex-col gap-4">{children}</div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3">
      <span>
        <span className="block text-small font-medium">{label}</span>
        {hint ? <span className="block text-caption text-muted">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function SettingsForm({
  role,
  initial,
  business,
  counterQr,
}: {
  role: Role;
  initial: OutletSettings;
  business: { name: string; gstin: string | null };
  counterQr: { svg: string; url: string } | null;
}) {
  const [s, setS] = useState(initial);
  const [biz, setBiz] = useState({ name: business.name, gstin: business.gstin ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [hoursOn, setHoursOn] = useState(Object.keys(initial.open_hours).length > 0);
  const [newOutlet, setNewOutlet] = useState<{ name: string; mode: "dine_in" | "canteen" } | null>(null);
  const set = <K extends keyof OutletSettings>(k: K, v: OutletSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const owner = role === "owner";

  const save = () =>
    start(async () => {
      const hours: OpenHours = hoursOn ? s.open_hours : {};
      const r = await saveOutletSettings({ ...s, open_hours: hours });
      if (owner) {
        const b = await saveBusiness(biz);
        if (!b.ok) {
          setErrors(b.fieldErrors ?? {});
          return void toast.error(b.error);
        }
      }
      if (r.ok) {
        setErrors({});
        toast.success("Settings saved");
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });

  const setDay = (d: (typeof days)[number][0], v: { open: string; close: string } | null) => set("open_hours", { ...s.open_hours, [d]: v });

  return (
    <PageBody className="pb-28">
      <PageHeader
        title="Settings"
        description={`${s.name} · changes apply immediately to guests.`}
        actions={
          owner ? (
            <Button variant="secondary" onClick={() => setNewOutlet({ name: "", mode: "dine_in" })}>
              <Plus aria-hidden /> Add outlet
            </Button>
          ) : null
        }
      />
      <div className="rounded-lg border border-border bg-surface px-6 shadow-sm">
        {owner ? (
          <Section title="Business" description="Printed on GST invoices.">
            <Field label="Business name" error={errors.name}>
              <Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
            </Field>
            <Field label="GSTIN" optional error={errors.gstin}>
              <Input value={biz.gstin} onChange={(e) => setBiz({ ...biz, gstin: e.target.value.toUpperCase() })} maxLength={15} />
            </Field>
          </Section>
        ) : null}

        <Section title="Outlet" description="How guests find and order from this outlet.">
          <Field label="Outlet name" error={errors.name}>
            <Input value={s.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Address" optional>
            <Input value={s.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div role="radiogroup" aria-label="Service mode" className="grid gap-2 sm:grid-cols-2">
            {([
              ["dine_in", "Dine-in", "Table QR, served at the table", UtensilsCrossed],
              ["canteen", "Canteen / counter", "Token number, collect at counter", Store],
            ] as const).map(([v, l, h, Icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={s.mode === v}
                onClick={() => set("mode", v)}
                className={cn(
                  "press flex items-start gap-3 rounded-md border p-3 text-left transition-colors duration-[var(--motion-fast)]",
                  s.mode === v ? "border-primary bg-primary-soft" : "border-border-strong hover-fine:bg-surface-2",
                )}
              >
                <Icon className={cn("mt-0.5 size-5", s.mode === v ? "text-primary" : "text-muted")} aria-hidden />
                <span>
                  <span className="block text-small font-semibold">{l}</span>
                  <span className="block text-caption text-muted">{h}</span>
                </span>
              </button>
            ))}
          </div>
          <Toggle label="Auto-accept orders" hint="Send orders straight to the kitchen. Off by default to stop prank orders from photographed QRs." checked={s.auto_accept} onChange={(v) => set("auto_accept", v)} />
        </Section>

        <Section title="Opening hours" description="Outside these hours, guests see a closed page with your hours.">
          <Toggle label="Limit ordering to opening hours" checked={hoursOn} onChange={setHoursOn} />
          {hoursOn ? (
            <div className="swap-in flex flex-col divide-y divide-border rounded-md border border-border">
              {days.map(([d, label]) => {
                const h = s.open_hours[d];
                return (
                  <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <span className="w-24 text-small font-medium">{label}</span>
                    <Switch aria-label={`Open on ${label}`} checked={Boolean(h)} onCheckedChange={(on) => setDay(d, on ? { open: "11:00", close: "23:00" } : null)} />
                    {h ? (
                      <span className="flex items-center gap-2">
                        <Input type="time" aria-label={`${label} opens`} value={h.open} onChange={(e) => setDay(d, { ...h, open: e.target.value })} className="h-9 w-32" />
                        <span className="text-muted">to</span>
                        <Input type="time" aria-label={`${label} closes`} value={h.close} onChange={(e) => setDay(d, { ...h, close: e.target.value })} className="h-9 w-32" />
                      </span>
                    ) : (
                      <span className="text-small text-muted">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Section>

        <Section title="Taxes and charges" description="Used by every bill. Changes apply to new orders only.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default GST rate">
              <Select value={String(s.tax_config.default_rate_bps)} onValueChange={(v) => set("tax_config", { ...s.tax_config, default_rate_bps: Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gstRates.map((g) => (
                    <SelectItem key={g.v} value={g.v}>
                      {g.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Service charge (%)" helper="0 to 20" error={errors.service_charge_bps}>
              <Input
                inputMode="decimal"
                defaultValue={String(s.service_charge_bps / 100)}
                onChange={(e) => set("service_charge_bps", Math.round(Number(e.target.value || 0) * 100))}
              />
            </Field>
          </div>
          <Toggle label="Menu prices include GST" hint="Off: GST is added on top of menu prices." checked={s.tax_config.prices_include_tax} onChange={(v) => set("tax_config", { ...s.tax_config, prices_include_tax: v })} />
        </Section>

        <Section title="Payments" description="What guests can choose at checkout.">
          <Toggle label="Online payment (UPI and cards)" checked={s.payment_options.online} onChange={(v) => set("payment_options", { ...s.payment_options, online: v })} />
          <Toggle label="Pay at counter" checked={s.payment_options.cash} onChange={(v) => set("payment_options", { ...s.payment_options, cash: v })} />
          {s.mode === "canteen" ? (
            <Toggle
              label="Prepaid only"
              hint="Orders reach the kitchen only after payment. Prevents unpaid pickups."
              checked={s.payment_options.prepaid_only}
              onChange={(v) => set("payment_options", { ...s.payment_options, prepaid_only: v, online: v ? true : s.payment_options.online })}
            />
          ) : null}
        </Section>

        <Section title="Kitchen screen" description="Ticket colours change as orders wait.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Warning after (minutes)" error={errors.ticket_warn_minutes}>
              <Input inputMode="numeric" value={String(s.ticket_warn_minutes)} onChange={(e) => set("ticket_warn_minutes", Number(e.target.value) || 0)} />
            </Field>
            <Field label="Overdue after (minutes)" error={errors.ticket_overdue_minutes}>
              <Input inputMode="numeric" value={String(s.ticket_overdue_minutes)} onChange={(e) => set("ticket_overdue_minutes", Number(e.target.value) || 0)} />
            </Field>
          </div>
        </Section>

        {counterQr ? (
          <Section title="Counter QR" description="Canteen guests scan this at the counter or on a poster.">
            <div className="flex flex-wrap items-center gap-5">
              <div className="size-40 rounded-md border border-border bg-surface p-2 [&_svg]:size-full" role="img" aria-label="Counter QR code" dangerouslySetInnerHTML={{ __html: counterQr.svg }} />
              <div className="flex flex-col gap-2">
                <p className="max-w-xs truncate font-mono text-caption text-muted">{counterQr.url}</p>
                <Button asChild size="sm" variant="secondary">
                  <a href="/api/tables/qr.pdf?counter=1">
                    <Download aria-hidden /> Poster (PDF)
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    start(async () => {
                      const r = await regenerateCounterQr();
                      if (r.ok) toast.success("New counter code. Print it now.");
                      else toast.error(r.error);
                    })
                  }
                >
                  <RefreshCw aria-hidden /> New code
                </Button>
              </div>
            </div>
          </Section>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border bg-bg/90 backdrop-blur-md md:left-[240px]">
        <div className="mx-auto flex max-w-[1440px] justify-end gap-2 px-6 py-3">
          <Button onClick={save} loading={pending} size="lg">
            Save settings
          </Button>
        </div>
      </div>

      <Dialog
        open={newOutlet !== null}
        onOpenChange={(o) => !o && setNewOutlet(null)}
        title="Add an outlet"
        description="Each outlet has its own menu, tables, staff scope and settings."
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  if (!newOutlet) return;
                  const r = await createOutlet(newOutlet);
                  if (r.ok) {
                    toast.success(`${newOutlet.name} added. You’re now working in it.`);
                    setNewOutlet(null);
                  } else toast.error(r.fieldErrors?.name ?? r.error);
                })
              }
            >
              Add outlet
            </Button>
          </>
        }
      >
        {newOutlet ? (
          <div className="flex flex-col gap-3">
            <Field label="Outlet name">
              <Input value={newOutlet.name} onChange={(e) => setNewOutlet({ ...newOutlet, name: e.target.value })} />
            </Field>
            <Field label="Mode">
              <Select value={newOutlet.mode} onValueChange={(v) => setNewOutlet({ ...newOutlet, mode: v as "dine_in" | "canteen" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine-in</SelectItem>
                  <SelectItem value="canteen">Canteen / counter</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}
      </Dialog>
    </PageBody>
  );
}
