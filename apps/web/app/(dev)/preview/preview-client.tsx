"use client";

import { formatDuration, formatInr } from "@krudex/core/format";
import { orderStatuses } from "@krudex/core/order-status";
import {
  Bell,
  ChefHat,
  Copy,
  Flame,
  Leaf,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Smartphone,
  Sun,
  Trash2,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { ConnectionBanner } from "@/components/ui/connection-banner";
import { DietMark } from "@/components/ui/diet-mark";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "@/components/ui/toaster";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { TokenSwatch } from "./token-swatch";

type Theme = "light" | "dark";
type Density = "guest" | "dashboard" | "kds";

const sections = [
  ["foundations", "Foundations"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["ordering", "Ordering"],
  ["status", "Status"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["data", "Data"],
] as const;

export function PreviewClient() {
  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<Density>("guest");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <TooltipProvider>
      <div data-density={density} className="min-h-dvh bg-bg text-text">
        <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <Logo />
            <Badge tone="outline" size="sm" className="hidden sm:inline-flex">
              Design system
            </Badge>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Segmented
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "light", label: "Light", icon: <Sun /> },
                  { value: "dark", label: "Dark", icon: <Moon /> },
                ]}
              />
              <Segmented
                label="Density"
                value={density}
                onChange={setDensity}
                options={[
                  { value: "guest", label: "Guest", icon: <Smartphone /> },
                  { value: "dashboard", label: "Dashboard", icon: <Monitor /> },
                  { value: "kds", label: "KDS", icon: <ChefHat /> },
                ]}
              />
            </div>
          </div>
          <nav
            aria-label="Sections"
            className="scrollbar-none mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6"
          >
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="shrink-0 rounded-sm px-2.5 py-1 text-small font-medium text-muted hover-fine:bg-surface-2 hover-fine:text-text"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
          <Intro />
          <Foundations />
          <Buttons />
          <Forms />
          <Ordering />
          <Status />
          <Feedback />
          <Overlays />
          <Data />
        </main>
        <Toaster visibleToasts={density === "guest" ? 1 : 3} />
      </div>
    </TooltipProvider>
  );
}

/* ---------- Layout helpers ---------- */

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon: ReactNode }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          // Text label hides below md; keep the accessible name.
          aria-label={o.label}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-small font-semibold [&_svg]:size-4",
            "transition-[background-color,color,box-shadow] duration-[var(--motion-fast)] ease-out",
            value === o.value ? "bg-surface text-text shadow-sm" : "text-muted hover-fine:text-text",
          )}
        >
          {o.icon}
          <span className="hidden md:inline">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32">
      <div className="mb-6 max-w-2xl">
        <h2 id={`${id}-title`} className="font-display text-h1 font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-body text-muted">{intro}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Specimen({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <p className="border-b border-border px-4 py-2.5 text-caption font-semibold tracking-wide text-muted uppercase">
        {title}
      </p>
      <div className={cn("p-4 sm:p-5", className)}>{children}</div>
    </div>
  );
}

/* ---------- Sections ---------- */

function Intro() {
  return (
    <div className="max-w-2xl">
      <p className="text-small font-semibold text-primary">Krudex · T02</p>
      <h1 className="mt-1 font-display text-display font-extrabold tracking-tight text-balance">
        One set of tokens, three densities.
      </h1>
      <p className="mt-3 text-body text-muted">
        Guest phones, kitchen screens read from two metres, and dense dashboards all draw from the
        same primitives. Switch theme and density above; every component re-flows live.
      </p>
    </div>
  );
}

