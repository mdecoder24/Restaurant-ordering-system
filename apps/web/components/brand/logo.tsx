import { brand } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * Original Krudex mark: a rounded tile whose three corner "finder" squares nod to a QR code,
 * with a bowl-shaped K stroke in the open corner. Uses tokens only.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g className="fill-primary-fg">
        <rect x="6" y="6" width="7" height="7" rx="2" />
        <rect x="19" y="6" width="7" height="7" rx="2" />
        <rect x="6" y="19" width="7" height="7" rx="2" />
      </g>
      <path
        d="M19.5 18.5v8M19.5 22.5l5-4M21.5 21l4 5.5"
        className="stroke-primary-fg"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-display text-h2 font-extrabold tracking-tight">{brand.name}</span>
    </span>
  );
}
