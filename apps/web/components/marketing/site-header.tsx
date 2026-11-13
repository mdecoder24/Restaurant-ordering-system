import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#stations", label: "Stations" },
  { href: "#features", label: "Features" },
];

/** Marketing header: sticky, translucent so the hero glow shows through while scrolling. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border/60 bg-bg/75 backdrop-blur-md supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="rounded-md" aria-label="Krudex home">
          <Logo />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-small font-medium text-muted transition-colors duration-[var(--motion-fast)] hover-fine:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