function Foundations() {
  const colours: [string, string][] = [
    ["--color-primary", "Primary"],
    ["--color-text", "Text"],
    ["--color-text-muted", "Text muted"],
    ["--color-success", "Success"],
    ["--color-warning", "Warning"],
    ["--color-danger", "Danger"],
    ["--color-info", "Info"],
    ["--color-veg", "Veg"],
  ];
  const surfaces: [string, string][] = [
    ["--color-bg", "Background"],
    ["--color-surface", "Surface"],
    ["--color-surface-2", "Surface 2"],
    ["--color-border", "Border"],
  ];
  const statusTokens = orderStatuses
    .filter((s) => s !== "rejected")
    .map((s) => [`--status-${s}`, s[0]!.toUpperCase() + s.slice(1)] as [string, string]);

  return (
    <Section
      id="foundations"
      title="Foundations"
      intro="Every text colour clears WCAG AA (4.5:1) against surface in both themes. Ratios below are read live from the current theme."
    >
      <Specimen title="Text and semantic colours">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colours.map(([t, l]) => (
            <TokenSwatch key={t} token={t} label={l} />
          ))}
        </div>
      </Specimen>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Surfaces">
          <div className="grid grid-cols-2 gap-3">
            {surfaces.map(([t, l]) => (
              <TokenSwatch key={t} token={t} label={l} against="--color-text" />
            ))}
          </div>
        </Specimen>
        <Specimen title="Order status">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {statusTokens.map(([t, l]) => (
              <TokenSwatch key={t} token={t} label={l} />
            ))}
          </div>
        </Specimen>
      </div>

      <Specimen title="Type scale (changes with density)">
        <div className="space-y-4">
          {(
            [
              ["display", "font-display text-display font-extrabold tracking-tight", "Token 42"],
              ["h1", "font-display text-h1 font-bold tracking-tight", "Spice Route Kitchen"],
              ["h2", "text-h2 font-semibold tracking-tight", "Starters"],
              ["body", "text-body", "Smoky cottage cheese, charred peppers, mint chutney."],
              ["small", "text-small text-muted", "Serves 1 · 12 min"],
              ["caption", "text-caption font-medium text-muted", "BESTSELLER"],
            ] as const
          ).map(([name, cls, sample]) => (
            <div key={name} className="flex items-baseline gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
              <span className="w-16 shrink-0 font-mono text-caption text-muted">{name}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pt-2">
            <span className="font-mono text-caption text-muted">mono / tabular</span>
            <span className="tabular font-mono text-h2 font-semibold">#0142</span>
            <span className="tabular text-h2 font-semibold">{formatInr(125_000)}</span>
            <span className="tabular text-h2 font-semibold">{formatInr(1_25_00_050)}</span>
            <span className="tabular font-mono text-h2 font-semibold">{formatDuration(754)}</span>
          </div>
        </div>
      </Specimen>

      <div className="grid gap-6 md:grid-cols-2">
        <Specimen title="Radius">
          <div className="flex items-end gap-4">
            {(["rounded-sm", "rounded-md", "rounded-lg", "rounded-pill"] as const).map((r) => (
              <div key={r} className="text-center">
                <div className={cn("size-16 border-2 border-primary bg-primary-soft", r)} />
                <p className="mt-2 font-mono text-caption text-muted">{r.replace("rounded-", "")}</p>
              </div>
            ))}
          </div>
        </Specimen>
        <Specimen title="Elevation" className="bg-surface-2">
          <div className="flex items-end gap-4">
            {(["shadow-sm", "shadow-md", "shadow-lg"] as const).map((s) => (
              <div key={s} className="text-center">
                <div className={cn("size-16 rounded-md bg-surface", s)} />
                <p className="mt-2 font-mono text-caption text-muted">{s.replace("shadow-", "")}</p>
              </div>
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  );
}

function Buttons() {
  const [loading, setLoading] = useState(false);
  const run = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1600);
  };
  return (
    <Section
      id="buttons"
      title="Buttons"
      intro="Verbs on every label. Press scales to 0.97 for instant feedback; loading swaps the label for a spinner without changing width."
    >
      <Specimen title="Variants × states">
        <div className="overflow-x-auto" tabIndex={0}>
          <table className="w-full min-w-[640px] border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-caption font-semibold text-muted uppercase">
                <th className="w-28 font-semibold">Variant</th>
                <th className="font-semibold">Default</th>
                <th className="font-semibold">With icon</th>
                <th className="font-semibold">Disabled</th>
                <th className="font-semibold">Loading</th>
              </tr>
            </thead>
            <tbody>
              {(["primary", "secondary", "ghost", "soft", "danger"] as const).map((v) => (
                <tr key={v}>
                  <td className="font-mono text-caption text-muted">{v}</td>
                  <td>
                    <Button variant={v}>{v === "danger" ? "Reject" : "Place order"}</Button>
                  </td>
                  <td>
                    <Button variant={v}>
                      {v === "danger" ? <Trash2 /> : <Plus />}
                      {v === "danger" ? "Delete" : "Add item"}
                    </Button>
                  </td>
                  <td>
                    <Button variant={v} disabled>
                      Unavailable
                    </Button>
                  </td>
                  <td>
                    <Button variant={v} loading>
                      Pay {formatInr(45_000)}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Specimen>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Sizes">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Mark ready</Button>
          </div>
        </Specimen>
        <Specimen title="Try it">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} loading={loading}>
              Pay {formatInr(1_25_000)}
            </Button>
            <Tooltip content="Copy order link">
              <IconButton aria-label="Copy order link" variant="secondary">
                <Copy />
              </IconButton>
            </Tooltip>
            <Tooltip content="Edit item">
              <IconButton aria-label="Edit item" variant="secondary">
                <Pencil />
              </IconButton>
            </Tooltip>
            <Tooltip content="Call waiter">
              <IconButton aria-label="Call waiter" variant="secondary">
                <Bell />
              </IconButton>
            </Tooltip>
          </div>
          <p className="mt-3 text-small text-muted">
            Hover one icon, then slide across: follow-up tooltips open instantly.
          </p>
        </Specimen>
      </div>
      <Specimen title="Block (sticky bottom-bar action)">
        <div className="mx-auto max-w-sm">
          <Button block size="lg">
            <span className="flex w-full items-center justify-between">
              <span>View cart · 3 items</span>
              <span className="tabular">{formatInr(84_500)}</span>
            </span>
          </Button>
        </div>
      </Specimen>
    </Section>
  );
}

function Forms() {
  const [name, setName] = useState("");
  const [available, setAvailable] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [size, setSize] = useState("regular");
  const showError = name.length > 0 && name.trim().length < 3;
  return (
    <Section
      id="forms"
      title="Forms"
      intro="Label above, helper or error below, wired with aria-describedby. Inputs never drop under 16px so iOS never zooms."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Text inputs" className="space-y-5">
          <Field
            label="Item name"
            helper="Shown on the menu and the kitchen ticket."
            error={showError ? "Use at least 3 characters." : undefined}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Paneer Tikka" />
          </Field>
          <Field label="Search menu">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
              <Input type="search" placeholder="Search dishes" className="pl-10" />
            </div>
          </Field>
          <Field label="Note for the kitchen" optional helper="Allergies, spice level, no onion…">
            <Textarea placeholder="Less spicy, please" />
          </Field>
          <Field label="GSTIN" helper="Disabled until the outlet is verified.">
            <Input disabled value="36AABCU9603R1ZM" readOnly />
          </Field>
        </Specimen>

        <div className="space-y-6">
          <Specimen title="Select" className="space-y-5">
            <Field label="Outlet mode">
              <Select defaultValue="dine_in">
                <SelectTrigger>
                  <SelectValue placeholder="Choose a mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine-in (table QR)</SelectItem>
                  <SelectItem value="canteen">Canteen (token pickup)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Specimen>
          <Specimen title="Switch and checkbox" className="space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-body font-medium">Available</span>
                <span className="block text-small text-muted">Guests can add this item.</span>
              </span>
              <Switch checked={available} onCheckedChange={setAvailable} aria-label="Available" />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span className="text-body font-medium">Auto-accept orders</span>
              <Switch checked={autoAccept} onCheckedChange={setAutoAccept} aria-label="Auto-accept orders" />
            </label>
            <label className="flex items-center justify-between gap-4 opacity-100">
              <span className="text-body font-medium text-muted">Prepaid only (canteen)</span>
              <Switch disabled aria-label="Prepaid only" />
            </label>
            <div className="space-y-3 border-t border-border pt-4">
              {["Veg", "Jain", "Gluten-free"].map((t, i) => (
                <label key={t} className="flex items-center gap-3 text-body">
                  <Checkbox defaultChecked={i === 0} /> {t}
                </label>
              ))}
              <label className="flex items-center gap-3 text-body text-muted">
                <Checkbox disabled /> Vegan (coming soon)
              </label>
            </div>
          </Specimen>
          <Specimen title="Radio group (variant)">
            <RadioGroup value={size} onValueChange={setSize} aria-label="Size">
              {(
                [
                  ["half", "Half", 0],
                  ["regular", "Regular", 6_000],
                  ["family", "Family", 18_000],
                ] as const
              ).map(([v, l, delta]) => (
                <label
                  key={v}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3.5 py-3",
                    "transition-[border-color,background-color] duration-[var(--motion-fast)] ease-out",
                    size === v ? "border-primary bg-primary-soft" : "border-border hover-fine:bg-surface-2",
                  )}
                >
                  <Radio value={v} />
                  <span className="flex-1 text-body font-medium">{l}</span>
                  <span className="tabular text-small text-muted">
                    {delta === 0 ? "Included" : `+${formatInr(delta)}`}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Specimen>
        </div>
      </div>
    </Section>
  );
}

function Ordering() {
  const [qty, setQty] = useState(2);
  const [filters, setFilters] = useState<Record<string, boolean>>({ Veg: true });
  const tags: [string, ReactNode][] = [
    ["Veg", <Leaf key="v" />],
    ["Vegan", <Leaf key="vg" />],
    ["Jain", null],
    ["Gluten-free", <Wheat key="g" />],
    ["Spicy", <Flame key="s" />],
    ["Bestsellers", null],
  ];
  return (
    <Section
      id="ordering"
      title="Ordering primitives"
      intro="The guest-side building blocks: stepper, filter chips and diet marks. Shape plus label means colour is never the only signal."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Specimen title="Quantity stepper" className="space-y-4">
          <div className="flex items-center gap-4">
            <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(0, n))} itemName="Paneer Tikka" />
            <span className="text-small text-muted">{qty === 0 ? "Removed" : `${qty} in cart`}</span>
          </div>
          <QuantityStepper value={1} onChange={() => undefined} itemName="Masala Chai" size="lg" />
          <p className="text-small text-muted">At 1, minus becomes remove.</p>
        </Specimen>
        <Specimen title="Diet marks" className="space-y-3">
          {(["sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="flex items-center gap-3">
              <DietMark veg size={s} />
              <DietMark veg={false} size={s} />
              <span className="font-mono text-caption text-muted">{s}</span>
            </div>
          ))}
        </Specimen>
        <Specimen title="Badges" className="flex flex-wrap gap-2">
          <Badge tone="primary">Bestseller</Badge>
          <Badge tone="success">Paid</Badge>
          <Badge tone="warning">Low stock</Badge>
          <Badge tone="danger">Sold out</Badge>
          <Badge tone="info">New</Badge>
          <Badge>Chef’s pick</Badge>
          <Badge tone="outline">Table 12</Badge>
        </Specimen>
      </div>
      <Specimen title="Dietary filter chips (scroll horizontally on phones)">
        <ChipGroup label="Dietary filters">
          {tags.map(([t, icon]) => (
            <Chip
              key={t}
              selected={Boolean(filters[t])}
              onSelectedChange={(on) => setFilters((f) => ({ ...f, [t]: on }))}
              icon={icon}
            >
              {t}
            </Chip>
          ))}
        </ChipGroup>
      </Specimen>
    </Section>
  );
}

function Status() {
  return (
    <Section
      id="status"
      title="Order status"
      intro="Six states, each with a colour, a label and an icon, matching the state machine values exactly."
    >
      <Specimen title="Status badges" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {orderStatuses.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {orderStatuses.map((s) => (
            <StatusBadge key={s} status={s} size="lg" />
          ))}
        </div>
      </Specimen>
    </Section>
  );
}

function Feedback() {
  const [conn, setConn] = useState<"online" | "reconnecting" | "offline">("reconnecting");
  return (
    <Section
      id="feedback"
      title="Feedback"
      intro="Loading, empty, connection and toast states. No screen is ever left blank, and network errors never blame the guest."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Toasts (4 s, swipe to dismiss)" className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Added to cart", { description: "Paneer Tikka × 2" })}>
            Success
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.error("Paneer Tikka just sold out", {
                description: "Remove it to continue.",
                action: { label: "Remove", onClick: () => undefined },
              })
            }
          >
            Error
          </Button>
          <Button variant="secondary" onClick={() => toast.info("Waiter is on the way")}>
            Info
          </Button>
        </Specimen>
        <Specimen title="Connection banner" className="space-y-3 p-0 sm:p-0">
          <ConnectionBanner state={conn} />
          <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
            {(["online", "reconnecting", "offline"] as const).map((s) => (
              <Button key={s} size="sm" variant={conn === s ? "primary" : "secondary"} onClick={() => setConn(s)}>
                {s}
              </Button>
            ))}
          </div>
        </Specimen>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Skeleton (menu list)" className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-1 space-y-2.5 py-1">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="mt-3 h-4 w-16" />
              </div>
              <Skeleton className="size-24 rounded-md" />
            </div>
          ))}
        </Specimen>
        <Specimen title="Empty state" className="p-0 sm:p-0">
          <EmptyState
            icon={Receipt}
            title="No orders yet"
            description="New orders will appear here."
            action={<Button variant="secondary">Share table QR</Button>}
          />
        </Specimen>
      </div>
    </Section>
  );
}

