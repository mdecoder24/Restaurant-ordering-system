"use client";

import { computeBill } from "@krudex/core/bill";
import { formatInr } from "@krudex/core/format";
import { ChevronRight, Leaf, MapPin, Plus, Search, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { DietMark } from "@/components/ui/diet-mark";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import type { GuestMenu, GuestMenuItem } from "@/lib/guest/menu";
import { cn } from "@/lib/cn";
import { menuImageUrl } from "@/lib/menu/image-url";
import { useCart, type CartEntry } from "./cart-store";
import { ItemSheet } from "./item-sheet";

export type GuestOutletInfo = {
  id: string;
  tenantName: string;
  name: string;
  mode: "dine_in" | "canteen";
  tableLabel: string | null;
  taxConfig: { default_rate_bps: number; prices_include_tax: boolean };
  serviceChargeBps: number;
};

const filters = [
  { id: "veg", label: "Veg", test: (i: GuestMenuItem) => i.isVeg },
  { id: "vegan", label: "Vegan", test: (i: GuestMenuItem) => i.tags.includes("vegan") },
  { id: "jain", label: "Jain", test: (i: GuestMenuItem) => i.tags.includes("jain") },
  { id: "gluten_free", label: "Gluten-free", test: (i: GuestMenuItem) => i.tags.includes("gluten_free") },
  { id: "spicy", label: "Spicy", test: (i: GuestMenuItem) => i.tags.includes("spicy") },
] as const;

const hasOptions = (i: GuestMenuItem) => i.variants.length > 0 || i.addonGroups.length > 0;

export function useBillPreview(entries: CartEntry[], outlet: GuestOutletInfo) {
  return useMemo(
    () =>
      computeBill(
        entries.map((e) => ({ unitPrice: e.unitPrice, qty: e.qty, taxRateBps: e.taxRateBps })),
        {
          defaultTaxRateBps: outlet.taxConfig.default_rate_bps,
          pricesIncludeTax: outlet.taxConfig.prices_include_tax,
          serviceChargeBps: outlet.serviceChargeBps,
        },
      ),
    [entries, outlet],
  );
}

export function BillSummary({ bill, className }: { bill: ReturnType<typeof computeBill>; className?: string }) {
  const row = (label: string, value: number, strong = false) => (
    <div className={cn("flex justify-between", strong ? "pt-2 text-body font-semibold" : "text-small text-muted")}>
      <dt>{label}</dt>
      <dd className={cn("tabular", strong && "font-display text-h2 font-bold text-text")}>{formatInr(value)}</dd>
    </div>
  );
  return (
    <dl className={cn("flex flex-col gap-1", className)}>
      {row("Subtotal", bill.subtotal)}
      {bill.serviceCharge ? row("Service charge", bill.serviceCharge) : null}
      {row("CGST", bill.cgst)}
      {row("SGST", bill.sgst)}
      {bill.rounding ? row("Rounding", bill.rounding) : null}
      <div className="mt-1 border-t border-border" />
      {row("Total", bill.total, true)}
    </dl>
  );
}

function ItemCard({
  item,
  qtyInCart,
  onOpen,
  onQuickAdd,
  onQty,
  style,
}: {
  item: GuestMenuItem;
  qtyInCart: number;
  onOpen: () => void;
  onQuickAdd: () => void;
  onQty: (n: number) => void;
  style?: CSSProperties;
}) {
  const url = menuImageUrl(item.imagePath);
  const soldOut = !item.available;
  const fromPrice = item.price + Math.min(0, ...item.variants.map((v) => v.priceDelta));
  return (
    <li style={style} className={cn("rise-in flex gap-4 py-4", soldOut && "text-muted [&_img]:grayscale")}>
      <button type="button" onClick={onOpen} disabled={soldOut} className="min-w-0 flex-1 text-left disabled:cursor-not-allowed">
        <span className="flex items-center gap-2">
          <DietMark veg={item.isVeg} size="sm" />
          {item.tags.includes("spicy") ? <span className="text-caption font-semibold text-danger">Spicy</span> : null}
        </span>
        <span className={cn("mt-1 block text-body font-semibold text-balance", soldOut && "line-through decoration-1")}>{item.name}</span>
        <span className="mt-0.5 block text-body font-semibold tabular">
          {item.variants.length > 1 ? <span className="text-small font-normal text-muted">from </span> : null}
          {formatInr(fromPrice)}
        </span>
        {item.description ? <span className="mt-1 line-clamp-2 block text-small text-muted">{item.description}</span> : null}
      </button>
      <div className={cn("relative flex shrink-0 flex-col items-center", url ? "w-24" : "w-auto self-center")}>
        {/* Without a photo the Add control stands alone; an empty image tile reads as broken. */}
        {url ? (
          <button
            type="button"
            onClick={onOpen}
            disabled={soldOut}
            tabIndex={-1}
            aria-hidden
            className="press size-24 overflow-hidden rounded-md bg-surface-2 shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN image with explicit size */}
            <img src={url} alt="" width={96} height={96} loading="lazy" decoding="async" className="size-full object-cover" />
          </button>
        ) : null}
        <div className={url ? "-mt-4" : undefined}>
          {soldOut ? (
            <span className="inline-flex h-8 items-center rounded-pill border border-border bg-surface px-3 text-caption font-semibold text-muted shadow-sm">
              Sold out
            </span>
          ) : qtyInCart > 0 && !hasOptions(item) ? (
            <QuantityStepper value={qtyInCart} onChange={onQty} itemName={item.name} className="swap-in bg-surface shadow-sm" />
          ) : (
            <button
              type="button"
              onClick={hasOptions(item) ? onOpen : onQuickAdd}
              aria-label={`Add ${item.name}`}
              className="press inline-flex h-9 items-center gap-1 rounded-pill border border-primary/40 bg-surface px-4 text-small font-bold text-primary shadow-sm transition-colors duration-[var(--motion-fast)] hover-fine:bg-primary-soft"
            >
              Add <Plus className="size-4" aria-hidden strokeWidth={2.5} />
            </button>
          )}
        </div>
        {hasOptions(item) && !soldOut ? <span className="mt-1 text-[0.6875rem] text-muted">Customisable</span> : null}
      </div>
    </li>
  );
}

export function GuestMenuView({
  outlet,
  menu,
  qrToken,
  hasSession,
}: {
  outlet: GuestOutletInfo;
  menu: GuestMenu;
  qrToken: string;
  hasSession: boolean;
}) {
  const router = useRouter();
  const cartApi = useCart(qrToken);
  const { cart, count } = cartApi;
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Set<string>>(new Set());
  const [openItem, setOpenItem] = useState<GuestMenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [problem, setProblem] = useState<{ itemId?: string; message: string } | null>(null);
  const [currentCat, setCurrentCat] = useState(menu.categories[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);
  const cartBarRef = useRef<HTMLButtonElement>(null);
  const bill = useBillPreview(cart.entries, outlet);

  const q = query.trim().toLowerCase();
  const visibleItems = menu.items.filter(
    (i) =>
      (!q || i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)) &&
      filters.every((f) => !active.has(f.id) || f.test(i)),
  );
  const grouped = menu.categories
    .map((c) => ({ ...c, items: visibleItems.filter((i) => i.categoryId === c.id) }))
    .filter((c) => c.items.length);

  // Scroll-spy: highlight the category in view (Design System: CategoryTabs).
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-category]")];
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setCurrentCat((visible.target as HTMLElement).dataset.category!);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [grouped.length, q, active]);

  useEffect(() => {
    tabsRef.current?.querySelector(`[data-tab="${currentCat}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentCat]);

  const qtyFor = (itemId: string) => cart.entries.filter((e) => e.itemId === itemId).reduce((s, e) => s + e.qty, 0);
  const simpleKey = (itemId: string) => cart.entries.find((e) => e.itemId === itemId && !e.variantId && !e.addonIds.length && !e.note)?.key;

  const quickAdd = (item: GuestMenuItem) => {
    cartApi.add({
      itemId: item.id,
      name: item.name,
      isVeg: item.isVeg,
      variantId: null,
      variantName: null,
      addonIds: [],
      addonNames: [],
      unitPrice: item.price,
      taxRateBps: item.taxRateBps,
      qty: 1,
      note: "",
    });
    setProblem(null);
    bumpCart();
  };

  // A small pulse on the cart bar confirms the add without a toast. WAAPI so rapid taps retarget.
  const bumpCart = () => {
    const el = cartBarRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.025)" }, { transform: "scale(1)" }], {
      duration: 280,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    });
  };

  const place = async () => {
    setPlacing(true);
    setProblem(null);
    const key = cartApi.ensureIdempotencyKey();
    const payload = {
      qr: qrToken,
      note: cart.note || null,
      lines: cart.entries.map((e) => ({ item_id: e.itemId, variant_id: e.variantId, addon_ids: e.addonIds, qty: e.qty, note: e.note || null })),
    };
    // Retry the same idempotency key on network failure: never a duplicate order.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/guest/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Idempotency-Key": key },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as { data?: { order_id: string }; error?: { code: string; message: string; item_id?: string } };
        if (res.ok && json.data) {
          cartApi.clear();
          router.push(`/o/${json.data.order_id}`);
          return;
        }
        setProblem({ itemId: json.error?.item_id, message: json.error?.message ?? "We couldn’t place your order." });
        setPlacing(false);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    setProblem({ message: "You seem to be offline. Check your connection and tap Place order again." });
    setPlacing(false);
  };

  return (
    <div className="pb-28">
      <header className="px-4 pt-6 pb-4">
        <div className="rise-in flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-caption font-semibold tracking-wide text-primary uppercase">{outlet.tenantName}</p>
            <h1 className="truncate font-display text-h1 font-bold tracking-tight">{outlet.name}</h1>
            <p className="mt-0.5 text-small text-muted">
              {outlet.mode === "canteen" ? "Order ahead, collect at the counter." : "Order from your table. We’ll bring it over."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-small font-semibold shadow-sm">
            <MapPin className="size-3.5 text-primary" aria-hidden strokeWidth={2.5} />
            {outlet.tableLabel ? `Table ${outlet.tableLabel}` : "Pickup"}
          </span>
        </div>
        {hasSession ? (
          <Link
            href={`/t/${qrToken}/orders`}
            className="press mt-3 flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5 text-small font-semibold shadow-sm"
          >
            {outlet.mode === "canteen" ? "Your token and orders" : "Your orders and bill"}
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ) : null}
      </header>

      <div className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="px-4 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input type="search" aria-label="Search the menu" placeholder="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 pl-9" />
            {query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted">
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <ChipGroup label="Dietary filters" className="mx-0 px-4 pt-2">
          {filters.map((f) => (
            <Chip
              key={f.id}
              selected={active.has(f.id)}
              icon={f.id === "veg" ? <Leaf aria-hidden /> : undefined}
              onSelectedChange={(on) =>
                setActive((s) => {
                  const n = new Set(s);
                  if (on) n.add(f.id);
                  else n.delete(f.id);
                  return n;
                })
              }
            >
              {f.label}
            </Chip>
          ))}
        </ChipGroup>
        {!q && grouped.length > 1 ? (
          <nav ref={tabsRef} aria-label="Categories" className="scrollbar-none flex gap-1 overflow-x-auto px-3 pt-1">
            {grouped.map((c) => (
              <a
                key={c.id}
                href={`#cat-${c.id}`}
                data-tab={c.id}
                aria-current={currentCat === c.id ? "true" : undefined}
                onClick={() => setCurrentCat(c.id)}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-small font-semibold whitespace-nowrap transition-colors duration-[var(--motion-fast)]",
                  currentCat === c.id ? "text-primary" : "text-muted",
                )}
              >
                {c.name}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 bottom-0 h-0.5 rounded-pill bg-primary transition-[transform,opacity] duration-[var(--motion-base)] ease-out",
                    currentCat === c.id ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0",
                  )}
                />
              </a>
            ))}
          </nav>
        ) : (
          <div className="h-2" />
        )}
      </div>

      {menu.items.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Menu coming soon" description="The kitchen is still setting up. Ask staff for help." />
      ) : grouped.length === 0 ? (
        <EmptyState icon={Search} title="Nothing matches" description="Try another search or clear the filters." action={<Button variant="secondary" onClick={() => { setQuery(""); setActive(new Set()); }}>Clear all</Button>} />
      ) : (
        grouped.map((c) => (
          <section key={c.id} id={`cat-${c.id}`} data-category={c.id} aria-labelledby={`h-${c.id}`} className="scroll-mt-40 px-4 pt-5">
            <h2 id={`h-${c.id}`} className="font-display text-h2 font-bold tracking-tight">
              {c.name} <span className="text-small font-normal text-muted">{c.items.length}</span>
            </h2>
            <ul className="divide-y divide-border">
              {c.items.map((item, i) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  style={{ "--i": Math.min(i, 6) } as CSSProperties}
                  qtyInCart={qtyFor(item.id)}
                  onOpen={() => setOpenItem(item)}
                  onQuickAdd={() => quickAdd(item)}
                  onQty={(n) => {
                    const k = simpleKey(item.id);
                    if (k) cartApi.setQty(k, n);
                  }}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Cart bar (Design System: CartBar), hidden when empty. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[var(--z-sticky)] mx-auto max-w-[480px] px-3 pb-[max(12px,env(safe-area-inset-bottom))]",
          "transition-[transform,opacity] duration-[var(--motion-base)] ease-out",
          count > 0 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <button
          type="button"
          ref={cartBarRef}
          onClick={() => setCartOpen(true)}
          tabIndex={count > 0 ? 0 : -1}
          className="press sheen flex h-14 w-full items-center gap-3 rounded-lg bg-primary px-4 text-primary-fg shadow-[var(--shadow-lg),var(--highlight-inset)]"
        >
          <span className="relative">
            <ShoppingBag className="size-5" aria-hidden />
            <span key={count} className="count-tick absolute -top-2 -right-2.5 grid size-5 place-items-center rounded-full bg-primary-fg text-caption font-bold text-primary tabular">
              {count}
            </span>
          </span>
          <span className="text-body font-semibold">View cart</span>
          <span className="ml-auto font-display text-body font-bold tabular">{formatInr(bill.total)}</span>
        </button>
      </div>

      {openItem ? (
        <ItemSheet
          key={openItem.id}
          item={openItem}
          onClose={() => setOpenItem(null)}
          onAdd={(entry) => {
            cartApi.add(entry);
            setProblem(null);
            setOpenItem(null);
            bumpCart();
            toast.success(`${entry.name} added`);
          }}
        />
      ) : null}

      <Sheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        title="Your order"
        description={outlet.tableLabel ? `Table ${outlet.tableLabel}` : "Pickup at the counter"}
        footer={
          <Button size="lg" block onClick={place} loading={placing} disabled={count === 0}>
            Place order · {formatInr(bill.total)}
          </Button>
        }
      >
        {cart.entries.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Your cart is empty" action={<Button variant="secondary" onClick={() => setCartOpen(false)}>Browse menu</Button>} />
        ) : (
          <div className="flex flex-col gap-5">
            {problem ? (
              <div role="alert" className="swap-in flex flex-col gap-2 rounded-md bg-danger/10 p-3 text-small text-danger">
                <p>{problem.message}</p>
                {problem.itemId ? (
                  <Button size="sm" variant="secondary" className="self-start" onClick={() => { cartApi.removeItem(problem.itemId!); setProblem(null); router.refresh(); }}>
                    Remove it
                  </Button>
                ) : null}
              </div>
            ) : null}
            <ul className="flex flex-col divide-y divide-border">
              {cart.entries.map((e) => (
                <li key={e.key} className={cn("flex flex-col gap-2 py-3", problem?.itemId === e.itemId && "rounded-md bg-danger/5 px-2")}>
                  <div className="flex items-start gap-3">
                    <DietMark veg={e.isVeg} size="sm" className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold">{e.name}</p>
                      {e.variantName || e.addonNames.length ? (
                        <p className="text-small text-muted">{[e.variantName, ...e.addonNames].filter(Boolean).join(" · ")}</p>
                      ) : null}
                      <p className="text-small font-semibold tabular">{formatInr(e.unitPrice * e.qty)}</p>
                    </div>
                    <QuantityStepper value={e.qty} onChange={(n) => cartApi.setQty(e.key, n)} itemName={e.name} max={50} />
                  </div>
                  <Input
                    aria-label={`Note for ${e.name}`}
                    placeholder="Add a note (e.g. less spicy)"
                    value={e.note}
                    maxLength={200}
                    onChange={(ev) => cartApi.setLineNote(e.key, ev.target.value)}
                    className="h-10 text-small"
                  />
                </li>
              ))}
            </ul>
            <Textarea aria-label="Note for the whole order" placeholder="Anything for the kitchen? (allergies, timing)" value={cart.note} maxLength={300} onChange={(ev) => cartApi.setNote(ev.target.value)} />
            <BillSummary bill={bill} className="rounded-md bg-surface-2 p-3" />
            <p className="text-caption text-muted">Prices include all taxes shown. Final amount is confirmed by the restaurant.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
