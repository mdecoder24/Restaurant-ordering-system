"use client";

import { formatInr } from "@krudex/core/format";
import { FolderPlus, GripVertical, ImageOff, MoreHorizontal, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { PageBody, PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { DietMark } from "@/components/ui/diet-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/cn";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  reorderItems,
  setAvailability,
  updateCategory,
} from "@/lib/menu/actions";
import { menuImageUrl } from "@/lib/menu/image-url";
import { ItemForm, tagLabels } from "./item-form";
import type { MenuCategory, MenuItem } from "./types";
import { useSortable } from "./use-sortable";

type Props = { categories: MenuCategory[]; items: MenuItem[]; canEdit: boolean };

function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  category: MenuCategory | null;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = category ? await updateCategory(category.id, { name, active: category.active }) : await createCategory(name);
      if (res.ok) {
        toast.success(category ? "Category renamed" : "Category added");
        onOpenChange(false);
      } else setError(res.fieldErrors?.name ?? res.error);
    });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? "Rename category" : "New category"}
      actions={
        <>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={save} loading={pending}>
            {category ? "Save" : "Add category"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Name" error={error}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Starters" maxLength={60} />
        </Field>
      </form>
    </Dialog>
  );
}

export function MenuEditor({ categories, items, canEdit }: Props) {
  const [selected, setSelected] = useState<string | null>(categories[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ item: MenuItem | null } | null>(null);
  const [catDialog, setCatDialog] = useState<{ category: MenuCategory | null } | null>(null);
  const [toDelete, setToDelete] = useState<MenuCategory | null>(null);
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const activeCategory = categories.find((c) => c.id === selected) ?? categories[0] ?? null;
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) m.set(i.category_id, (m.get(i.category_id) ?? 0) + 1);
    return m;
  }, [items]);

  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((i) => i.name.toLowerCase().includes(q))
    : items.filter((i) => i.category_id === activeCategory?.id).sort((a, b) => a.sort_order - b.sort_order);

  const catSort = useSortable(categories, (ids) =>
    start(async () => {
      const r = await reorderCategories(ids);
      if (!r.ok) toast.error(r.error);
    }),
  );
  const itemSort = useSortable(visible, (ids) =>
    start(async () => {
      const r = await reorderItems(ids);
      if (!r.ok) toast.error(r.error);
    }),
  );

  const toggle = (ids: string[], available: boolean) => {
    setOptimistic((o) => ({ ...o, ...Object.fromEntries(ids.map((id) => [id, available])) }));
    start(async () => {
      const r = await setAvailability(ids, available);
      if (!r.ok) toast.error(r.error);
      else if (ids.length > 1) toast.success(`${r.data?.changed ?? ids.length} items marked ${available ? "available" : "sold out"}`);
      setOptimistic((o) => {
        const next = { ...o };
        for (const id of ids) delete next[id];
        return next;
      });
      setChecked(new Set());
    });
  };

  const isAvailable = (i: MenuItem) => optimistic[i.id] ?? i.available;
  const selectedIds = [...checked];

  return (
    <PageBody>
      <PageHeader
        title="Menu"
        description={canEdit ? "Pick a category to edit its items. Drag to reorder." : "Mark items sold out as stock runs low."}
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" onClick={() => setCatDialog({ category: null })}>
                <FolderPlus aria-hidden /> Add category
              </Button>
              <Button onClick={() => setEditing({ item: null })} disabled={categories.length === 0}>
                <Plus aria-hidden /> Add item
              </Button>
            </>
          ) : null
        }
      />

      {categories.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface shadow-sm">
          <EmptyState
            icon={UtensilsCrossed}
            title="Add your first category"
            description="Group your dishes, e.g. Starters, Mains, Drinks."
            action={canEdit ? <Button onClick={() => setCatDialog({ category: null })}>Add category</Button> : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav aria-label="Categories" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-2 shadow-sm lg:flex-col lg:self-start lg:overflow-visible">
            {catSort.sorted.map((c) => {
              const active = c.id === activeCategory?.id && !q;
              return (
                <div
                  key={c.id}
                  {...(canEdit ? catSort.rowProps(c.id) : {})}
                  className={cn(
                    "group flex shrink-0 items-center gap-1 rounded-md pr-1 transition-[background-color,opacity] duration-[var(--motion-fast)]",
                    active ? "bg-primary-soft" : "hover-fine:bg-surface-2",
                    "data-[dragging]:opacity-40",
                  )}
                >
                  {canEdit ? (
                    <button type="button" className="hidden cursor-grab touch-none p-1.5 text-muted lg:block" {...catSort.handleProps(c.id, c.name)}>
                      <GripVertical className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(c.id);
                      setQuery("");
                    }}
                    aria-current={active || undefined}
                    className={cn(
                      "flex h-9 min-w-0 flex-1 items-center gap-2 px-2 text-left text-small font-medium lg:px-0",
                      active ? "text-primary" : "text-text",
                      !c.active && "text-muted line-through",
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-caption text-muted tabular">{counts.get(c.id) ?? 0}</span>
                  </button>
                  {canEdit ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton size="sm" aria-label={`${c.name} options`} className="hidden opacity-60 group-hover:opacity-100 lg:inline-flex">
                          <MoreHorizontal aria-hidden />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setCatDialog({ category: c })}>
                          <Pencil className="size-4" aria-hidden /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            start(async () => {
                              const r = await updateCategory(c.id, { name: c.name, active: !c.active });
                              if (!r.ok) toast.error(r.error);
                            })
                          }
                        >
                          {c.active ? "Hide from guests" : "Show to guests"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onSelect={() => setToDelete(c)}>
                          <Trash2 className="size-4" aria-hidden /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <section aria-label="Items" className="min-w-0 rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input aria-label="Search all items" placeholder="Search all items" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
              </div>
              {selectedIds.length > 0 ? (
                <div className="swap-in flex items-center gap-2">
                  <span className="text-small text-muted tabular">{selectedIds.length} selected</span>
                  <Button size="sm" variant="secondary" onClick={() => toggle(selectedIds, false)}>
                    Mark sold out
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toggle(selectedIds, true)}>
                    Mark available
                  </Button>
                </div>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={q ? "No items match" : "No items in this category yet"}
                description={q ? "Try another name." : "Add dishes with prices, photos and options."}
                action={canEdit && !q ? <Button onClick={() => setEditing({ item: null })}>Add item</Button> : undefined}
              />
            ) : (
              <ul className="divide-y divide-border">
                {(q ? visible : itemSort.sorted).map((item) => {
                  const url = menuImageUrl(item.image_path);
                  const available = isAvailable(item);
                  return (
                    <li
                      key={item.id}
                      {...(canEdit && !q ? itemSort.rowProps(item.id) : {})}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 transition-[background-color,opacity] duration-[var(--motion-fast)] hover-fine:bg-surface-2/60",
                        "data-[dragging]:opacity-40",
                      )}
                    >
                      <Checkbox
                        aria-label={`Select ${item.name}`}
                        checked={checked.has(item.id)}
                        onCheckedChange={(on) =>
                          setChecked((s) => {
                            const n = new Set(s);
                            if (on) n.add(item.id);
                            else n.delete(item.id);
                            return n;
                          })
                        }
                      />
                      {canEdit && !q ? (
                        <button type="button" className="hidden cursor-grab p-1 text-muted sm:block" {...itemSort.handleProps(item.id, item.name)}>
                          <GripVertical className="size-4" aria-hidden />
                        </button>
                      ) : null}
                      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2">
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small thumbnail from storage CDN
                          <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <ImageOff className="size-4 text-muted" aria-hidden />
                        )}
                      </span>
                      <div className={cn("min-w-0 flex-1", !available && "text-muted")}>
                        <p className="flex items-center gap-2 text-small font-semibold">
                          <DietMark veg={item.is_veg} size="sm" />
                          <span className="truncate">{item.name}</span>
                          {!available ? <Badge size="sm" tone="danger">Sold out</Badge> : null}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-muted">
                          <span className={cn("font-semibold tabular", available ? "text-text" : "text-muted")}>{formatInr(item.price)}</span>
                          {item.variants.length ? <span>{item.variants.length} {item.variants.length === 1 ? "variant" : "variants"}</span> : null}
                          {item.addon_groups.length ? <span>{item.addon_groups.length} add-on {item.addon_groups.length === 1 ? "group" : "groups"}</span> : null}
                          {item.dietary_tags.filter((t) => t !== "veg").map((t) => (
                            <span key={t}>{tagLabels[t as keyof typeof tagLabels] ?? t}</span>
                          ))}
                        </p>
                      </div>
                      <Switch
                        aria-label={`${item.name} available`}
                        checked={available}
                        onCheckedChange={(on) => toggle([item.id], on)}
                      />
                      {canEdit ? (
                        <IconButton size="sm" aria-label={`Edit ${item.name}`} onClick={() => setEditing({ item })}>
                          <Pencil aria-hidden />
                        </IconButton>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {editing ? (
        <ItemForm
          key={editing.item?.id ?? "new"}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          item={editing.item}
          categories={categories}
          defaultCategoryId={activeCategory?.id ?? categories[0]?.id ?? ""}
        />
      ) : null}
      {catDialog ? (
        <CategoryDialog key={catDialog.category?.id ?? "new"} open onOpenChange={(o) => !o && setCatDialog(null)} category={catDialog.category} />
      ) : null}
      <Dialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "category"}?`}
        description="Only empty categories can be deleted. This can’t be undone."
        actions={
          <>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              onClick={() =>
                start(async () => {
                  if (!toDelete) return;
                  const r = await deleteCategory(toDelete.id);
                  if (r.ok) {
                    toast.success("Category deleted");
                    setToDelete(null);
                  } else toast.error(r.error);
                })
              }
            >
              Delete
            </Button>
          </>
        }
      />
    </PageBody>
  );
}
