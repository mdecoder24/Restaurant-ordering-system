"use client";

import { contrastRatio } from "@krudex/core/contrast";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Reads the live token value, so the ratio is always true for the current theme. */
export function TokenSwatch({
  token,
  label,
  against = "--color-surface",
}: {
  token: string;
  label: string;
  against?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<{ value: string; ratio: number | null } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const style = getComputedStyle(el);
      const value = style.getPropertyValue(token).trim();
      const bg = style.getPropertyValue(against).trim();
      let ratio: number | null = null;
      try {
        ratio = contrastRatio(value, bg);
      } catch {
        ratio = null;
      }
      setInfo({ value, ratio });
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, [token, against]);

  const pass = info?.ratio != null && info.ratio >= 4.5;
  return (
    <div ref={ref} className="overflow-hidden rounded-md border border-border bg-surface">
      <div className="h-14 border-b border-border" style={{ background: `var(${token})` }} />
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-small font-semibold">{label}</p>
        <p className="truncate font-mono text-caption text-muted">{token}</p>
        <p className="flex items-center justify-between font-mono text-caption text-muted">
          <span>{info?.value ?? "…"}</span>
          {info?.ratio != null ? (
            <span className={cn("tabular font-semibold", pass ? "text-success" : "text-muted")}>
              {info.ratio.toFixed(2)}
              {pass ? " AA" : ""}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
