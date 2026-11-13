import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  [
    "press hit-area inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap",
    "font-semibold select-none",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-[var(--motion-fast)] ease-out",
    "disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--icon-size)]",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg shadow-sm hover-fine:bg-primary-hover data-[loading=true]:bg-primary-hover",
        secondary:
          "border border-border-strong bg-surface text-text shadow-sm hover-fine:bg-surface-2 active:bg-surface-3",
        ghost: "bg-transparent text-text hover-fine:bg-surface-2 active:bg-surface-3",
        danger:
          "bg-danger text-on-solid shadow-sm hover-fine:brightness-110 active:brightness-95",
        soft: "bg-primary-soft text-primary hover-fine:brightness-[0.97] active:brightness-95",
      },
      size: {
        sm: "h-[var(--control-h-sm)] rounded-sm px-3 text-small",
        md: "h-[var(--control-h)] rounded-md px-4 text-body",
        lg: "h-[var(--control-h-lg)] rounded-md px-5 text-body",
        xl: "h-16 min-w-40 rounded-lg px-7 text-h2 [&_svg:not([class*='size-'])]:size-7",
      },
      // Block buttons may shrink so they share a row (e.g. stepper + "Add ₹X") without overflowing.
      block: { true: "w-full min-w-0 shrink" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Spinner replaces the label; width stays fixed and the button is inert. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-loading={loading || undefined}
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, block }), "relative", className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          <span
            className={cn(
              "inline-flex items-center justify-center gap-2",
              block && "w-full",
              loading && "invisible",
            )}
          >
            {children}
          </span>
          {loading ? (
            <span className="absolute inset-0 grid place-items-center">
              <Spinner label="Loading" />
            </span>
          ) : null}
        </>
      )}
    </Comp>
  );
}
