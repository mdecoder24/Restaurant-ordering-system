"use client";

import { formatInr } from "@krudex/core/format";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { DayMetric, ItemStat } from "@/lib/analytics/load";

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** Rounds a max up to a tidy axis ceiling (1, 2, 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/** Positioned in % of the chart box so it tracks the responsive SVG. */
function Tooltip({ x, y, children }: { x: string; y: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-caption shadow-md"
      style={{ left: x, top: `calc(${y} - 8px)` }}
    >
      {children}
    </div>
  );
}

/** Sales over time (single series: the title names it, no legend). Crosshair + tooltip. */
export function RevenueChart({ days }: { days: DayMetric[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 300;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(...days.map((d) => d.revenue)));
  const x = (i: number) => pad.l + (days.length === 1 ? 0 : (i * (W - pad.l - pad.r)) / (days.length - 1));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = days.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.revenue)}`).join(" ");
  const area = `${path} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(days.length / 7);
  const h = hover !== null ? days[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Revenue per day, ${shortDate(days[0]!.date)} to ${shortDate(days.at(-1)!.date)}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (days.length - 1));
          setHover(Math.max(0, Math.min(days.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" className="fill-muted text-[11px] tabular">
              {t >= 100_000 ? `₹${Number((t / 100_000).toFixed(1))}k` : formatInr(Math.round(t / 100) * 100)}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 || i === days.length - 1 ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted text-[11px]">
              {shortDate(d.date)}
            </text>
          ) : null,
        )}
        <path d={area} fill="url(#rev-fill)" />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && hover !== null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--color-border-strong)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.revenue)} r={5} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />
          </g>
        ) : null}
      </svg>
      {h && hover !== null ? (
        <Tooltip x={`${(x(hover) / W) * 100}%`} y={`${(y(h.revenue) / H) * 100}%`}>
          <p className="font-semibold">{shortDate(h.date)}</p>
          <p className="tabular">{formatInr(h.revenue)} · {h.orders} orders</p>
        </Tooltip>
      ) : null}
    </div>
  );
}

/** Top items: horizontal bars, one hue, labels in text ink. */
export function ItemBars({ items, label }: { items: ItemStat[]; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.qty));
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {items.map((it) => (
        <li
          key={it.name}
          className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-small"
          onMouseEnter={() => setHover(it.name)}
          onMouseLeave={() => setHover(null)}
        >
          <span className="truncate" title={it.name}>{it.name}</span>
          <span className="relative h-5 rounded-r-[4px] bg-surface-2">
            <span
              className={cn("absolute inset-y-0 left-0 rounded-r-[4px] bg-primary transition-[opacity] duration-[var(--motion-fast)]", hover && hover !== it.name && "opacity-45")}
              style={{ width: `${(it.qty / max) * 100}%` }}
            />
          </span>
          <span className="w-24 text-right tabular">
            <span className="font-semibold">{it.qty}</span>
            <span className={cn("text-muted transition-opacity", hover === it.name ? "opacity-100" : "opacity-0")}> · {formatInr(it.revenue)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const steps = [0, 18, 36, 58, 80, 100];

/** Orders by hour and weekday: one-hue sequential scale, light to dark. */
export function HeatGrid({ heat }: { heat: number[][] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const max = Math.max(1, ...heat.flat());
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => heat.some((row) => row[h]! > 0) || (h >= 8 && h <= 23));
  const bin = (n: number) => (n === 0 ? 0 : Math.min(5, Math.ceil((n / max) * 5)));
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-[2px] text-caption">
        <caption className="sr-only">Orders by weekday and hour</caption>
        <thead>
          <tr>
            <th />
            {hours.map((h) => (
              <th key={h} scope="col" className="w-7 text-center font-normal text-muted">
                {h % 3 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row, d) => (
            <tr key={d}>
              <th scope="row" className="pr-2 text-right font-normal text-muted">{weekdays[d]}</th>
              {hours.map((h) => {
                const n = row[h]!;
                const b = bin(n);
                return (
                  <td
                    key={h}
                    tabIndex={n ? 0 : -1}
                    onMouseEnter={() => setHover({ d, h })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ d, h })}
                    onBlur={() => setHover(null)}
                    aria-label={`${weekdays[d]} ${h}:00, ${n} orders`}
                    className={cn("relative h-7 w-7 rounded-[4px]", hover?.d === d && hover.h === h && "outline-2 outline-text")}
                    style={{ background: b ? `color-mix(in oklab, var(--color-primary) ${steps[b]}%, var(--color-surface))` : "var(--color-surface-2)" }}
                  >
                    {hover?.d === d && hover.h === h ? (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 whitespace-nowrap shadow-md">
                        {weekdays[d]} {h}:00 · <b className="tabular">{n}</b> orders
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-caption text-muted" aria-hidden>
        Fewer
        {steps.slice(1).map((s) => (
          <span key={s} className="size-3 rounded-[3px]" style={{ background: `color-mix(in oklab, var(--color-primary) ${s}%, var(--color-surface))` }} />
        ))}
        More
      </div>
    </div>
  );
}
