import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { localDate } from "@/lib/time";

export type DayMetric = { date: string; orders: number; revenue: number; aov: number; avgPrepSeconds: number | null; cancelled: number };
export type ItemStat = { name: string; qty: number; revenue: number };
export type Analytics = {
  range: number;
  days: DayMetric[];
  totals: { orders: number; revenue: number; aov: number; avgPrepSeconds: number | null; cancelled: number };
  previous: { orders: number; revenue: number; aov: number };
  topItems: ItemStat[];
  bottomItems: ItemStat[];
  /** heat[weekday 0=Mon..6=Sun][hour 0..23] = orders */
  heat: number[][];
};

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * D-10 analytics, read from daily_metrics (Architecture §13). Missing days in the range
 * are rolled up on demand; today is refreshed on every view so it is never stale.
 */
export async function loadAnalytics(outletId: string, timezone: string, range: number): Promise<Analytics> {
  const today = localDate(timezone);
  const from = addDays(today, -(range - 1));
  const prevFrom = addDays(from, -range);
  const supabase = await createClient();
  const admin = createAdminClient();

  const existing = await supabase.from("daily_metrics").select("date").eq("outlet_id", outletId).gte("date", prevFrom).lt("date", today);
  const have = new Set((existing.data ?? []).map((r) => r.date));
  const wanted: string[] = [];
  for (let d = prevFrom; d <= today; d = addDays(d, 1)) if (d === today || !have.has(d)) wanted.push(d);
  // Only days that had orders need a row; the function is cheap when there are none.
  await Promise.all(wanted.map((d) => admin.rpc("rollup_daily_metrics", { p_outlet: outletId, p_day: d })));

  const { data } = await supabase
    .from("daily_metrics")
    .select("date, orders, revenue, aov, avg_prep_seconds, cancelled, top_items, hourly")
    .eq("outlet_id", outletId)
    .gte("date", prevFrom)
    .lte("date", today)
    .order("date");
  const rows = data ?? [];
  const current = rows.filter((r) => r.date >= from);
  const prev = rows.filter((r) => r.date < from);

  const byDate = new Map(current.map((r) => [r.date, r]));
  const days: DayMetric[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const r = byDate.get(d);
    days.push({ date: d, orders: r?.orders ?? 0, revenue: r?.revenue ?? 0, aov: r?.aov ?? 0, avgPrepSeconds: r?.avg_prep_seconds ?? null, cancelled: r?.cancelled ?? 0 });
  }

  const sum = (rs: typeof rows, k: "orders" | "revenue" | "cancelled") => rs.reduce((s, r) => s + r[k], 0);
  const orders = sum(current, "orders");
  const revenue = sum(current, "revenue");
  const prepRows = current.filter((r) => r.avg_prep_seconds != null && r.orders > 0);
  const avgPrep = prepRows.length
    ? Math.round(prepRows.reduce((s, r) => s + r.avg_prep_seconds! * r.orders, 0) / prepRows.reduce((s, r) => s + r.orders, 0))
    : null;
  const pOrders = sum(prev, "orders");
  const pRevenue = sum(prev, "revenue");

  const items = new Map<string, ItemStat>();
  for (const r of current) {
    for (const it of (r.top_items as ItemStat[] | null) ?? []) {
      const cur = items.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.revenue;
      items.set(it.name, cur);
    }
  }
  const ranked = [...items.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));

  const heat = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const r of current) {
    const wd = (new Date(`${r.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    for (const [h, n] of Object.entries((r.hourly as Record<string, number> | null) ?? {})) heat[wd]![Number(h)]! += n;
  }

  return {
    range,
    days,
    totals: { orders, revenue, aov: orders ? Math.round(revenue / orders) : 0, avgPrepSeconds: avgPrep, cancelled: sum(current, "cancelled") },
    previous: { orders: pOrders, revenue: pRevenue, aov: pOrders ? Math.round(pRevenue / pOrders) : 0 },
    topItems: ranked.slice(0, 8),
    // Slowest sellers never repeat a top item.
    bottomItems: ranked.slice(Math.max(8, ranked.length - 5)).reverse(),
    heat,
  };
}
