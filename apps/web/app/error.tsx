"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Route-level error boundary: never a blank screen (Flow §11), always a retry. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong on our side"
        description={`It wasn’t you. Try again in a moment.${error.digest ? ` (Ref ${error.digest})` : ""}`}
        action={
          <Button onClick={reset}>
            <RotateCcw aria-hidden /> Try again
          </Button>
        }
      />
    </main>
  );
}
