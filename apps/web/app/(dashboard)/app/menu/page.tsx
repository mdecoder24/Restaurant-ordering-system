import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody } from "@/components/dashboard/shell";
import { MenuEditor } from "@/components/menu/menu-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { loadStaffMenu } from "@/lib/menu/load";

export const metadata: Metadata = { title: "Menu" };

async function Menu() {
  const staff = await requireRole(["owner", "manager", "waiter"]);
  const { categories, items } = await loadStaffMenu(staff.outlet.id);
  return <MenuEditor categories={categories} items={items} canEdit={staff.role !== "waiter"} />;
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <PageBody>
          <Skeleton className="h-9 w-40" />
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <Skeleton className="h-72" />
            <div className="space-y-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          </div>
        </PageBody>
      }
    >
      <Menu />
    </Suspense>
  );
}
