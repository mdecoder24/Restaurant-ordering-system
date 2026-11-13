"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useMemo, useRef, useState } from "react";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { cn } from "@/lib/cn";
import { useBroadcast } from "@/lib/realtime/use-channel";
import { supabasePublicConfig } from "@/lib/supabase/config";
import { chime } from "@/lib/sound";

type Board = { name: string; preparing: number[]; ready: number[] };

/** Public pickup screen (Design System §5): two lists, tokens in display type. */
export function PickupDisplay({ outletId, initial }: { outletId: string; initial: Board }) {
  const [board, setBoard] = useState(initial);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const seen = useRef(new Set(initial.ready));
  const client = useMemo(() => {
    if (typeof window === "undefined") return null;
    const { url, anonKey } = supabasePublicConfig();
    // Own storage key: the anonymous display client must not share auth state with a staff
    // client on the same device (supabase-js warns about duplicate GoTrue instances).
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "kx-display" },
    }) as unknown as SupabaseClient;
  }, []);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/display/${outletId}`, { cache: "no-store" });
    if (!res.ok) return;
    const { data } = (await res.json()) as { data: Board };
    const newReady = data.ready.filter((t) => !seen.current.has(t));
    data.ready.forEach((t) => seen.current.add(t));
    if (newReady.length) {
      chime();
      setFresh(new Set(newReady));
      setTimeout(() => setFresh(new Set()), 4000);
    }
    setBoard(data);
  }, [outletId]);

  // The pickup topic is public on purpose: it carries token numbers only.
  const connection = useBroadcastPublic(client, `outlet:${outletId}:pickup`, refetch);

  return (
    <div className="flex h-dvh flex-col">
      <ConnectionBanner state={connection} />
      <header className="px-8 py-5">
        <h1 className="font-display text-h1 font-bold">{board.name}</h1>
        <p className="text-body text-muted">Collect your order when your token turns green.</p>
      </header>
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-6 px-8 pb-8 md:grid-cols-[1fr_1.4fr]">
        <section aria-labelledby="prep" className="flex flex-col rounded-lg bg-surface p-6">
          <h2 id="prep" className="text-h2 font-bold text-muted uppercase">Preparing</h2>
          {board.preparing.length === 0 ? <p className="mt-4 text-h2 text-muted/70">Nothing cooking right now</p> : null}
          <ul className="mt-4 flex flex-wrap content-start gap-4">
            {board.preparing.map((t) => (
              <li key={t} className="swap-in font-display text-[3.5rem] leading-none font-extrabold text-muted tabular">
                {t}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="ready" aria-live="polite" className="flex flex-col rounded-lg border-2 border-success bg-success/10 p-6">
          <h2 id="ready" className="text-h2 font-bold text-success uppercase">Ready to collect</h2>
          {board.ready.length === 0 ? <p className="mt-4 text-h2 text-success/70">No tokens ready yet</p> : null}
          <ul className="mt-4 flex flex-wrap content-start gap-6">
            {board.ready.map((t) => (
              <li key={t} className={cn("swap-in font-display text-[5.5rem] leading-none font-extrabold text-success tabular", fresh.has(t) && "kds-flash rounded-lg px-2")}>
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function useBroadcastPublic(client: SupabaseClient | null, topic: string, refetch: () => Promise<void>) {
  return useBroadcast({
    client,
    topics: [topic],
    isPrivate: false,
    onEvent: () => void refetch(),
    onResync: () => void refetch(),
  });
}
