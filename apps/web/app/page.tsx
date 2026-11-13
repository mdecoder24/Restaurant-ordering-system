import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  ChefHat,
  KeyRound,
  Printer,
  ReceiptText,
  Ticket,
  UtensilsCrossed,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Logo } from "@/components/brand/logo";
import { HeroScene } from "@/components/marketing/hero-scene";
import { SiteHeader } from "@/components/marketing/site-header";
import { QrTent } from "@/components/marketing/qr-tent";
import { StationVisual, type Station } from "@/components/marketing/station-visual";
import { Tilt } from "@/components/motion/tilt";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { previewEnabled } from "@/lib/env";

/** Stagger index for `.rise-in` / `.reveal`; see app/motion.css. */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: UtensilsCrossed, title: "Build your menu", body: "Categories, variants, add-ons, photos and GST rates. Mark items sold out in one tap." },
  { icon: Printer, title: "Print table QRs", body: "Every table gets its own code and a print-ready tent card. Canteens get a single counter QR." },
  { icon: ChefHat, title: "Run service live", body: "Orders land on the kitchen screen instantly. Floor staff see every table, bill and payment." },
];

const stations: { id: Station; eyebrow: string; title: string; body: string }[] = [
  { id: "guest", eyebrow: "Guests", title: "Scan, order, pay", body: "No app and no login. A fast menu on any phone, with live order tracking." },
  { id: "kitchen", eyebrow: "Kitchen", title: "A screen, not a printer", body: "Tickets arrive with a chime, move with one tap and can be undone." },
  { id: "floor", eyebrow: "Floor", title: "Every table at a glance", body: "Who ordered, what’s ready and who wants the bill, updated in real time." },
  { id: "owner", eyebrow: "Owners", title: "Know your day", body: "Revenue, best sellers and peak hours, per outlet, without a spreadsheet." },
];

const features: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: BadgeIndianRupee, title: "UPI and cards", body: "Payments verified on the server, with refunds from the dashboard." },
  { icon: ReceiptText, title: "GST invoices", body: "CGST and SGST split correctly, invoice numbers per financial year." },
  { icon: Ticket, title: "Canteen tokens", body: "Prepaid counter orders and a public pickup display." },
  { icon: KeyRound, title: "Staff PINs", body: "Kitchen and floor sign in with a 4-digit PIN. Owners stay in control." },
  { icon: Wifi, title: "Built for busy Wi-Fi", body: "Screens reconnect and resync on their own. Orders are never sent twice." },
  { icon: Building2, title: "Many outlets", body: "Switch outlets from one account. Every outlet’s data stays separate." },
];

