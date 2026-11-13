"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type TiltProps = {
  children: ReactNode;
  className?: string;
  /** Classes for the rotating layer (e.g. rounding so the glare matches the card). */
  innerClassName?: string;
  /** Maximum rotation in degrees at the edge of the tracked area. */
  max?: number;
  /** Soft light that follows the pointer across the surface. */
  glare?: boolean;
  /** "self": react while the pointer is over this element. "window": react to the pointer anywhere (hero scenes). */
  track?: "self" | "window";
};

/**
 * Pointer-driven 3D tilt. Decorative: fine pointers only, off under reduced motion, and the
 * resting state is flat so touch users see the same layout. The angle eases towards the
 * pointer each frame (a critically damped follow), so it keeps momentum when the pointer
 * changes direction instead of snapping. Writes `transform` on the layer itself rather than a
 * CSS variable, so children are not restyled every frame.
 */
export function Tilt({ children, className, innerClassName, max = 8, glare = false, track = "self" }: TiltProps) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const o = outer.current;
    const el = inner.current;
    if (!o || !el) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!mq.matches) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;

    const tick = () => {
      x += (tx - x) * 0.1;
      y += (ty - y) * 0.1;
      el.style.transform = `rotateX(${(-y * max).toFixed(3)}deg) rotateY(${(x * max).toFixed(3)}deg)`;
      if (light.current) {
        light.current.style.transform = `translate3d(${(x * 35).toFixed(2)}%, ${(y * 35).toFixed(2)}%, 0)`;
        light.current.style.opacity = Math.min(1, Math.hypot(x, y) * 1.4).toFixed(3);
      }
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = o.getBoundingClientRect();
      if (track === "window") {
        // Normalise against the viewport so the whole hero feels like one space.
        tx = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
        ty = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
      } else {
        tx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2);
        ty = clamp(((e.clientY - r.top) / r.height - 0.5) * 2);
      }
      kick();
    };
    const reset = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    const target: HTMLElement | Window = track === "window" ? window : o;
    target.addEventListener("pointermove", move as EventListener);
    if (track === "window") document.documentElement.addEventListener("pointerleave", reset);
    else o.addEventListener("pointerleave", reset);
    return () => {
      target.removeEventListener("pointermove", move as EventListener);
      document.documentElement.removeEventListener("pointerleave", reset);
      o.removeEventListener("pointerleave", reset);
      cancelAnimationFrame(raf);
    };
  }, [max, track]);

  return (
    <div ref={outer} className={cn("[perspective:1100px]", className)}>
      <div ref={inner} className={cn("relative [transform-style:preserve-3d] will-change-transform", innerClassName)}>
        {children}
        {glare ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <div
              ref={light}
              className="absolute -inset-1/2 opacity-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--color-surface)_55%,transparent),transparent_45%)] mix-blend-soft-light"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
