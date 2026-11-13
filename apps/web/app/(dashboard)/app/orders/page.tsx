import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { OrdersBoard } from "@/components/orders/orders-board";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { loadBoard } from "@/lib/orders/load";

export const metadata: Metadata = { title: "Live orders" };

async function Board() {
  const staff = await requireRole(["owner", "manager", "waiter"]);
  const groups = await loadBoard(staff.outlet.id);
  return <OrdersBoard outletId={staff.outlet.id} groups={groups} role={staff.role} canteen={staff.outlet.mode === "canteen"} />;
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <PageBody>
          <Skeleton className="h-9 w-48" />
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </PageBody>
      }
    >
      <Board />
    </Suspense>
  );
}
