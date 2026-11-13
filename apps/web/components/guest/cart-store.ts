"use client";

import { useSyncExternalStore } from "react";

export type CartEntry = {
  /** Stable key for identical configurations, so re-adding bumps qty. */
  key: string;
  itemId: string;
  name: string;
  isVeg: boolean;
  variantId: string | null;
  variantName: string | null;
  addonIds: string[];
  addonNames: string[];
  /** Display-only unit price; the server re-prices every line (AGENTS.md rule 2). */
  unitPrice: number;
  taxRateBps: number | null;
  qty: number;
  note: string;
};

export type Cart = { entries: CartEntry[]; note: string; idempotencyKey: string | null };

const empty: Cart = { entries: [], note: "", idempotencyKey: null };
const listeners = new Set<() => void>();
const cache = new Map<string, Cart>();

const storageKey = (scope: string) => `kx_cart_${scope}`;

function read(scope: string): Cart {
  if (cache.has(scope)) return cache.get(scope)!;
  let cart = empty;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (raw) cart = { ...empty, ...(JSON.parse(raw) as Cart) };
  } catch {
    // Storage blocked (private mode): the cart still works for this page view.
  }
  cache.set(scope, cart);
  return cart;
}

function write(scope: string, cart: Cart) {
  cache.set(scope, cart);
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify(cart));
  } catch {
    // ignore
  }
  for (const l of listeners) l();
}

export const entryKey = (itemId: string, variantId: string | null, addonIds: string[], note: string) =>
  [itemId, variantId ?? "", [...addonIds].sort().join("+"), note.trim()].join("|");

/** Cart survives refresh (G-05, Flow §3 "Guest refreshes"): localStorage per QR scope. */
export function useCart(scope: string) {
  const cart = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === storageKey(scope)) {
          cache.delete(scope);
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => read(scope),
    () => empty,
  );

  const set = (fn: (c: Cart) => Cart) => write(scope, fn(read(scope)));

  return {
    cart,
    count: cart.entries.reduce((s, e) => s + e.qty, 0),
    add(entry: Omit<CartEntry, "key">) {
      const key = entryKey(entry.itemId, entry.variantId, entry.addonIds, entry.note);
      // Any cart change after a failed attempt starts a new order, so it needs a new key.
      set((c) => {
        const existing = c.entries.find((e) => e.key === key);
        const entries = existing
          ? c.entries.map((e) => (e.key === key ? { ...e, qty: Math.min(50, e.qty + entry.qty) } : e))
          : [...c.entries, { ...entry, key }];
        return { ...c, entries, idempotencyKey: null };
      });
    },
    setQty(key: string, qty: number) {
      set((c) => ({
        ...c,
        entries: qty <= 0 ? c.entries.filter((e) => e.key !== key) : c.entries.map((e) => (e.key === key ? { ...e, qty } : e)),
        idempotencyKey: null,
      }));
    },
    setLineNote(key: string, note: string) {
      set((c) => ({ ...c, entries: c.entries.map((e) => (e.key === key ? { ...e, note } : e)), idempotencyKey: null }));
    },
    setNote(note: string) {
      set((c) => ({ ...c, note, idempotencyKey: null }));
    },
    removeItem(itemId: string) {
      set((c) => ({ ...c, entries: c.entries.filter((e) => e.itemId !== itemId), idempotencyKey: null }));
    },
    /** Same key across retries of the same cart: a dropped response never duplicates an order. */
    ensureIdempotencyKey(): string {
      const current = read(scope);
      if (current.idempotencyKey) return current.idempotencyKey;
      const k = crypto.randomUUID();
      write(scope, { ...current, idempotencyKey: k });
      return k;
    },
    clear() {
      write(scope, empty);
    },
  };
}
