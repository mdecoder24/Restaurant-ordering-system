import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GuestMenuView } from "@/components/guest/guest-menu";
import { MenuSkeleton } from "@/components/guest/menu-skeleton";
import { currentGuestSession, resolveQr } from "@/lib/guest/context";
import { getGuestMenu } from "@/lib/guest/menu";

export const metadata: Metadata = { title: "Menu" };

async function Menu({ params }: PageProps<"/t/[qrToken]">) {
  const { qrToken } = await params;
  const ctx = await resolveQr(qrToken);
  if (ctx.status === "invalid") redirect("/invalid");
  if (ctx.status === "closed") redirect(`/closed?o=${ctx.outlet.id}&r=${ctx.reason}`);
  const [menu, session] = await Promise.all([getGuestMenu(ctx.outlet.id), currentGuestSession(ctx.outlet.id)]);
  return (
    <GuestMenuView
      qrToken={qrToken}
      menu={menu}
      hasSession={Boolean(session)}
      outlet={{
        id: ctx.outlet.id,
        tenantName: ctx.outlet.tenantName,
        name: ctx.outlet.name,
        mode: ctx.outlet.mode,
        tableLabel: ctx.table?.label ?? null,
        taxConfig: ctx.outlet.taxConfig,
        serviceChargeBps: ctx.outlet.serviceChargeBps,
      }}
    />
  );
}

/** Guest entry point from a table QR (G-01): no install, no login. */
export default function GuestMenuPage(props: PageProps<"/t/[qrToken]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <Menu {...props} />
    </Suspense>
  );
}
