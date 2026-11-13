"use client";

import { paiseToInput, parseInr } from "@krudex/core/format";
import { dietaryTags, type MenuItemInput } from "@krudex/core/schemas";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DietMark } from "@/components/ui/diet-mark";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import { deleteItem, saveItem } from "@/lib/menu/actions";
import { ImageUpload } from "./image-upload";
import type { MenuCategory, MenuItem } from "./types";

export const tagLabels: Record<(typeof dietaryTags)[number], string> = {
  veg: "Veg",
  vegan: "Vegan",
  jain: "Jain",
  gluten_free: "Gluten-free",
  spicy: "Spicy",
};

const taxOptions = [
  { value: "default", label: "Outlet default" },
  { value: "0", label: "0% (exempt)" },
  { value: "500", label: "5%" },
  { value: "1200", label: "12%" },
  { value: "1800", label: "18%" },
];

type VariantDraft = { key: string; name: string; delta: string; is_default: boolean };
type AddonDraft = { key: string; name: string; price: string; available: boolean };
type GroupDraft = { key: string; name: string; min: string; max: string; addons: AddonDraft[] };

const key = () => Math.random().toString(36).slice(2);

function toDraft(item: MenuItem | null, categoryId: string) {
  return {
    name: item?.name ?? "",
    category_id: item?.category_id ?? categoryId,
    description: item?.description ?? "",
    price: item ? paiseToInput(item.price) : "",
    is_veg: item?.is_veg ?? true,
    dietary_tags: item?.dietary_tags ?? [],
    available: item?.available ?? true,
    tax: item?.tax_rate_bps == null ? "default" : String(item.tax_rate_bps),
    prep_station: item?.prep_station ?? "",
    image_path: item?.image_path ?? null,
    variants: (item?.variants ?? []).map<VariantDraft>((v) => ({
      key: v.id,
      name: v.name,
      delta: v.price_delta < 0 ? `-${paiseToInput(-v.price_delta)}` : paiseToInput(v.price_delta),
      is_default: v.is_default,
    })),
    groups: (item?.addon_groups ?? []).map<GroupDraft>((g) => ({
      key: g.id,
      name: g.name,
      min: String(g.min_select),
      max: String(g.max_select),
      addons: g.addons.map((a) => ({ key: a.id, name: a.name, price: paiseToInput(a.price), available: a.available })),
    })),
  };
}

function signedPaise(s: string): number | null {
  const t = s.trim();
  if (!t) return 0;
  const neg = t.startsWith("-");
  const v = parseInr(neg ? t.slice(1) : t);
  return v == null ? null : neg ? -v : v;
}

