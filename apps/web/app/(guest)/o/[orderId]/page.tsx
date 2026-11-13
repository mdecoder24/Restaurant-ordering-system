import { Smartphone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { OrderTracker, type TrackedOrder } from "@/components/guest/order-tracker";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { provenSessionId } from "@/lib/guest/context";
import { entryTokenForSession } from "@/lib/guest/entry";
import { loadGuestOrder } from "@/lib/guest/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Your order" };

async function Tracker({ params }: PageProps<"/o/[orderId]">) {
  const { orderId } = await params;
  if (!z.uuid().safeParse(orderId).success) notFound();
  const admin = createAdminClient();
  const { data: o } = await admin.from("orders").select("outlet_id, table_sessions(table_id, token_no, outlet_id), outlets(mode)").eq("id", orderId).maybeSingle();
  if (!o || !o.table_sessions) notFound();
  const sessionId = await provenSessionId(o.outlet_id);
  const order = sessionId ? await loadGuestOrder(orderId, sessionId) : null;
  if (!order) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <EmptyState icon={Smartphone} title="Open this on the phone that ordered" description="For privacy, orders can only be tracked from the device that placed them or shares the table." />
      </main>
    );
  }
  const entry = await entryTokenForSession(o.table_sessions);
  return (
    <OrderTracker
      initial={order as unknown as TrackedOrder}
      qrToken={entry.qrToken}
      canteen={o.outlets?.mode === "canteen"}
      tokenNo={o.table_sessions.token_no}
      tableLabel={entry.tableLabel}
    />
  );
}

/** Live order tracking (G-08). */
export default function OrderPage(props: PageProps<"/o/[orderId]">) {
  return (
    <Suspense
      fallback={
        <main className="px-4 pt-14" aria-busy="true">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-8 space-y-6">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </main>
      }
    >
      <Tracker {...props} />
    </Suspense>
  );
}
