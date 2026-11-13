import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Set up your outlet" };

async function Gate() {
  const session = await getSession();
  if (session.status === "signed-out") redirect("/login?next=/onboarding");
  if (session.status === "ok") redirect("/app");
  return <OnboardingForm />;
}

export default function OnboardingPage() {
  return (
    <div className="rise-in">
      <p className="text-caption font-semibold tracking-wide text-primary uppercase">Step 1 of 1</p>
      <h1 className="mt-1 font-display text-h1 font-bold tracking-tight">Tell us about your business</h1>
      <p className="mt-1 mb-8 text-body text-muted">Takes a minute. Everything here can be changed later in Settings.</p>
      <Suspense fallback={<Skeleton className="h-[520px] w-full" />}>
        <Gate />
      </Suspense>
    </div>
  );
}
