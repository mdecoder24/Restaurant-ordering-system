import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Label, value and optional delta vs previous period (Design System §6). */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  className,
  style,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  delta?: { value: string; positive: boolean } | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-sm", className)} style={style}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-medium text-muted">{label}</p>
        <span className="grid size-8 place-items-center rounded-md bg-surface-2 text-muted">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-[1.75rem] leading-9 font-bold tracking-tight tabular">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-caption">
        {delta ? (
          <span className={cn("font-semibold", delta.positive ? "text-success" : "text-danger")}>{delta.value}</span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