function Overlays() {
  const [qty, setQty] = useState(1);
  return (
    <Section
      id="overlays"
      title="Overlays"
      intro="Bottom sheet on phones (drag or flick to dismiss), side drawer on desktop. Dialogs are for confirmations only. Escape closes everything; focus is trapped and restored."
    >
      <Specimen title="Sheet, dialog, menu" className="flex flex-wrap items-center gap-3">
        <Sheet
          trigger={<Button>Open item sheet</Button>}
          title="Paneer Tikka"
          description="Smoky cottage cheese, charred peppers, mint chutney."
          footer={
            <div className="flex items-center gap-3">
              <QuantityStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} itemName="Paneer Tikka" />
              <Button block size="lg" onClick={() => toast.success("Added to cart")}>
                Add {formatInr(32_000 * qty)}
              </Button>
            </div>
          }
        >
          <div className="space-y-5">
            <Field label="Note" optional>
              <Textarea placeholder="Less spicy, please" />
            </Field>
            <p className="text-small text-muted">
              Long content scrolls inside the sheet while the action stays pinned.
            </p>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Sheet>

        <Dialog
          trigger={<Button variant="danger">Reject order</Button>}
          title="Reject order #0142?"
          description="The guest sees your reason. Any payment is refunded automatically."
          actions={
            <>
              <DialogClose asChild>
                <Button variant="secondary">Keep order</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger" onClick={() => toast.success("Order rejected")}>
                  Reject order
                </Button>
              </DialogClose>
            </>
          }
        >
          <Field label="Reason">
            <Input placeholder="Kitchen closing early" />
          </Field>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton aria-label="Order actions" variant="secondary">
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Order #0142</DropdownMenuLabel>
            <DropdownMenuItem>
              <UtensilsCrossed /> Mark served
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy /> Copy link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>
              <Trash2 /> Cancel order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Specimen>
    </Section>
  );
}

