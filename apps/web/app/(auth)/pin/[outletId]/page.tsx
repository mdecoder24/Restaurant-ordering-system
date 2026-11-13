import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PinPad } from "@/components/auth/pin-pad";
import { Skeleton } from "@/components/ui/skeleton";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Staff sign-in" };

async function Pad({ params, searchParams }: PageProps<"/pin/[outletId]">) {
  const { outletId } = await params;
  const { next } = await searchParams;
  if (!z.uuid().safeParse(outletId).success) notFound();
  const { data: outlet } = await createAdminClient().from("outlets").select("name").eq("id", outletId).maybeSingle();
  if (!outlet) notFound();
  return <PinPad outletId={outletId} outletName={outlet.name} next={typeof next === "string" ? next : undefined} />;
}

export default function PinPage(props: PageProps<"/pin/[outletId]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-[560px] w-72" />}>
      <Pad {...props} />
    </Suspense>
  );
}
