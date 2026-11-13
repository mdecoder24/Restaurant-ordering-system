import { Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <EmptyState
        icon={Compass}
        title="This page could not be found"
        description="The link may be old, or the page moved. If you scanned a table QR, ask staff for help."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Go home</Link>
          </Button>
        }
      />
    </main>
  );
}
