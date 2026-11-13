import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { KdsBoard } from "@/components/kds/kds-board";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth/dal";
import { loadOutletOrders } from "@/lib/orders/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kitchen" };

async function Kitchen({ params }: PageProps<"/kds/[outletId]">) {
  const { outletId } = await params;
  if (!z.uuid().safeParse(outletId).success) redirect("/login");
  const session = await getSession();
  const pin = `/pin/${outletId}?next=/kds/${outletId}`;
  if (session.status !== "ok") redirect(pin);
  // Kitchen screen: owner, manager, kitchen (Flow §13). Waiters have no access.
  if (session.role === "waiter" || !session.outlets.some((o) => o.id === outletId)) redirect(pin);

  const supabase = await createClient();
  const { data: outlet } = await supabase.from("outlets").select("name, ticket_warn_minutes, ticket_overdue_minutes").eq("id", outletId).single();
  const orders = await loadOutletOrders(outletId, ["accepted", "preparing", "ready"]);
  return (
    <KdsBoard
      outletId={outletId}
      outletName={outlet?.name ?? "Kitchen"}
      initial={orders}
      warnMin={outlet?.ticket_warn_minutes ?? 10}
      overdueMin={outlet?.ticket_overdue_minutes ?? 20}
    />
  );
}

/** Kitchen display (K-01 to K-06). Signed in by PIN on a shared device. */
export default function KdsPage(props: PageProps<"/kds/[outletId]">) {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh grid-cols-3 gap-4 p-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-56" />
              <Skeleton className="h-40" />
            </div>
          ))}
        </div>
      }
    >
      <Kitchen {...props} />
    </Suspense>
  );
}
