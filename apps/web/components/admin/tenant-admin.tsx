"use client";

import { formatInr } from "@krudex/core/format";
import { Building2, LogOut, Plus, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { createTenant, setTenantPlan, setTenantStatus } from "@/lib/admin/actions";
import { signOut } from "@/lib/auth/actions";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "suspended";
  gstin: string | null;
  created_at: string;
  outlets: number;
  orders30: number;
  revenue30: number;
};

const blank = { name: "", slug: "", ownerEmail: "", ownerName: "", outletName: "Main", mode: "dine_in" as "dine_in" | "canteen" };

export function TenantAdmin({ email, rows, audit }: { email: string; rows: TenantRow[]; audit: { id: number; action: string; tenant: string; at: string }[] }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<TenantRow | null>(null);
  const [creating, setCreating] = useState<typeof blank | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(msg);
      else toast.error(r.error ?? "Failed.");
    });

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="size-7 text-primary" aria-hidden />
        <div className="mr-auto">
          <h1 className="font-display text-h1 font-bold tracking-tight">Platform admin</h1>
          <p className="text-small text-muted">Signed in as {email}. Every action here is audited.</p>
        </div>
        <Button onClick={() => setCreating(blank)}>
          <Plus aria-hidden /> New tenant
        </Button>
        <form action={signOut}>
          <Button variant="ghost" type="submit">
            <LogOut aria-hidden /> Sign out
          </Button>
        </form>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={Building2} title="No tenants yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Outlets</TableHead>
                <TableHead className="text-right">Orders (30 d)</TableHead>
                <TableHead className="text-right">Revenue (30 d)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <span className="block font-semibold">{t.name}</span>
                    <span className="block text-caption text-muted">{t.slug}{t.gstin ? ` · ${t.gstin}` : ""}</span>
                  </TableCell>
                  <TableCell>
                    <Select value={t.plan} onValueChange={(plan) => run(() => setTenantPlan({ tenantId: t.id, plan: plan as "starter" }), `Plan changed to ${plan}`)}>
                      <SelectTrigger aria-label={`Plan for ${t.name}`} className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starter">Starter</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right tabular">{t.outlets}</TableCell>
                  <TableCell className="text-right tabular">{t.orders30}</TableCell>
                  <TableCell className="text-right tabular">{formatInr(t.revenue30)}</TableCell>
                  <TableCell>
                    <Badge tone={t.status === "active" ? "success" : "danger"}>{t.status === "active" ? "Active" : "Suspended"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant={t.status === "active" ? "ghost" : "secondary"} className={t.status === "active" ? "text-danger" : ""} onClick={() => setConfirm(t)}>
                      {t.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {audit.length ? (
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-small font-semibold">Recent admin actions</h2>
          <ul className="flex flex-col gap-1 text-small">
            {audit.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="w-40 shrink-0 text-muted tabular">{new Date(a.at).toLocaleString("en-IN")}</span>
                <span className="font-mono text-caption">{a.action}</span>
                <span>{a.tenant}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.status === "active" ? `Suspend ${confirm?.name}?` : `Reactivate ${confirm?.name}?`}
        description={confirm?.status === "active" ? "Staff lose access immediately and guests scanning their QR codes see a closed page. Data is kept." : "Staff regain access and QR codes start working again."}
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant={confirm?.status === "active" ? "danger" : "primary"}
              loading={pending}
              onClick={() => {
                const t = confirm!;
                setConfirm(null);
                run(() => setTenantStatus({ tenantId: t.id, status: t.status === "active" ? "suspended" : "active" }), t.status === "active" ? `${t.name} suspended` : `${t.name} reactivated`);
              }}
            >
              {confirm?.status === "active" ? "Suspend" : "Reactivate"}
            </Button>
          </>
        }
      />

      <Dialog
        open={creating !== null}
        onOpenChange={(o) => !o && setCreating(null)}
        title="New tenant"
        description="Creates the business and its first outlet, then emails the owner an invite."
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              loading={pending}
              onClick={() =>
                creating &&
                start(async () => {
                  const r = await createTenant(creating);
                  if (r.ok) {
                    toast.success(`Invite sent to ${creating.ownerEmail}`);
                    setCreating(null);
                  } else toast.error(r.error);
                })
              }
            >
              Create and invite
            </Button>
          </>
        }
      >
        {creating ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name">
              <Input value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} />
            </Field>
            <Field label="Short name">
              <Input value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: e.target.value })} />
            </Field>
            <Field label="Owner name">
              <Input value={creating.ownerName} onChange={(e) => setCreating({ ...creating, ownerName: e.target.value })} />
            </Field>
            <Field label="Owner email">
              <Input type="email" value={creating.ownerEmail} onChange={(e) => setCreating({ ...creating, ownerEmail: e.target.value })} />
            </Field>
            <Field label="First outlet">
              <Input value={creating.outletName} onChange={(e) => setCreating({ ...creating, outletName: e.target.value })} />
            </Field>
            <Field label="Mode">
              <Select value={creating.mode} onValueChange={(v) => setCreating({ ...creating, mode: v as "dine_in" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine-in</SelectItem>
                  <SelectItem value="canteen">Canteen</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
