import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CanteenPanel } from "@/components/canteen/canteen-panel";
import { PageBody } from "@/components/dashboard/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth/dal";
import { loadBoard } from "@/lib/orders/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Counter" };

async function Canteen() {
  const staff = await requireRole(["owner", "manager", "waiter"]);
  if (staff.outlet.mode !== "canteen") redirect("/app/orders");
  const supabase = await createClient();
  const [groups, { data: items }, { data: outlet }] = await Promise.all([
    loadBoard(staff.outlet.id),
    supabase.from("menu_items").select("id, name, available").eq("outlet_id", staff.outlet.id).order("name"),
    supabase.from("outlets").select("payment_options").eq("id", staff.outlet.id).single(),
  ]);
  return (
    <CanteenPanel
      outletId={staff.outlet.id}
      groups={groups}
      items={items ?? []}
      role={staff.role}
      prepaidOnly={Boolean((outlet?.payment_options as { prepaid_only?: boolean } | null)?.prepaid_only)}
    />
  );
}

export default function CanteenPage() {
  return (
    <Suspense fallback={<PageBody><Skeleton className="h-9 w-40" /><div className="grid gap-4 lg:grid-cols-[360px_1fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></PageBody>}>
      <Canteen />
    </Suspense>
  );
}
