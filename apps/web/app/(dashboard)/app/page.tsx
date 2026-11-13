import { formatInr } from "@krudex/core/format";
import { ArrowRight, CircleCheck, CircleDashed, ClipboardList, IndianRupee, Receipt, Timer, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/server";
import { startOfLocalDay } from "@/lib/time";
import { requestNow } from "@/lib/time/server";

export const metadata: Metadata = { title: "Home" };

const at = (i: number) => ({ "--i": i }) as CSSProperties;

async function Home() {
  const staff = await requireRole(["owner", "manager"]);
  const supabase = await createClient();
  const outletId = staff.outlet.id;
  const { data: outlet } = await supabase.from("outlets").select("timezone, ticket_overdue_minutes, mode").eq("id", outletId).single();
  const tz = outlet?.timezone ?? "Asia/Kolkata";
  const since = startOfLocalDay(tz);

  const [today, live, items, tables, staffCount, everOrder] = await Promise.all([
    supabase.from("orders").select("total, status").eq("outlet_id", outletId).gte("placed_at", since),
    supabase.from("orders").select("id, status, placed_at, order_no").eq("outlet_id", outletId).in("status", ["placed", "accepted", "preparing", "ready"]),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("outlet_id", outletId),
    supabase.from("tables").select("id", { count: "exact", head: true }).eq("outlet_id", outletId),
    supabase.from("members").select("id", { count: "exact", head: true }).eq("tenant_id", staff.outlet.tenantId),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("outlet_id", outletId),
  ]);

  const valid = (today.data ?? []).filter((o) => o.status !== "rejected" && o.status !== "cancelled");
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const aov = valid.length ? Math.round(revenue / valid.length) : 0;
  const overdueMs = (outlet?.ticket_overdue_minutes ?? 20) * 60_000;
  const now = await requestNow();
  const stuck = (live.data ?? []).filter(
    (o) => (o.status === "placed" && now - Date.parse(o.placed_at) > 5 * 60_000) || now - Date.parse(o.placed_at) > overdueMs,
  );

  const checklist = [
    { done: (items.count ?? 0) > 0, label: "Build your menu", href: "/app/menu" },
    ...(outlet?.mode === "canteen"
      ? [{ done: true, label: "Print your counter QR", href: "/app/settings" }]
      : [{ done: (tables.count ?? 0) > 0, label: "Add tables and print QR codes", href: "/app/tables" }]),
    { done: (staffCount.count ?? 0) > 1, label: "Invite staff and set PINs", href: "/app/staff" },
    { done: (everOrder.count ?? 0) > 0, label: "Place a test order from your phone", href: outlet?.mode === "canteen" ? "/app/settings" : "/app/tables" },
  ];
  const remaining = checklist.filter((c) => !c.done).length;

  return (
    <PageBody>
      <PageHeader
        title={`Hello, ${staff.displayName.split(" ")[0]}`}
        description={`Here’s ${staff.outlet.name} today.`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/app/orders">
              Open live orders <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />

      {remaining > 0 ? (
        <section aria-labelledby="setup-title" className="rise-in rounded-lg border border-border bg-surface p-5 shadow-sm" style={at(0)}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="setup-title" className="text-h2 font-semibold tracking-tight">Get ready for service</h2>
            <p className="text-small text-muted tabular">
              {checklist.length - remaining} of {checklist.length} done
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-surface-3">
            <div
              className="h-full origin-left rounded-pill bg-primary transition-transform duration-[var(--motion-slow)] ease-out"
              style={{ transform: `scaleX(${(checklist.length - remaining) / checklist.length})` }}
            />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link
                  href={c.href}
                  className={cn(
                    "press flex items-center gap-3 rounded-md border px-3 py-2.5 text-small font-medium transition-colors duration-[var(--motion-fast)]",
                    c.done ? "border-transparent bg-surface-2 text-muted line-through" : "border-border hover-fine:border-primary hover-fine:text-primary",
                  )}
                >
                  {c.done ? <CircleCheck className="size-5 text-success" aria-label="Done" /> : <CircleDashed className="size-5 text-muted" aria-label="To do" />}
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Today" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard className="rise-in" style={at(1)} label="Orders today" value={String(valid.length)} icon={ClipboardList} hint={`${(today.data?.length ?? 0) - valid.length} cancelled or rejected`} />
        <KpiCard className="rise-in" style={at(2)} label="Revenue today" value={formatInr(revenue)} icon={IndianRupee} hint="Incl. taxes" />
        <KpiCard className="rise-in" style={at(3)} label="Average order" value={formatInr(aov)} icon={Receipt} />
        <KpiCard className="rise-in" style={at(4)} label="In progress" value={String(live.data?.length ?? 0)} icon={Timer} hint="Placed to ready" />
      </section>

      <section aria-labelledby="attention-title" className="rise-in rounded-lg border border-border bg-surface shadow-sm" style={at(5)}>
        <h2 id="attention-title" className="border-b border-border px-5 py-3 text-small font-semibold">Needs attention</h2>
        {stuck.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-small text-muted">
            <CircleCheck className="size-5 text-success" aria-hidden /> Nothing stuck. Orders are moving.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {stuck.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-5 py-3 text-small">
                <TriangleAlert className="size-4 text-warning" aria-hidden />
                <span className="font-semibold tabular">#{o.order_no}</span>
                <span className="text-muted">
                  {o.status === "placed" ? "waiting to be accepted" : `still ${o.status}`} for {Math.round((now - Date.parse(o.placed_at)) / 60_000)} min
                </span>
                <Link href="/app/orders" className="ml-auto font-semibold text-primary">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageBody>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <PageBody>
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </PageBody>
      }
    >
      <Home />
    </Suspense>
  );
}
