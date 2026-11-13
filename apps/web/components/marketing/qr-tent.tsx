import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/cn";

const N = 21;

/**
 * Decorative QR-like pattern: three finder squares plus seeded noise. It is deliberately not a
 * scannable code, so it can never point anyone anywhere.
 */
function pattern(seed: number) {
  const cells: [number, number][] = [];
  let s = seed;
  const rand = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rand() > 0.52) cells.push([x, y]);
  return cells;
}
const cells = pattern(7);
const finders = [
  [0, 0],
  [N - 7, 0],
  [0, N - 7],
] as const;

function QrFace() {
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className="size-full" aria-hidden shapeRendering="crispEdges">
      <g className="fill-text">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ))}
        {finders.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <rect x={x} y={y} width="7" height="7" rx="1.2" />
            <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.8" className="fill-surface" />
            <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * A folded table tent in real 3D: two panels hinged on a shared top edge. The front shows the
 * QR, the back panel only appears as the tent sways, which is what sells the depth.
 */
export function QrTent({ className, label = "Table 7" }: { className?: string; label?: string }) {
  return (
    <div aria-hidden className={cn("tent-sway relative h-44 w-36 [transform-style:preserve-3d]", className)}>
      {/* Back panel */}
      <div className="absolute inset-0 origin-top rounded-md border border-border-strong bg-surface-2 shadow-md [transform:rotateX(24deg)_translateZ(-1px)] [backface-visibility:hidden]" />
      {/* Front panel */}
      <div className="absolute inset-0 flex origin-top flex-col items-center rounded-md border border-border-strong bg-surface p-3 shadow-lg [transform:rotateX(-24deg)]">
        <div className="flex items-center gap-1.5">
          <LogoMark className="size-4" />
          <span className="text-[0.625rem] font-bold tracking-wide uppercase">Scan to order</span>
        </div>
        <div className="mt-2 w-full rounded-sm bg-surface p-1">
          <QrFace />
        </div>
        <span className="mt-auto text-caption font-bold tabular">{label}</span>
      </div>
      {/* Contact shadow on the table */}
      <div className="absolute -bottom-3 left-1/2 h-6 w-40 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-text)_22%,transparent),transparent)] [transform:translateX(-50%)_rotateX(80deg)]" />
    </div>
  );
}
