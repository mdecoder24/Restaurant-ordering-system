import Link from "next/link";
import { LiveTicketDemo } from "@/components/brand/live-ticket-demo";
import { Logo } from "@/components/brand/logo";
import { Toaster } from "@/components/ui/toaster";

/** Staff auth: form on the left, a calm brand panel on the right from lg up. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-density="dashboard" className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <Link href="/" className="self-start rounded-md" aria-label="Krudex home">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</main>
      </div>
      <aside aria-hidden className="relative isolate hidden overflow-hidden border-l border-border bg-surface-2 lg:grid lg:place-items-center">
        <div className="dot-grid absolute inset-0 -z-10" />
        <div className="glow-drift absolute -top-24 -right-24 -z-10 size-[30rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-primary),transparent)]" />
        <div className="rise-in flex flex-col items-center gap-8 px-10">
          <LiveTicketDemo />
          <p className="max-w-xs text-center text-small text-muted">
            Orders from every table, straight to your kitchen. Live.
          </p>
        </div>
      </aside>
      <Toaster />
    </div>
  );
}
