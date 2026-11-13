import { BellRing, CircleCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { LiveTicketDemo } from "@/components/brand/live-ticket-demo";
import { Tilt } from "@/components/motion/tilt";
import { PhoneMock } from "./phone-mock";
import { QrTent } from "./qr-tent";

/** Depth (px) and float phase per layer. Kept in one place so the parallax reads as one space. */
const layer = (z: number, rx: number, ry: number, delay: number) =>
  ({
    "--z": `${z}px`,
    "--rx": `${rx}deg`,
    "--ry": `${ry}deg`,
    animationDelay: `${delay}s`,
  }) as CSSProperties;

/**
 * Landing hero: the order journey as a 3D scene. Phone (guest) at the back, the live kitchen
 * ticket in the middle, the table tent and confirmations floating in front. The whole stage
 * follows the pointer (Tilt, window-tracked) and each layer bobs on its own phase, so depth
 * shows even on touch screens. Decorative and labelled "Example" via the ticket.
 */
export function HeroScene() {
  return (
    <div className="scene-enter relative h-[520px] w-[560px] max-w-none [zoom:0.62] min-[420px]:[zoom:0.72] sm:[zoom:0.9] lg:[zoom:0.92] xl:[zoom:1]">
      {/* Floor glow under the scene */}
      <div
        aria-hidden
        className="absolute inset-x-10 bottom-4 h-24 rounded-full bg-[radial-gradient(closest-side,var(--glow-primary),transparent)] blur-xl"
      />
      <Tilt track="window" max={7} className="absolute inset-0" innerClassName="size-full">
        <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(8deg)_rotateY(-14deg)]">
          <div className="scene-layer absolute top-6 left-0" style={layer(-110, 2, 16, 0)}>
            <PhoneMock />
          </div>

          <div className="scene-layer absolute top-20 -right-2 w-[318px]" style={layer(40, 0, -4, -1.6)}>
            <LiveTicketDemo className="max-w-none" />
          </div>

          <div className="scene-layer absolute bottom-2 left-[96px]" style={layer(130, 0, 10, -3.1)}>
            <QrTent />
          </div>

          <div className="scene-layer absolute top-6 right-16" style={layer(150, 0, -6, -0.8)}>
            <span className="flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-2 text-small font-semibold shadow-lg">
              <CircleCheck aria-hidden className="size-4 text-success" strokeWidth={2.5} />
              Paid · UPI
            </span>
          </div>

          <div className="scene-layer absolute right-4 bottom-12" style={layer(190, 0, -8, -2.4)}>
            <span className="flex items-center gap-2 rounded-pill bg-text px-3 py-2 text-small font-semibold text-bg shadow-lg">
              <BellRing aria-hidden className="size-4" strokeWidth={2.5} />
              Kitchen notified
            </span>
          </div>
        </div>
      </Tilt>
    </div>
  );
}
