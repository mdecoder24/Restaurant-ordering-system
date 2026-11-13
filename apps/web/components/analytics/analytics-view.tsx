"use client";

import { formatInr } from "@krudex/core/format";
import { BarChart3, ChefHat, ClipboardList, IndianRupee, Receipt, Table2 } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Analytics } from "@/lib/analytics/load";
import { cn } from "@/lib/cn";
import { HeatGrid, ItemBars, RevenueChart } from "./charts";

const ranges = [7, 30, 90] as const;
const at = (i: number) => ({ "--i": i }) as CSSProperties;

function delta(cur: number, prev: number) {
  if (!prev) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { value: `${pct >= 0 ? "+" : ""}${pct}%`, positive: pct >= 0 };
}

function Card({ title, children, className, style }: { title: string; children: React.ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section aria-label={title} className={cn("rise-in rounded-lg border border-border bg-surface p-5 shadow-sm", className)} style={style}>
      <h2 className="mb-4 text-small font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function AnalyticsView({ data }: { data: Analytics }) {
  const [tableView, setTableView] = useState(false);
  const empty = data.totals.orders === 0;
  const prep = data.totals.avgPrepSeconds;
  return (
    <PageBody>
      <PageHeader
        title="Analytics"
        description={`Last ${data.range} days, compared with the ${data.range} days before.`}
        actions={
          <div className="inline-flex rounded-md bg-surface-2 p-1" role="tablist" aria-label="Date range">
            {ranges.map((r) => (
              <Link
                key={r}
                href={`/app/analytics?range=${r}`}
                role="tab"
                aria-selected={data.range === r}
                className={cn("press flex h-8 items-center rounded-sm px-3 text-small font-semibold", data.range === r ? "bg-surface shadow-sm" : "text-muted")}
              >
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard className="rise-in" style={at(0)} label="Revenue" value={formatInr(data.totals.revenue)} icon={IndianRupee} delta={delta(data.totals.revenue, data.previous.revenue)} hint="vs previous period" />
        <KpiCard className="rise-in" style={at(1)} label="Orders" value={String(data.totals.orders)} icon={ClipboardList} delta={delta(data.totals.orders, data.previous.orders)} hint={`${data.totals.cancelled} cancelled`} />
        <KpiCard className="rise-in" style={at(2)} label="Average order" value={formatInr(data.totals.aov)} icon={Receipt} delta={delta(data.totals.aov, data.previous.aov)} />
        <KpiCard className="rise-in" style={at(3)} label="Avg prep time" value={prep == null ? "–" : `${Math.floor(prep / 60)}m ${prep % 60}s`} icon={ChefHat} hint="Accepted to ready" />
      </div>

      {empty ? (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <EmptyState icon={BarChart3} title="No data for this range" description="Charts fill in as orders are served." />
        </div>
      ) : (
        <>
          <Card title="Revenue per day" style={at(4)}>
            <div className="mb-3 flex justify-end">
              <Button size="sm" variant="ghost" aria-pressed={tableView} onClick={() => setTableView((v) => !v)}>
                <Table2 aria-hidden /> {tableView ? "Show chart" : "Show table"}
              </Button>
            </div>
            {tableView ? (
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.days.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell className="text-right tabular">{d.orders}</TableCell>
                        <TableCell className="text-right tabular">{formatInr(d.revenue)}</TableCell>
                        <TableCell className="text-right tabular">{formatInr(d.aov)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <RevenueChart days={data.days} />
            )}
          </Card>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card title="Top items by quantity" style={at(5)}>
              <ItemBars items={data.topItems} label="Top items" />
              {data.bottomItems.length ? (
                <>
                  <h3 className="mt-6 mb-3 text-small font-semibold text-muted">Slowest sellers</h3>
                  <ItemBars items={data.bottomItems} label="Slowest sellers" />
                </>
              ) : null}
            </Card>
            <Card title="Peak hours" style={at(6)}>
              <HeatGrid heat={data.heat} />
            </Card>
          </div>
        </>
      )}
    </PageBody>
  );
}
