import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { TablesBoard } from "@/components/tables/tables-board";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { loadTables } from "@/lib/tables/load";

export const metadata: Metadata = { title: "Tables" };

async function Tables() {
  const staff = await requireRole(["owner", "manager", "waiter"]);
  if (staff.outlet.mode === "canteen") redirect("/app/canteen");
  const tables = await loadTables(staff.outlet.id);
  return <TablesBoard outletId={staff.outlet.id} tables={tables} role={staff.role} />;
}

export default function TablesPage() {
  return (
    <Suspense
      fallback={
        <PageBody>
          <Skeleton className="h-9 w-40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        </PageBody>
      }
    >
      <Tables />
    </Suspense>
  );
}