export default function Home() {
  return (
    <div className="relative isolate overflow-x-clip">
      {/* Ambient backdrop: dot grid plus two slowly drifting brand glows. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem]">
        <div className="dot-grid absolute inset-0" />
        <div className="glow-drift absolute -top-40 -left-32 size-[36rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-primary),transparent)]" />
        <div
          className="glow-drift absolute top-1/4 -right-40 size-[32rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-secondary),transparent)]"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16">
          <div className="flex flex-col items-start gap-7">
            <span
              className="rise-in inline-flex items-center gap-2 rounded-pill border border-border bg-surface/80 px-3 py-1 text-caption font-semibold text-muted shadow-sm"
              style={at(0)}
            >
              <span className="relative size-2 rounded-full bg-success">
                <span className="ping-ring absolute inset-0 rounded-full bg-success" />
              </span>
              Live kitchen, live floor, live bill
            </span>

            <div>
              <h1
                className="rise-in font-display text-display font-extrabold tracking-tight text-balance sm:text-[3.5rem] sm:leading-[1.03]"
                style={at(1)}
              >
                {brand.tagline}
              </h1>
              <p className="rise-in mt-5 max-w-lg text-body text-muted text-pretty sm:text-[1.0625rem]" style={at(2)}>
                Guests scan the table QR, order and pay from their phone. Your kitchen and floor run from live
                screens. You see the whole day in one place.
              </p>
            </div>

            <div className="rise-in flex flex-wrap items-center gap-3" style={at(3)}>
              <Button asChild size="lg" className="sheen group">
                <Link href="/signup">
                  Set up your outlet
                  <ArrowRight
                    aria-hidden
                    className="transition-transform duration-[var(--motion-base)] ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Log in</Link>
              </Button>
            </div>

            <ul className="rise-in flex flex-wrap gap-x-5 gap-y-2 text-small text-muted" style={at(4)}>
              {["No app for guests", "Works on any phone", "Dine-in and canteen"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-1 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>

            {previewEnabled ? (
              <Link
                href="/preview"
                className="rise-in text-caption text-muted underline-offset-4 hover-fine:underline"
                style={at(5)}
              >
                Developer: open component preview
              </Link>
            ) : null}
          </div>

          <div className="flex justify-center lg:justify-end">
            <HeroScene />
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-20 border-t border-border bg-surface-2/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              id="how-title"
              eyebrow="How it works"
              title="From menu to first order in an afternoon"
            />
            <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
              {/* Connector line behind the step numbers (md+). */}
              <span
                aria-hidden
                className="reveal-line absolute top-6 right-[16%] left-[16%] hidden h-px origin-left bg-border-strong md:block"
              />
              {steps.map((s, i) => (
                <li key={s.title} className="reveal-3d relative flex flex-col items-start md:items-center md:text-center" style={at(i)}>
                  <span className="relative grid size-12 place-items-center rounded-full border border-border-strong bg-surface text-primary shadow-sm">
                    <s.icon aria-hidden className="size-5" strokeWidth={2.25} />
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-[0.6875rem] font-bold text-primary-fg tabular">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-4 font-display text-h2 font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 max-w-xs text-small text-muted text-pretty">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Stations */}
        <section id="stations" aria-labelledby="stations-title" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              id="stations-title"
              eyebrow="One system"
              title="A screen for every station"
              body="Guests, kitchen, floor and owners all see the same order, as it happens."
            />
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {stations.map((s, i) => (
                <li key={s.id} className="reveal-3d" style={at(i % 2)}>
                  <Tilt max={6} glare className="h-full" innerClassName="h-full rounded-lg">
                    <div className="h-full overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-shadow duration-[var(--motion-base)] ease-out hover-fine:shadow-lg">
                      <div className="dot-grid-soft border-b border-border bg-surface-2/70">
                        <StationVisual station={s.id} />
                      </div>
                      <div className="p-6">
                        <p className="text-caption font-semibold tracking-wide text-primary uppercase">{s.eyebrow}</p>
                        <h3 className="mt-1 font-display text-h2 font-bold tracking-tight">{s.title}</h3>
                        <p className="mt-1.5 text-small text-muted text-pretty">{s.body}</p>
                      </div>
                    </div>
                  </Tilt>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHeading id="features-title" eyebrow="Everything included" title="The details service depends on" />
            <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <li key={f.title} className="reveal flex gap-4" style={at(i % 3)}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                    <f.icon aria-hidden className="size-5" strokeWidth={2.25} />
                  </span>
                  <div>
                    <h3 className="text-body font-semibold">{f.title}</h3>
                    <p className="mt-1 text-small text-muted text-pretty">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section aria-labelledby="cta-title" className="px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-lg bg-primary px-6 py-14 text-center text-primary-fg shadow-lg sm:px-12 sm:py-16">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="cta-floor absolute inset-x-0 top-1/2 bottom-0">
                <div className="cta-floor-plane">
                  <span />
                </div>
              </div>
              <div className="glow-drift absolute -top-24 -left-16 size-80 rounded-full bg-[radial-gradient(closest-side,var(--glow-secondary),transparent)]" />
            </div>
            <div className="mx-auto mb-8 w-fit [perspective:900px] [zoom:0.7]">
              <QrTent label="Your table" />
            </div>
            <h2 id="cta-title" className="mt-4 font-display text-h1 font-extrabold tracking-tight text-balance sm:text-[2.25rem] sm:leading-tight">
              Your first table QR is ten minutes away
            </h2>
            <p className="mx-auto mt-3 max-w-md text-body opacity-85 text-pretty">
              Create an account, add a few dishes and scan the code with your own phone.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="group border-transparent">
                <Link href="/signup">
                  Get started
                  <ArrowRight
                    aria-hidden
                    className="transition-transform duration-[var(--motion-base)] ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="text-caption text-muted">© {brand.name}. QR ordering for Indian restaurants and canteens.</p>
          </div>
          <nav aria-label="Footer" className="flex gap-5 text-small text-muted sm:ml-auto">
            <Link href="/login" className="hover-fine:text-text">Log in</Link>
            <Link href="/signup" className="hover-fine:text-text">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: string; body?: string }) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      <p className="text-caption font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-2 font-display text-h1 font-extrabold tracking-tight text-balance sm:text-[2.25rem] sm:leading-tight">
        {title}
      </h2>
      {body ? <p className="mt-3 text-body text-muted text-pretty">{body}</p> : null}
    </div>
  );
}