function Data() {
  const [page, setPage] = useState(1);
  const rows = [
    { id: "0142", table: "T4", items: 3, total: 84_500, status: "preparing" as const, age: 412 },
    { id: "0141", table: "T12", items: 1, total: 18_000, status: "ready" as const, age: 905 },
    { id: "0140", table: "T2", items: 5, total: 1_42_050, status: "placed" as const, age: 48 },
    { id: "0139", table: "T7", items: 2, total: 52_000, status: "served" as const, age: 1_820 },
  ];
  return (
    <Section id="data" title="Data" intro="Dashboard tables, tabs and pagination. Numbers are tabular so columns don’t jitter.">
      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="done">Completed</TabsTrigger>
          <TabsTrigger value="empty">Cancelled</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Waiting</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular font-mono font-semibold">#{r.id}</TableCell>
                  <TableCell>{r.table}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="tabular text-right">{r.items}</TableCell>
                  <TableCell className={cn("tabular text-right font-mono", r.age > 900 && "font-semibold text-danger")}>
                    {formatDuration(r.age)}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">{formatInr(r.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end">
            <Pagination page={page} pageCount={4} onPageChange={setPage} />
          </div>
        </TabsContent>
        <TabsContent value="done">
          <Card>
            <CardHeader>
              <CardTitle>Today so far</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {(
                [
                  ["Orders", "128"],
                  ["Revenue", formatInr(9_84_250_00)],
                  ["AOV", formatInr(76_900)],
                ] as const
              ).map(([l, v]) => (
                <div key={l}>
                  <p className="text-small text-muted">{l}</p>
                  <p className="tabular font-display text-h1 font-bold">{v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="empty">
          <Card>
            <EmptyState icon={Receipt} title="No cancelled orders" description="Cancelled and rejected orders appear here." />
          </Card>
        </TabsContent>
      </Tabs>
    </Section>
  );
}
