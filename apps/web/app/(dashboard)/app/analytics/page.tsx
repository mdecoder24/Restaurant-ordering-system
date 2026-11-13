import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { PageBody } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAnalytics } from "@/lib/analytics/load";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics" };

async function Analytics({ searchParams }: PageProps<"/app/analytics">) {
  const staff = await requireRole(["owner", "manager"]);
  const { range: r } = await searchParams;
  const range = [7, 30, 90].includes(Number(r)) ? Number(r) : 30;
  const { data: outlet } = await (await createClient()).from("outlets").select("timezone").eq("id", staff.outlet.id).single();
  const data = await loadAnalytics(staff.outlet.id, outlet?.timezone ?? "Asia/Kolkata", range);
  return <AnalyticsView data={data} />;
}

export default function AnalyticsPage(props: PageProps<"/app/analytics">) {
  return (
    <Suspense
      fallback={
        <PageBody>
          <Skeleton className="h-9 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-72" />
        </PageBody>
      }
    >
      <Analytics {...props} />
    </Suspense>
  );
}
