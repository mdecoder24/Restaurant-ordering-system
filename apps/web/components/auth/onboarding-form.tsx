"use client";

import { Store, UtensilsCrossed } from "lucide-react";
import { useActionState, useState } from "react";
import { completeOnboarding, type FormState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { FormError } from "./form-error";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const modes = [
  { value: "dine_in", label: "Dine-in", hint: "Guests order from a table QR; served at the table.", icon: UtensilsCrossed },
  { value: "canteen", label: "Canteen / counter", hint: "Guests get a token and collect at the counter.", icon: Store },
] as const;

export function OnboardingForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(completeOnboarding, {});
  const v = state.values ?? {};
  const [name, setName] = useState(v.businessName ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(v.slug));
  const [mode, setMode] = useState<string>(v.mode || "dine_in");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormError message={state.error} />
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-caption font-semibold tracking-wide text-muted uppercase">Business</legend>
        <Field label="Business name" error={state.fieldErrors?.businessName}>
          <Input
            name="businessName"
            required
            autoComplete="organization"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Short name" helper="Used in links. Lowercase letters, numbers and hyphens." error={state.fieldErrors?.slug}>
          <Input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </Field>
        <Field label="GSTIN" optional helper="Printed on GST invoices. You can add it later." error={state.fieldErrors?.gstin}>
          <Input name="gstin" defaultValue={v.gstin} autoCapitalize="characters" maxLength={15} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-caption font-semibold tracking-wide text-muted uppercase">First outlet</legend>
        <Field label="Outlet name" helper="e.g. the area or branch." error={state.fieldErrors?.outletName}>
          <Input name="outletName" required defaultValue={v.outletName} />
        </Field>
        <div role="radiogroup" aria-label="How guests order" className="grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="mode" value={mode} />
          {modes.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={mode === m.value}
              onClick={() => setMode(m.value)}
              className={cn(
                "press flex flex-col items-start gap-1 rounded-md border p-3 text-left",
                "transition-[border-color,background-color,box-shadow] duration-[var(--motion-fast)] ease-out",
                mode === m.value
                  ? "border-primary bg-primary-soft shadow-[0_0_0_1px_var(--color-primary)]"
                  : "border-border-strong bg-surface hover-fine:bg-surface-2",
              )}
            >
              <m.icon className={cn("size-5", mode === m.value ? "text-primary" : "text-muted")} aria-hidden />
              <span className="text-small font-semibold">{m.label}</span>
              <span className="text-caption text-muted">{m.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <Field label="Your name" helper="Shown to your staff." error={state.fieldErrors?.displayName}>
        <Input name="displayName" required autoComplete="name" defaultValue={v.displayName} />
      </Field>

      <Button type="submit" size="lg" block loading={pending} className="mt-2">
        Create my outlet
      </Button>
    </form>
  );
}
