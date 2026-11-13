"use client";

import { formatInr } from "@krudex/core/format";
import { BellRing, Download, LayoutGrid, Plus, QrCode, Receipt, RefreshCw, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { Role } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { useStaffLiveRefresh } from "@/lib/realtime/use-staff-live";
import { addTables, deleteTable, regenerateQr, updateTable } from "@/lib/tables/actions";
import type { TableTileData } from "@/lib/tables/load";
import { SessionPanel } from "./session-panel";

const statusMeta = {
  free: { label: "Free", className: "bg-surface-2 text-muted", dot: "bg-border-strong" },
  occupied: { label: "Occupied", className: "bg-info/12 text-info", dot: "bg-info" },
  bill_requested: { label: "Bill requested", className: "bg-warning/12 text-warning", dot: "bg-warning" },
} as const;

function useMinutesSince(iso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000)) : null;
}

function Tile({ t, onOpen, style }: { t: TableTileData; onOpen: () => void; style?: CSSProperties }) {
  const minutes = useMinutesSince(t.session?.openedAt ?? null);
  const meta = statusMeta[t.status];
  return (
    <button
      type="button"
      onClick={onOpen}
      style={style}
      className={cn(
        "rise-in press group relative flex min-h-36 flex-col rounded-lg border bg-surface p-4 text-left shadow-sm",
        "transition-[transform,box-shadow,border-color] duration-[var(--motion-base)] ease-out hover-fine:-translate-y-0.5 hover-fine:shadow-md",
        t.status === "bill_requested" ? "border-warning/60" : t.status === "occupied" ? "border-info/40" : "border-border",
        !t.active && "border-dashed text-muted",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-display text-[1.75rem] leading-8 font-bold tracking-tight">
          <span className="sr-only">Table </span>
          {t.label}
        </span>
        {t.session?.openRequests ? (
          <span className="relative grid size-7 place-items-center rounded-full bg-warning/15 text-warning" aria-label={`${t.session.openRequests} open requests`}>
            <span className="ping-ring absolute inset-0 rounded-full bg-warning/30" aria-hidden />
            <BellRing className="relative size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 flex items-center gap-1 text-caption text-muted">
        <Users className="size-3.5" aria-hidden /> {t.seats} seats
      </span>
      <div className="mt-auto flex items-end justify-between gap-2 pt-4">
        <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-pill px-2.5 text-caption font-semibold", meta.className)}>
          <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
          {meta.label}
        </span>
        {t.session ? (
          <span className="text-right">
            <span className="block font-display text-body font-bold tabular">{formatInr(t.session.due)}</span>
            <span className="block text-caption text-muted tabular">{minutes} min</span>
          </span>
        ) : null}
      </div>
    </button>
  );
}

function AddTablesDialog({ open, onOpenChange, nextNumber }: { open: boolean; onOpenChange: (o: boolean) => void; nextNumber: number }) {
  const [prefix, setPrefix] = useState("T");
  const [from, setFrom] = useState(String(nextNumber));
  const [count, setCount] = useState("10");
  const [seats, setSeats] = useState("4");
  const [pending, start] = useTransition();
  const n = Math.max(0, Math.min(100, Number(count) || 0));
  const save = () =>
    start(async () => {
      const r = await addTables({ prefix, from: Number(from) || 0, count: n, seats: Number(seats) || 4 });
      if (r.ok) {
        toast.success(`${r.data?.added} tables added`);
        onOpenChange(false);
      } else toast.error(r.error);
    });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add tables"
      description={n ? `Creates ${prefix}${from || 0} to ${prefix}${(Number(from) || 0) + n - 1}, each with its own QR code.` : undefined}
      actions={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={save} loading={pending} disabled={!n}>
            Add {n || ""} tables
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label prefix" helper="e.g. T, Patio-">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={20} />
        </Field>
        <Field label="Start at">
          <Input inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="How many">
          <Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
        <Field label="Seats each">
          <Input inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function QrPanel({ t, canEdit, onDone }: { t: TableTileData; canEdit: boolean; onDone: () => void }) {
  const [label, setLabel] = useState(t.label);
  const [seats, setSeats] = useState(String(t.seats));
  const [active, setActive] = useState(t.active);
  const [confirm, setConfirm] = useState<"regen" | "delete" | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-2 p-5">
        <div
          className="swap-in size-48 rounded-md bg-surface p-2 shadow-sm [&_svg]:size-full"
          role="img"
          aria-label={`QR code for table ${t.label}`}
          // Server-generated SVG from the qrcode library (no user content inside).
          dangerouslySetInnerHTML={{ __html: t.qrSvg }}
        />
        <p className="max-w-full truncate font-mono text-caption text-muted">{t.url}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/tables/qr.pdf?ids=${t.id}`}>
              <Download aria-hidden /> Table tent (PDF)
            </a>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={t.url} target="_blank" rel="noopener">
              Open guest view
            </Link>
          </Button>
        </div>
      </div>

      {canEdit ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await updateTable(t.id, { label, seats: Number(seats) || 1, active });
              if (r.ok) {
                toast.success("Table saved");
                onDone();
              } else toast.error(r.error);
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} />
            </Field>
            <Field label="Seats">
              <Input inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
            <span>
              <span className="block text-small font-medium">Active</span>
              <span className="block text-caption text-muted">Inactive tables can’t take new orders.</span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending}>
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirm("regen")}>
              <RefreshCw aria-hidden /> New QR code
            </Button>
            <Button type="button" variant="ghost" className="ml-auto text-danger" onClick={() => setConfirm("delete")}>
              <Trash2 aria-hidden /> Delete
            </Button>
          </div>
        </form>
      ) : null}

      <Dialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "regen" ? `New QR code for ${t.label}?` : `Delete table ${t.label}?`}
        description={
          confirm === "regen"
            ? "The printed code on this table stops working right away. Print and place the new one."
            : "Its QR code stops working. Past orders are kept."
        }
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant={confirm === "delete" ? "danger" : "primary"}
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = confirm === "regen" ? await regenerateQr(t.id) : await deleteTable(t.id);
                  setConfirm(null);
                  if (r.ok) {
                    toast.success(confirm === "regen" ? "New code ready. Print it now." : "Table deleted");
                    if (confirm === "delete") onDone();
                  } else toast.error(r.error);
                })
              }
            >
              {confirm === "regen" ? "Make new code" : "Delete table"}
            </Button>
          </>
        }
      />
    </div>
  );
}

export function TablesBoard({ outletId, tables, role }: { outletId: string; tables: TableTileData[]; role: Role }) {
  const connection = useStaffLiveRefresh(outletId, ["tables", "orders"]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"bill" | "qr">("bill");
  const [adding, setAdding] = useState(false);
  const canEdit = role === "owner" || role === "manager";
  const current = tables.find((t) => t.id === openId) ?? null;
  const nextNumber =
    tables.reduce((max, t) => {
      const n = Number(/(\d+)$/.exec(t.label)?.[1] ?? 0);
      return Math.max(max, n);
    }, 0) + 1;
  const counts = {
    occupied: tables.filter((t) => t.status !== "free").length,
    bill: tables.filter((t) => t.status === "bill_requested").length,
  };

  return (
    <PageBody>
      <ConnectionBanner state={connection} />
      <PageHeader
        title="Tables"
        description={tables.length ? `${counts.occupied} of ${tables.length} occupied${counts.bill ? ` · ${counts.bill} asking for the bill` : ""}` : "Each table gets its own QR code."}
        actions={
          <>
            {tables.length ? (
              <Button asChild variant="secondary">
                <a href="/api/tables/qr.pdf">
                  <Download aria-hidden /> All QR codes
                </a>
              </Button>
            ) : null}
            {canEdit ? (
              <Button onClick={() => setAdding(true)}>
                <Plus aria-hidden /> Add tables
              </Button>
            ) : null}
          </>
        }
      />

      {tables.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <EmptyState
            icon={LayoutGrid}
            title="No tables yet"
            description="Add tables, then print their QR codes for guests to scan."
            action={canEdit ? <Button onClick={() => setAdding(true)}>Add tables</Button> : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tables.map((t, i) => (
            <Tile
              key={t.id}
              t={t}
              style={{ "--i": Math.min(i, 12) } as CSSProperties}
              onOpen={() => {
                setOpenId(t.id);
                setView(t.session ? "bill" : "qr");
              }}
            />
          ))}
        </div>
      )}

      {current ? (
        <Sheet
          key={current.id}
          open
          onOpenChange={(o) => !o && setOpenId(null)}
          title={`Table ${current.label}`}
          description={statusMeta[current.status].label}
        >
          <div className="mb-4 inline-flex rounded-md bg-surface-2 p-1" role="tablist" aria-label="Table view">
            {(["bill", "qr"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "press flex h-8 items-center gap-1.5 rounded-sm px-3 text-small font-semibold transition-colors duration-[var(--motion-fast)]",
                  view === v ? "bg-surface text-text shadow-sm" : "text-muted",
                )}
              >
                {v === "bill" ? <Receipt className="size-4" aria-hidden /> : <QrCode className="size-4" aria-hidden />}
                {v === "bill" ? "Bill" : "QR code"}
              </button>
            ))}
          </div>
          {view === "qr" ? (
            <QrPanel t={current} canEdit={canEdit} onDone={() => setOpenId(null)} />
          ) : (
            <SessionPanel table={current} role={role} onClosed={() => setOpenId(null)} />
          )}
        </Sheet>
      ) : null}

      {adding ? <AddTablesDialog open onOpenChange={setAdding} nextNumber={nextNumber} /> : null}
    </PageBody>
  );
}
