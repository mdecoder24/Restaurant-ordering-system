import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Button, type buttonVariants } from "./button";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "aria-label" | "block"> &
  VariantProps<typeof buttonVariants> & {
    /** Required: icon-only controls have no visible text. */
    "aria-label": string;
  };

const square = {
  sm: "w-[var(--control-h-sm)] px-0",
  md: "w-[var(--control-h)] px-0",
  lg: "w-[var(--control-h-lg)] px-0",
  xl: "w-16 min-w-0 px-0",
} as const;

export function IconButton({ className, size, variant = "ghost", ...props }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(square[size ?? "md"], className)}
      {...props}
    />
  );
}
