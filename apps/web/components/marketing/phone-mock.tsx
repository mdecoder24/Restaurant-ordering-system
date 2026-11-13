import { MapPin, ShoppingBag } from "lucide-react";
import { DietMark } from "@/components/ui/diet-mark";
import { cn } from "@/lib/cn";

/** Example dishes for the illustration only (not menu data; AGENTS rule 11). */
const rows = [
  { name: "Masala dosa", price: "₹180", veg: true, qty: 2 },
  { name: "Chicken 65", price: "₹260", veg: false, qty: 1 },
  { name: "Filter coffee", price: "₹60", veg: true, qty: 2 },
  { name: "Gulab jamun", price: "₹90", veg: true, qty: 0 },
];

/** A phone showing the guest menu, drawn with tokens so it follows light and dark themes. */
export function PhoneMock({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-[440px] w-[216px] rounded-[2.25rem] border border-border-strong bg-text p-[7px] shadow-lg",
        className,
      )}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[1.8rem] bg-bg">
        <div className="mx-auto mt-2 h-5 w-20 rounded-pill bg-text" />
        <div className="px-3.5 pt-3">
          <p className="text-[0.5625rem] font-bold tracking-wide text-primary uppercase">Spice route</p>
          <div className="flex items-center justify-between">
            <p className="font-display text-body font-bold">Our menu</p>
            <span className="inline-flex items-center gap-0.5 rounded-pill border border-border bg-surface px-1.5 py-0.5 text-[0.5625rem] font-semibold">
              <MapPin className="size-2.5 text-primary" strokeWidth={2.75} />
              Table 7
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {["Starters", "Mains", "Drinks"].map((c, i) => (
              <span
                key={c}
                className={cn(
                  "rounded-pill px-2 py-0.5 text-[0.5625rem] font-semibold",
                  i === 0 ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
                )}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <ul className="mt-2 flex flex-col divide-y divide-border px-3.5">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <DietMark veg={r.veg} size="sm" />
                <p className="mt-0.5 truncate text-[0.6875rem] font-semibold">{r.name}</p>
                <p className="text-[0.625rem] text-muted tabular">{r.price}</p>
              </div>
              {r.qty ? (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-pill border border-primary/40 bg-primary-soft px-2 text-[0.625rem] font-bold text-primary tabular">
                  − {r.qty} +
                </span>
              ) : (
                <span className="inline-flex h-6 items-center rounded-pill border border-primary/40 bg-surface px-2.5 text-[0.625rem] font-bold text-primary">
                  ADD
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-auto p-2.5">
          <div className="flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-primary-fg shadow-md">
            <ShoppingBag className="size-3.5" />
            <span className="text-[0.6875rem] font-semibold">5 items</span>
            <span className="ml-auto font-display text-[0.75rem] font-bold tabular">₹740</span>
          </div>
        </div>
      </div>
    </div>
  );
}
