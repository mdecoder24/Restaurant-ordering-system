import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Small token-only illustrations for the landing page's station cards. Decorative
 * (aria-hidden), not order data, so AGENTS rule 11 does not apply.
 */
export type Station = "guest" | "kitchen" | "floor" | "owner";

const at = (i: number) => ({ "--i": i }) as CSSProperties;

function Bar({ className }: { className?: string }) {
  return <span className={cn("block h-1.5 rounded-pill bg-surface-3", className)} />;
}

function GuestVisual() {
  return (
    <div className="mx-auto w-44 rounded-[1.5rem] border border-border-strong bg-surface p-2 shadow-md">
      <div className="mx-auto mb-2 h-1 w-10 rounded-pill bg-surface-3" />
      <div className="flex flex-col gap-1.5 px-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-sm bg-surface-2 p-1.5">
            <span className={cn("size-2.5 shrink-0 rounded-[3px] border-2", i === 1 ? "border-nonveg" : "border-veg")} />
            <div className="flex flex-1 flex-col gap-1">
              <Bar className="w-4/5" />
              <Bar className="w-2/5" />
            </div>
            <span className="rounded-pill border border-primary/40 px-1.5 text-[0.5625rem] font-bold text-primary">ADD</span>
          </div>
        ))}
      </div>
      <div className="station-bob mt-2 flex items-center justify-between rounded-md bg-primary px-2.5 py-2 text-[0.625rem] font-semibold text-primary-fg">
        <span>3 items</span>
        <span className="tabular">View cart</span>
      </div>
    </div>
  );
}

function KitchenVisual() {
  const cols = [
    { label: "New", tone: "bg-status-placed", n: 2 },
    { label: "Cooking", tone: "bg-status-preparing", n: 3 },
    { label: "Ready", tone: "bg-status-ready", n: 1 },
  ];
  return (
    <div className="grid w-full max-w-64 grid-cols-3 gap-2">
      {cols.map((c, ci) => (
        <div key={c.label} className="flex flex-col gap-1.5">
          <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-muted">
            <span className={cn("size-1.5 rounded-full", c.tone)} />
            {c.label}
          </span>
          {Array.from({ length: c.n }, (_, i) => (
            <div
              key={i}
              style={at(ci * 2 + i)}
              className={cn(
                "rounded-sm border border-border bg-surface p-1.5 shadow-sm",
                ci === 0 && i === 0 && "station-ticket",
              )}
            >
              <Bar className="mb-1 w-1/2 bg-text/20" />
              <Bar className="w-full" />
              <Bar className="mt-1 w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FloorVisual() {
  // Status per table: free, ordering, eating, bill.
  const tables = ["free", "busy", "ready", "busy", "free", "bill", "busy", "free", "ready"] as const;
  const tone = {
    free: "border-border bg-surface text-muted",
    busy: "border-status-preparing/40 bg-status-preparing/10 text-status-preparing",
    ready: "border-status-ready/40 bg-status-ready/10 text-status-ready",
    bill: "border-primary/40 bg-primary-soft text-primary",
  };
  return (
    <div className="grid grid-cols-3 gap-2">
      {tables.map((t, i) => (
        <div
          key={i}
          className={cn(
            "relative grid h-11 w-16 place-items-center rounded-md border text-caption font-bold tabular",
            tone[t],
          )}
        >
          T{i + 1}
          {t === "ready" ? (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-status-ready">
              <span className="ping-ring absolute inset-0 rounded-full bg-status-ready" />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function OwnerVisual() {
  const bars = [38, 52, 44, 70, 62, 88, 76];
  return (
    <div className="w-full max-w-64">
      <div className="mb-3 flex items-baseline justify-between">
        <Bar className="w-16 bg-text/20" />
        <span className="rounded-pill bg-success/10 px-1.5 text-[0.625rem] font-bold text-success">This week</span>
      </div>
      <div className="flex h-24 items-end gap-2 border-b border-border">
        {bars.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%`, ...at(i) }}
            className={cn("station-bar flex-1 origin-bottom rounded-t-[4px]", i === 5 ? "bg-primary" : "bg-primary/25")}
          />
        ))}
      </div>
    </div>
  );
}

export function StationVisual({ station }: { station: Station }) {
  return (
    <div aria-hidden className="grid h-48 place-items-center px-6">
      {station === "guest" ? <GuestVisual /> : null}
      {station === "kitchen" ? <KitchenVisual /> : null}
      {station === "floor" ? <FloorVisual /> : null}
      {station === "owner" ? <OwnerVisual /> : null}
    </div>
  );
}
