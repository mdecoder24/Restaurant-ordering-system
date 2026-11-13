import type { Metadata } from "next";
import { CredentialsForm } from "@/components/auth/credentials-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="rise-in">
      <h1 className="font-display text-h1 font-bold tracking-tight">Set up your restaurant</h1>
      <p className="mt-1 mb-8 text-body text-muted">Create the owner account. You’ll add your outlet next.</p>
      <CredentialsForm mode="signup" />
    </div>
  );
}
