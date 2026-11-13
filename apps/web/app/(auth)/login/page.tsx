import type { Metadata } from "next";
import { Suspense } from "react";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Log in" };

/** Only the hidden `next` field waits on searchParams; the inputs render once and never remount. */
async function NextField({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return typeof next === "string" ? <input type="hidden" name="next" value={next} /> : null;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="rise-in">
      <h1 className="font-display text-h1 font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-8 text-body text-muted">Log in to run your outlet.</p>
      {/* The form used to be a Suspense fallback that got swapped for a second copy once
          searchParams resolved, wiping anything typed or autofilled in between. */}
      <CredentialsForm
        mode="login"
        nextField={
          <Suspense fallback={null}>
            <NextField {...props} />
          </Suspense>
        }
      />
      <p className="mt-8 rounded-md border border-border bg-surface px-4 py-3 text-small text-muted">
        Kitchen or floor staff? Open the PIN sign-in link your manager shared for your outlet.
      </p>
    </div>
  );
}
