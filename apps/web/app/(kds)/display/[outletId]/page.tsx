import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PickupDisplay } from "@/components/canteen/pickup-display";
import { loadPickup } from "@/lib/orders/pickup";

export const metadata: Metadata = { title: "Pickup" };

async function Display({ params }: PageProps<"/display/[outletId]">) {
  const { outletId } = await params;
  if (!z.uuid().safeParse(outletId).success) notFound();
  const data = await loadPickup(outletId);
  if (!data) notFound();
  return <PickupDisplay outletId={outletId} initial={data} />;
}

/** Public token board for canteen outlets (C-03). */
export default function DisplayPage(props: PageProps<"/display/[outletId]">) {
  return (
    <Suspense>
      <Display {...props} />
    </Suspense>
  );
}
