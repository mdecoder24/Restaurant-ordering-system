"use client";

import { formatInr } from "@krudex/core/format";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DietMark } from "@/components/ui/diet-mark";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import type { GuestMenuItem } from "@/lib/guest/menu";
import { menuImageUrl } from "@/lib/menu/image-url";
import type { CartEntry } from "./cart-store";

function groupHint(min: number, max: number) {
  if (min === 0) return max === 1 ? "Optional · pick 1" : `Optional · up to ${max}`;
  if (min === max) return `Required · pick ${min}`;
  return `Required · pick ${min} to ${max}`;
}

/** Item sheet (G-04): variants, add-on groups with min/max rules, note, quantity. */
export function ItemSheet({
  item,
  onClose,
  onAdd,
}: {
  item: GuestMenuItem;
  onClose: () => void;
  onAdd: (entry: Omit<CartEntry, "key">) => void;
}) {
  const [variantId, setVariantId] = useState<string | null>(item.variants.find((v) => v.isDefault)?.id ?? item.variants[0]?.id ?? null);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const url = menuImageUrl(item.imagePath);

  const variant = item.variants.find((v) => v.id === variantId) ?? null;
  const addons = item.addonGroups.flatMap((g) => g.addons.filter((a) => picked[g.id]?.includes(a.id)));
  const unit = item.price + (variant?.priceDelta ?? 0) + addons.reduce((s, a) => s + a.price, 0);
  const unmet = item.addonGroups.filter((g) => (picked[g.id]?.length ?? 0) < g.min);

  const toggle = (groupId: string, addonId: string, max: number) =>
    setPicked((p) => {
      const cur = p[groupId] ?? [];
      if (cur.includes(addonId)) return { ...p, [groupId]: cur.filter((x) => x !== addonId) };
      // Single-choice groups behave like radios; multi-choice stops at max.
      if (max === 1) return { ...p, [groupId]: [addonId] };
      return cur.length >= max ? p : { ...p, [groupId]: [...cur, addonId] };
    });

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={item.name}
      hideHeader={Boolean(url)}
      footer={
        <div className="flex items-center gap-3">
          <QuantityStepper value={qty} onChange={(n) => (n < 1 ? onClose() : setQty(n))} itemName={item.name} size="lg" max={50} />
          <Button
            size="lg"
            block
            disabled={unmet.length > 0}
            onClick={() =>
              onAdd({
                itemId: item.id,
                name: item.name,
                isVeg: item.isVeg,
                variantId,
                variantName: variant?.name ?? null,
                addonIds: addons.map((a) => a.id),
                addonNames: addons.map((a) => a.name),
                unitPrice: unit,
                taxRateBps: item.taxRateBps,
                qty,
                note,
              })
            }
          >
            {unmet.length ? `Choose ${unmet[0]!.name.toLowerCase()}` : `Add ${formatInr(unit * qty)}`}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- CDN image, 600px square
          <img src={url} alt={item.name} width={600} height={600} className="swap-in -mx-4 -mt-4 aspect-[4/3] w-[calc(100%+2rem)] max-w-none object-cover md:rounded-t-lg" />
        ) : null}
        <div>
          <div className="flex items-center gap-2">
            <DietMark veg={item.isVeg} />
            {url ? <h2 className="font-display text-h1 font-bold tracking-tight">{item.name}</h2> : null}
          </div>
          {item.description ? <p className="mt-2 text-body text-muted">{item.description}</p> : null}
        </div>

        {item.variants.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between">
              <span className="text-body font-semibold">Size</span>
              <span className="text-caption text-muted">Required · pick 1</span>
            </legend>
            {item.variants.map((v) => (
              <label
                key={v.id}
                className={cn(
                  "press flex h-12 cursor-pointer items-center gap-3 rounded-md border px-3 transition-colors duration-[var(--motion-fast)]",
                  variantId === v.id ? "border-primary bg-primary-soft" : "border-border",
                )}
              >
                <input type="radio" name="variant" className="sr-only" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                <span className={cn("grid size-5 place-items-center rounded-full border-2", variantId === v.id ? "border-primary" : "border-border-strong")}>
                  {variantId === v.id ? <span className="check-pop size-2.5 rounded-full bg-primary" /> : null}
                </span>
                <span className="flex-1 text-body">{v.name}</span>
                <span className="text-small text-muted tabular">{formatInr(item.price + v.priceDelta)}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {item.addonGroups.map((g) => (
          <fieldset key={g.id} className="flex flex-col gap-2">
            <legend className="mb-2 flex w-full items-baseline justify-between">
              <span className="text-body font-semibold">{g.name}</span>
              <span className={cn("text-caption", unmet.includes(g) ? "font-semibold text-warning" : "text-muted")}>{groupHint(g.min, g.max)}</span>
            </legend>
            {g.addons.map((a) => {
              const on = picked[g.id]?.includes(a.id) ?? false;
              const full = !on && g.max > 1 && (picked[g.id]?.length ?? 0) >= g.max;
              return (
                <label
                  key={a.id}
                  className={cn(
                    "press flex h-12 cursor-pointer items-center gap-3 rounded-md border px-3 transition-colors duration-[var(--motion-fast)]",
                    on ? "border-primary bg-primary-soft" : "border-border",
                    full && "cursor-not-allowed opacity-50",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={on} disabled={full} onChange={() => toggle(g.id, a.id, g.max)} />
                  <span className={cn("grid size-5 place-items-center rounded-sm border-2", on ? "border-primary bg-primary text-primary-fg" : "border-border-strong")}>
                    {on ? <Check className="check-pop size-3.5" strokeWidth={3} aria-hidden /> : null}
                  </span>
                  <span className="flex-1 text-body">{a.name}</span>
                  <span className="text-small text-muted tabular">{a.price ? `+${formatInr(a.price)}` : "Free"}</span>
                </label>
              );
            })}
          </fieldset>
        ))}

        <Textarea aria-label="Note for the kitchen" placeholder="Note for the kitchen (optional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
    </Sheet>
  );
}
