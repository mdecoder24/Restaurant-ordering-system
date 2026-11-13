"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type FieldIds = { controlId: string; helperId: string; errorId: string; invalid: boolean };
const FieldContext = createContext<FieldIds | null>(null);

/** Wires label, helper and error to the control via ids; consumers read it with useField. */
export function useField(): (FieldIds & { describedBy: string | undefined }) | null {
  const ctx = useContext(FieldContext);
  if (!ctx) return null;
  return { ...ctx, describedBy: ctx.invalid ? ctx.errorId : ctx.helperId };
}

type FieldProps = {
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label above, helper or error below (Design System §6). */
export function Field({ label, helper, error, optional, className, children }: FieldProps) {
  const base = useId();
  const ids = {
    controlId: `${base}-control`,
    helperId: `${base}-helper`,
    errorId: `${base}-error`,
    invalid: Boolean(error),
  };
  return (
    <FieldContext.Provider value={ids}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label htmlFor={ids.controlId} className="text-small font-medium text-text">
          {label}
          {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
        </label>
        {children}
        {error ? (
          <p id={ids.errorId} className="text-small text-danger" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p id={ids.helperId} className="text-small text-muted">
            {helper}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export const controlBase = [
  "w-full rounded-md border border-border-strong bg-surface text-text",
  "placeholder:text-muted",
  "transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-out",
  "hover-fine:border-muted",
  "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25",
  "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60",
  "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25",
].join(" ");
