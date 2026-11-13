import type { Metadata } from "next";
import { Suspense } from "react";
import { TenantAdmin, type TenantRow } from "@/components/admin/tenant-admin";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePlatformAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Platform admin" };

async function Admin() {
  const me = await requirePlatformAdmin();
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: tenants }, { data: outlets }, { data: metrics }, { data: audit }] = await Promise.all([
    db.from("tenants").select("id, name, slug, plan, status, gstin, created_at").order("created_at", { ascending: false }),
    db.from("outlets").select("id, tenant_id, mode"),
    db.from("daily_metrics").select("tenant_id, orders, revenue").gte("date", since),
    db.from("admin_audit").select("id, action, tenant_id, created_at, payload").order("created_at", { ascending: false }).limit(15),
  ]);
  const rows: TenantRow[] = (tenants ?? []).map((t) => {
    const m = (metrics ?? []).filter((x) => x.tenant_id === t.id);
    return {
      ...t,
      outlets: (outlets ?? []).filter((o) => o.tenant_id === t.id).length,
      orders30: m.reduce((s, x) => s + x.orders, 0),
      revenue30: m.reduce((s, x) => s + x.revenue, 0),
    };
  });
  const names = new Map(rows.map((r) => [r.id, r.name]));
  return (
    <TenantAdmin
      email={me.email}
      rows={rows}
      audit={(audit ?? []).map((a) => ({ id: a.id, action: a.action, tenant: a.tenant_id ? (names.get(a.tenant_id) ?? "Deleted") : "", at: a.created_at }))}
    />
  );
}

/** Platform admin (A-01): tenants, plans, suspension. Separate from tenant dashboards. */
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-8"><Skeleton className="h-96" /></div>}>
      <Admin />
    </Suspense>
  );
}
