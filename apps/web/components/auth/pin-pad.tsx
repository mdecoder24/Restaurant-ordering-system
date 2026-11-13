"use client";

import { Delete } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { pinLogIn, type FormState } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { FormError } from "./form-error";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

/** Large-target PIN pad for shared kitchen and floor devices. Typing digits also works. */
export function PinPad({ outletId, outletName, next }: { outletId: string; outletName: string; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(pinLogIn, {});
  const [pin, setPin] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const press = (k: string) => {
    if (pending) return;
    if (k === "del") setPin((p) => p.slice(0, -1));
    else if (k && pin.length < 6) setPin((p) => p + k);
  };

  return (
    <form
      ref={formRef}
      action={(fd) => {
        // The PIN is already captured in the form data; clear the dots for the next try.
        action(fd);
        setPin("");
      }}
      className="flex flex-col items-center gap-6"
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) press(e.key);
        else if (e.key === "Backspace") press("del");
        else if (e.key === "Enter" && pin.length >= 4) formRef.current?.requestSubmit();
      }}
    >
      <input type="hidden" name="outletId" value={outletId} />
      <input type="hidden" name="pin" value={pin} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="text-center">
        <p className="text-small text-muted">{outletName}</p>
        <h1 className="mt-1 font-display text-h1 font-bold tracking-tight">Enter your PIN</h1>
      </div>
      <div className="flex h-4 items-center gap-3" aria-live="polite" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-[var(--motion-fast)] ease-out",
              i < pin.length ? "scale-110 border-primary bg-primary" : i < 4 ? "border-border-strong" : "border-border",
            )}
          />
        ))}
      </div>
      <div className="w-full max-w-xs">
        <FormError message={state.error} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "del" ? "Delete digit" : k}
              className="press grid size-18 place-items-center rounded-full bg-surface text-h1 font-semibold shadow-sm ring-1 ring-border transition-[background-color] duration-[var(--motion-fast)] ease-out hover-fine:bg-surface-2 active:bg-surface-3"
            >
              {k === "del" ? <Delete className="size-6" aria-hidden /> : k}
            </button>
          ),
        )}
      </div>
      <button
        type="submit"
        disabled={pin.length < 4 || pending}
        className="press h-14 w-full max-w-xs rounded-lg bg-primary text-h2 font-semibold text-primary-fg shadow-[var(--shadow-sm),var(--highlight-inset)] transition-opacity duration-[var(--motion-fast)] disabled:opacity-40"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
