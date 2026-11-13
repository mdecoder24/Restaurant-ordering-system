import { ArrowRight, ChefHat, QrCode, Wallet } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LiveTicketDemo } from "@/components/brand/live-ticket-demo";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { previewEnabled } from "@/lib/env";

const features = [
  { icon: QrCode, title: "Scan and order", body: "Every table gets its own QR. No app, no login." },
  { icon: ChefHat, title: "Live kitchen", body: "Tickets land on the KDS the moment they’re placed." },
  { icon: Wallet, title: "Pay at the table", body: "UPI and cards, verified on the server." },
];

/** Stagger index for `.rise-in`; see app/motion.css. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Home() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      {/* Ambient backdrop: dot grid plus two slowly drifting brand glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="dot-grid absolute inset-0" />
        <div className="glow-drift absolute -top-40 -left-32 size-[36rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-primary),transparent)]" />
        <div
          className="glow-drift absolute top-1/3 -right-40 size-[32rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-secondary),transparent)]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-7">
          <div className="rise-in" style={at(0)}>
            <Logo />
          </div>

          <div>
            <h1
              className="rise-in font-display text-display font-extrabold tracking-tight text-balance sm:text-[3.25rem] sm:leading-[1.05]"
              style={at(1)}
            >
              {brand.tagline}
            </h1>
            <p className="rise-in mt-4 max-w-lg text-body text-muted text-pretty" style={at(2)}>
              Guests scan, order and pay from the table. Kitchens and floors run from live screens.
            </p>
          </div>

          {previewEnabled ? (
            <div className="rise-in" style={at(3)}>
              <Button asChild size="lg" className="sheen group">
                <Link href="/preview">
                  Open component preview
                  <ArrowRight
                    aria-hidden
                    className="transition-transform duration-[var(--motion-base)] ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
            </div>
          ) : null}

          <ul className="mt-2 grid w-full gap-4 sm:grid-cols-3">
            {features.map((f, i) => (
              <li key={f.title} className="rise-in" style={at(4 + i)}>
                <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
                  <f.icon aria-hidden className="size-[18px]" strokeWidth={2.25} />
                </span>
                <p className="mt-3 text-small font-semibold">{f.title}</p>
                <p className="mt-0.5 text-small text-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rise-in flex justify-center lg:justify-end" style={at(3)}>
          <div className="relative">
            {/* Stacked back cards give the ticket physical depth. */}
            <div
              aria-hidden
              className="absolute inset-x-6 -bottom-3 h-full rounded-lg border border-border bg-surface/70 shadow-sm"
            />
            <div
              aria-hidden
              className="absolute inset-x-3 -bottom-1.5 h-full rounded-lg border border-border bg-surface/85 shadow-sm"
            />
            <LiveTicketDemo className="relative" />
          </div>
        </div>
      </div>
    </main>
  );
}