export function ItemForm({
  open,
  onOpenChange,
  item,
  categories,
  defaultCategoryId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId: string;
}) {
  const [d, setD] = useState(() => toDraft(item, defaultCategoryId));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const errs: Record<string, string> = {};
    const price = parseInr(d.price);
    if (price == null) errs.price = "Enter a price like 120 or 120.50";
    const variants = d.variants.map((v) => ({ name: v.name, price_delta: signedPaise(v.delta), is_default: v.is_default }));
    if (variants.some((v) => v.price_delta == null)) errs.variants = "Check the variant price changes";
    const groups = d.groups.map((g) => ({
      name: g.name,
      min_select: Number(g.min) || 0,
      max_select: Number(g.max) || 1,
      addons: g.addons.map((a) => ({ name: a.name, price: parseInr(a.price || "0"), available: a.available })),
    }));
    if (groups.some((g) => g.addons.some((a) => a.price == null))) errs.addon_groups = "Check the add-on prices";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const input = {
      category_id: d.category_id,
      name: d.name,
      description: d.description || null,
      price: price!,
      is_veg: d.is_veg,
      dietary_tags: d.dietary_tags,
      available: d.available,
      tax_rate_bps: d.tax === "default" ? null : Number(d.tax),
      prep_station: d.prep_station || null,
      image_path: d.image_path,
      variants: variants as MenuItemInput["variants"],
      addon_groups: groups as MenuItemInput["addon_groups"],
    } as MenuItemInput;

    start(async () => {
      const res = await saveItem(item?.id ?? null, input);
      if (res.ok) {
        toast.success(item ? "Item saved" : "Item added");
        onOpenChange(false);
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  };

  const remove = () =>
    start(async () => {
      if (!item) return;
      const res = await deleteItem(item.id);
      if (res.ok) {
        toast.success(`${item.name} deleted`);
        onOpenChange(false);
      } else toast.error(res.error);
    });

  const updVariant = (i: number, patch: Partial<VariantDraft>) =>
    set("variants", d.variants.map((v, j) => (j === i ? { ...v, ...patch } : patch.is_default ? { ...v, is_default: false } : v)));
  const updGroup = (i: number, patch: Partial<GroupDraft>) => set("groups", d.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const updAddon = (gi: number, ai: number, patch: Partial<AddonDraft>) =>
    updGroup(gi, { addons: d.groups[gi]!.addons.map((a, j) => (j === ai ? { ...a, ...patch } : a)) });

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `Edit ${item.name}` : "New item"}
      className="md:w-[min(560px,calc(100vw-16px))]"
      footer={
        <div className="flex gap-2">
          {item ? (
            <Button type="button" variant="ghost" className="text-danger" onClick={remove} disabled={pending}>
              <Trash2 aria-hidden /> Delete
            </Button>
          ) : null}
          <Button type="button" className="ml-auto" onClick={submit} loading={pending}>
            {item ? "Save item" : "Add item"}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <ImageUpload value={d.image_path} onChange={(p) => set("image_path", p)} />

        <Field label="Name" error={errors.name}>
          <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₹)" error={errors.price}>
            <Input inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Category" error={errors.category_id}>
            <Select value={d.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Description" optional error={errors.description}>
          <Textarea value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
        </Field>

        <div role="radiogroup" aria-label="Veg or non-veg" className="grid grid-cols-2 gap-2">
          {[true, false].map((veg) => (
            <button
              key={String(veg)}
              type="button"
              role="radio"
              aria-checked={d.is_veg === veg}
              onClick={() => set("is_veg", veg)}
              className={cn(
                "press flex h-11 items-center justify-center gap-2 rounded-md border text-small font-semibold transition-colors duration-[var(--motion-fast)]",
                d.is_veg === veg ? (veg ? "border-veg bg-veg/10" : "border-nonveg bg-nonveg/10") : "border-border-strong",
              )}
            >
              <DietMark veg={veg} size="sm" /> {veg ? "Veg" : "Non-veg"}
            </button>
          ))}
        </div>

        <fieldset>
          <legend className="mb-2 text-small font-medium">Dietary tags</legend>
          <div className="flex flex-wrap gap-2">
            {dietaryTags.map((t) => (
              <Chip
                key={t}
                selected={d.dietary_tags.includes(t)}
                onSelectedChange={(on) => set("dietary_tags", on ? [...d.dietary_tags, t] : d.dietary_tags.filter((x) => x !== t))}
              >
                {tagLabels[t]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GST rate">
            <Select value={d.tax} onValueChange={(v) => set("tax", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taxOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Kitchen station" optional helper="e.g. Grill, Drinks">
            <Input value={d.prep_station} onChange={(e) => set("prep_station", e.target.value)} maxLength={40} />
          </Field>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5">
          <span>
            <span className="block text-small font-medium">Available</span>
            <span className="block text-caption text-muted">Turn off when it sells out. Guests see “Sold out”.</span>
          </span>
          <Switch checked={d.available} onCheckedChange={(v) => set("available", v)} />
        </label>

        <section aria-labelledby="variants-title" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 id="variants-title" className="text-small font-semibold">Variants</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => set("variants", [...d.variants, { key: key(), name: "", delta: "0", is_default: d.variants.length === 0 }])}
            >
              <Plus aria-hidden /> Add variant
            </Button>
          </div>
          {d.variants.length === 0 ? <p className="text-caption text-muted">Sizes like Half / Full. Optional.</p> : null}
          {errors.variants ? <p className="text-small text-danger" role="alert">{errors.variants}</p> : null}
          {d.variants.map((v, i) => (
            <div key={v.key} className="swap-in grid grid-cols-[1fr_7rem_auto_auto] items-center gap-2">
              <Input aria-label="Variant name" placeholder="Name" value={v.name} onChange={(e) => updVariant(i, { name: e.target.value })} />
              <Input aria-label="Price change in rupees" inputMode="decimal" placeholder="+ ₹" value={v.delta} onChange={(e) => updVariant(i, { delta: e.target.value })} />
              <label className="flex items-center gap-1.5 text-caption text-muted">
                <input type="radio" name="default-variant" checked={v.is_default} onChange={() => updVariant(i, { is_default: true })} className="accent-[var(--color-primary)]" />
                Default
              </label>
              <IconButton size="sm" aria-label={`Remove ${v.name || "variant"}`} onClick={() => set("variants", d.variants.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </IconButton>
            </div>
          ))}
        </section>

        <section aria-labelledby="addons-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 id="addons-title" className="text-small font-semibold">Add-on groups</h3>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => set("groups", [...d.groups, { key: key(), name: "", min: "0", max: "1", addons: [{ key: key(), name: "", price: "", available: true }] }])}
            >
              <Plus aria-hidden /> Add group
            </Button>
          </div>
          {errors.addon_groups ? <p className="text-small text-danger" role="alert">{errors.addon_groups}</p> : null}
          {d.groups.map((g, gi) => (
            <div key={g.key} className="swap-in flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] items-end gap-2">
                <Input aria-label="Group name" placeholder="e.g. Extra toppings" value={g.name} onChange={(e) => updGroup(gi, { name: e.target.value })} />
                <Input aria-label="Minimum choices" inputMode="numeric" value={g.min} onChange={(e) => updGroup(gi, { min: e.target.value })} title="Min" />
                <Input aria-label="Maximum choices" inputMode="numeric" value={g.max} onChange={(e) => updGroup(gi, { max: e.target.value })} title="Max" />
                <IconButton size="sm" aria-label={`Remove group ${g.name}`} onClick={() => set("groups", d.groups.filter((_, j) => j !== gi))}>
                  <Trash2 aria-hidden />
                </IconButton>
              </div>
              <p className="text-caption text-muted">Guests pick between {g.min || 0} and {g.max || 1}.</p>
              {g.addons.map((a, ai) => (
                <div key={a.key} className="grid grid-cols-[1fr_6rem_auto] gap-2">
                  <Input aria-label="Add-on name" placeholder="Add-on" value={a.name} onChange={(e) => updAddon(gi, ai, { name: e.target.value })} />
                  <Input aria-label="Add-on price in rupees" inputMode="decimal" placeholder="₹" value={a.price} onChange={(e) => updAddon(gi, ai, { price: e.target.value })} />
                  <IconButton
                    size="sm"
                    aria-label={`Remove ${a.name || "add-on"}`}
                    disabled={g.addons.length === 1}
                    onClick={() => updGroup(gi, { addons: g.addons.filter((_, j) => j !== ai) })}
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => updGroup(gi, { addons: [...g.addons, { key: key(), name: "", price: "", available: true }] })}
              >
                <Plus aria-hidden /> Add option
              </Button>
            </div>
          ))}
        </section>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
