import type { OrderStatus } from "@krudex/core/order-status";
import {
  BellRing,
  Check,
  ChefHat,
  CircleDot,
  CircleSlash,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type StatusMeta = { label: string; icon: LucideIcon; className: string };

/** Colour + label + icon for every status: never colour alone (Design System §1.3, §9). */
export const statusMeta: Record<OrderStatus, StatusMeta> = {
  placed: { label: "New", icon: CircleDot, className: "bg-status-placed/12 text-status-placed" },
  accepted: { label: "Accepted", icon: Check, className: "bg-status-accepted/12 text-status-accepted" },
  preparing: { label: "Preparing", icon: ChefHat, className: "bg-status-preparing/12 text-status-preparing" },
  ready: { label: "Ready", icon: BellRing, className: "bg-status-ready/12 text-status-ready" },
  served: { label: "Served", icon: UtensilsCrossed, className: "bg-status-served/12 text-status-served" },
  rejected: { label: "Rejected", icon: CircleSlash, className: "bg-status-cancelled/12 text-status-cancelled" },
  cancelled: { label: "Cancelled", icon: X, className: "bg-status-cancelled/12 text-status-cancelled" },
};

type StatusBadgeProps = { status: OrderStatus; size?: "md" | "lg"; className?: string };

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill font-semibold",
        size === "lg" ? "h-9 px-3.5 text-body [&_svg]:size-5" : "h-6 px-2.5 text-caption [&_svg]:size-3.5",
        meta.className,
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}
