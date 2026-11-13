import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SessionBillView } from "@/components/guest/session-bill";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSessionBill } from "@/lib/guest/bill";
import { provenSessionId, resolveQr } from "@/lib/guest/context";
import { getGateway } from "@/lib/payments";

export const metadata: Metadata = { title: "Your bill" };

async function Bill({ params }: PageProps<"/t/[qrToken]/orders">) {
  const { qrToken } = await params;
  const ctx = await resolveQr(qrToken);
  if (ctx.status === "invalid") redirect("/invalid");
  const outlet = ctx.outlet;
  const sessionId = await provenSessionId(outlet.id);
  if (!sessionId) redirect(`/t/${qrToken}`);
  const bill = await loadSessionBill(sessionId);
  return (
    <SessionBillView
      initial={bill}
      outletId={outlet.id}
      qrToken={qrToken}
      canteen={outlet.mode === "canteen"}
      payOnline={outlet.paymentOptions.online && getGateway() !== null}
      payCash={outlet.paymentOptions.cash}
    />
  );
}

/** Session orders, running bill and payment (G-09, G-10, G-11). */
export default function BillPage(props: PageProps<"/t/[qrToken]/orders">) {
  return (
    <Suspense
      fallback={
        <main className="px-4 pt-14">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-6 h-32" />
          <Skeleton className="mt-4 h-40" />
        </main>
      }
    >
      <Bill {...props} />
    </Suspense>
  );
}
