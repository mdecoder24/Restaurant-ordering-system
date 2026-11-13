import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";
import { previewEnabled } from "@/lib/env";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-6 px-6">
      <Logo />
      <div>
        <h1 className="font-display text-display font-extrabold tracking-tight text-balance">
          {brand.tagline}
        </h1>
        <p className="mt-3 text-body text-muted">
          Guests scan, order and pay from the table. Kitchens and floors run from live screens.
        </p>
      </div>
      {previewEnabled ? (
        <Button asChild>
          <Link href="/preview">Open component preview</Link>
        </Button>
      ) : null}
    </main>
  );
}
