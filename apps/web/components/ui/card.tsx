import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type CardProps = ComponentProps<"div"> & {
  /** Lifts on pointer hover and presses on tap. Use only when the whole card is a target. */
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      data-interactive={interactive || undefined}
      className={cn(
        "rounded-md border border-border bg-surface shadow-sm",
        interactive && [
          "transition-[transform,box-shadow,border-color] duration-[var(--motion-base)] ease-out",
          "hover-fine:-translate-y-0.5 hover-fine:border-border-strong hover-fine:shadow-md",
          "active:translate-y-0 active:scale-[0.99] active:duration-[var(--motion-fast)]",
        ],
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-4 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={cn("text-h2 font-semibold tracking-tight", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}
