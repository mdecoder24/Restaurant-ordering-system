"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { logIn, signUp, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormError } from "./form-error";

export function CredentialsForm({ mode, nextField }: { mode: "login" | "signup"; nextField?: ReactNode }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "login" ? logIn : signUp, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {nextField}
      <FormError message={state.error} />
      <Field label="Email" error={state.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <Field
        label="Password"
        error={state.fieldErrors?.password}
        helper={mode === "signup" ? "At least 8 characters." : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={8}
        />
      </Field>
      <Button type="submit" size="lg" block loading={pending} className="mt-2">
        {mode === "login" ? "Log in" : "Create account"}
      </Button>
      <p className="text-center text-small text-muted">
        {mode === "login" ? (
          <>
            New to Krudex?{" "}
            <Link href="/signup" className="font-semibold text-primary underline-offset-4 hover-fine:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover-fine:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
