import { openHoursSchema } from "@krudex/core/schemas";
import { Clock } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { EmptyState } from "@/components/ui/empty-state";
import { describeHours } from "@/lib/guest/hours";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Closed" };

async function Closed({ searchParams }: PageProps<"/closed">) {
  const { o, r } = await searchParams;
  const id = z.uuid().safeParse(o);
  const outlet = id.success ? (await createAdminClient().from("outlets").select("name, open_hours").eq("id", id.data).maybeSingle()).data : null;
  if (r === "suspended" || !outlet) {
    return <EmptyState icon={Clock} title="Ordering is unavailable" description="This venue isn’t taking orders online right now. Please order with staff." />;
  }
  const hours = describeHours(openHoursSchema.catch({}).parse(outlet.open_hours));
  return (
    <div className="flex flex-col items-center">
      <EmptyState icon={Clock} title={`${outlet.name} is closed right now`} description="Come back during opening hours." />
      <ul className="-mt-6 rounded-md border border-border bg-surface px-5 py-3 font-mono text-small text-muted">
        {hours.map((h) => (
          <li key={h} className="whitespace-pre">{h}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ClosedPage(props: PageProps<"/closed">) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <Suspense>
        <Closed {...props} />
      </Suspense>
    </main>
  );
}
