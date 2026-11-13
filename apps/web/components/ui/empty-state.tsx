import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/** Icon, one line, one action (Design System §6). */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon className="size-6" aria-hidden strokeWidth={1.75} />
      </div>
      <p className="text-body font-semibold text-text">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-small text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
