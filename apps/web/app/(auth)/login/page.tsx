import type { Metadata } from "next";
import { Suspense } from "react";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Log in" };

async function LoginForm({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <CredentialsForm mode="login" next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="rise-in">
      <h1 className="font-display text-h1 font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-8 text-body text-muted">Log in to run your outlet.</p>
      <Suspense fallback={<CredentialsForm mode="login" />}>
        <LoginForm {...props} />
      </Suspense>
      <p className="mt-8 rounded-md border border-border bg-surface px-4 py-3 text-small text-muted">
        Kitchen or floor staff? Open the PIN sign-in link your manager shared for your outlet.
      </p>
    </div>
  );
}
