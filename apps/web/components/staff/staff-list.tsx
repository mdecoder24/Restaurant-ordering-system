"use client";

import { Copy, KeyRound, Mail, Pencil, UserPlus, UsersRound } from "lucide-react";
import { useState, useTransition } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { addStaff, updateStaff } from "@/lib/staff/actions";

export type StaffRow = {
  id: string;
  name: string;
  role: Role;
  outletId: string | null;
  active: boolean;
  email: string | null;
  pinOnly: boolean;
  isSelf: boolean;
};

const roleInfo: Record<Exclude<Role, "owner">, { label: string; hint: string }> = {
  manager: { label: "Manager", hint: "Runs orders, menu, refunds and outlet settings" },
  waiter: { label: "Floor / counter", hint: "Serves, settles bills, toggles availability" },
  kitchen: { label: "Kitchen", hint: "Kitchen screen only" },
};
const roleLabel = (r: Role) => (r === "owner" ? "Owner" : roleInfo[r].label);

type Draft = { id: string | null; name: string; role: Exclude<Role, "owner">; outletId: string; email: string; pin: string; active: boolean };
const ALL = "all";

export function StaffList({
  rows,
  canEdit,
  outlets,
  pinLinks,
}: {
  rows: StaffRow[];
  canEdit: boolean;
  outlets: { id: string; name: string }[];
  pinLinks: { outlet: string; url: string; kds: string }[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const outletName = (id: string | null) => (id ? (outlets.find((o) => o.id === id)?.name ?? "Another outlet") : "All outlets");

  const save = () =>
    start(async () => {
      if (!draft) return;
      const outlet_id = draft.outletId === ALL ? null : draft.outletId;
      const r = draft.id
        ? await updateStaff(draft.id, { role: draft.role, outlet_id, active: draft.active, pin: draft.pin })
        : await addStaff({ display_name: draft.name, role: draft.role, outlet_id, email: draft.email, pin: draft.pin });
      if (r.ok) {
        toast.success(draft.id ? "Saved" : draft.email ? `Invite sent to ${draft.email}` : `${draft.name} can now sign in with their PIN`);
        setDraft(null);
        setErrors({});
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <PageBody>
      <PageHeader
        title="Staff"
        description={canEdit ? "Invite managers by email. Give kitchen and floor staff a PIN." : "Your team. Only owners can make changes."}
        actions={
          canEdit ? (
            <Button onClick={() => setDraft({ id: null, name: "", role: "waiter", outletId: outlets[0]?.id ?? ALL, email: "", pin: "", active: true })}>
              <UserPlus aria-hidden /> Add staff
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          {rows.length === 0 ? (
            <EmptyState icon={UsersRound} title="No staff yet" />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((m) => (
                <li key={m.id} className={cn("flex items-center gap-3 px-4 py-3", !m.active && "text-muted")}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-caption font-bold">
                    {m.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-small font-semibold">
                      <span className="truncate">{m.name}</span>
                      {m.isSelf ? <span className="text-caption font-normal text-muted">(you)</span> : null}
                      {!m.active ? <Badge size="sm">Inactive</Badge> : null}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-caption text-muted">
                      <span>{roleLabel(m.role)}</span>
                      <span>{outletName(m.outletId)}</span>
                      {m.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="size-3" aria-hidden /> {m.email}
                        </span>
                      ) : null}
                      {m.pinOnly ? (
                        <span className="inline-flex items-center gap-1">
                          <KeyRound className="size-3" aria-hidden /> PIN sign-in
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {canEdit && m.role !== "owner" ? (
                    <IconButton
                      size="sm"
                      aria-label={`Edit ${m.name}`}
                      onClick={() => setDraft({ id: m.id, name: m.name, role: m.role as Exclude<Role, "owner">, outletId: m.outletId ?? ALL, email: m.email ?? "", pin: "", active: m.active })}
                    >
                      <Pencil aria-hidden />
                    </IconButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="text-small font-semibold">Device sign-in links</h2>
          <p className="text-caption text-muted">Open these on the kitchen tablet or a floor phone, then sign in with a PIN. Devices stay signed in.</p>
          {pinLinks.map((l) => (
            <div key={l.url} className="rounded-md bg-surface-2 p-3">
              <p className="text-small font-medium">{l.outlet}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => copy(l.url)}>
                  <Copy aria-hidden /> Staff PIN link
                </Button>
                <Button size="sm" variant="ghost" onClick={() => copy(l.kds)}>
                  <Copy aria-hidden /> Kitchen screen link
                </Button>
              </div>
            </div>
          ))}
        </aside>
      </div>

      {draft ? (
        <Sheet
          open
          onOpenChange={(o) => !o && setDraft(null)}
          title={draft.id ? `Edit ${draft.name}` : "Add staff"}
          footer={
            <Button block onClick={save} loading={pending}>
              {draft.id ? "Save changes" : draft.email ? "Send invite" : "Add staff"}
            </Button>
          }
        >
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {!draft.id ? (
              <Field label="Name" error={errors.display_name}>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
              </Field>
            ) : null}
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-small font-medium">Role</legend>
              {(Object.keys(roleInfo) as Exclude<Role, "owner">[]).map((r) => (
                <label key={r} className={cn("press flex cursor-pointer items-start gap-3 rounded-md border p-3", draft.role === r ? "border-primary bg-primary-soft" : "border-border")}>
                  <input type="radio" name="role" className="mt-1 accent-[var(--color-primary)]" checked={draft.role === r} onChange={() => setDraft({ ...draft, role: r })} />
                  <span>
                    <span className="block text-small font-semibold">{roleInfo[r].label}</span>
                    <span className="block text-caption text-muted">{roleInfo[r].hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Field label="Works at">
              <Select value={draft.outletId} onValueChange={(v) => setDraft({ ...draft, outletId: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All outlets</SelectItem>
                  {outlets.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {!draft.id ? (
              <Field label="Email" optional helper="Sends an invite to set a password. Best for managers." error={errors.email}>
                <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
            ) : null}
            <Field label={draft.id ? "New PIN" : "PIN"} optional={Boolean(draft.id)} helper="4 to 6 digits, unique in the outlet. For shared devices." error={errors.pin}>
              <Input inputMode="numeric" autoComplete="off" value={draft.pin} onChange={(e) => setDraft({ ...draft, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </Field>
            {draft.id ? (
              <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                <span>
                  <span className="block text-small font-medium">Active</span>
                  <span className="block text-caption text-muted">Turning this off signs them out everywhere.</span>
                </span>
                <Switch checked={draft.active} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
              </label>
            ) : null}
          </form>
        </Sheet>
      ) : null}
    </PageBody>
  );
}
