import { cn } from "@/lib/cn";

type DietMarkProps = { veg: boolean; size?: "sm" | "md" | "lg"; className?: string };

const dims = { sm: "size-3.5 border-[1.5px]", md: "size-4 border-2", lg: "size-5 border-2" };
const dot = { sm: "size-1.5", md: "size-2", lg: "size-2.5" };

/**
 * Indian food-label convention: a square with a filled dot (veg) or triangle (non-veg).
 * The triangle shape plus the accessible label mean colour is never the only signal.
 */
export function DietMark({ veg, size = "md", className }: DietMarkProps) {
  return (
    <span
      role="img"
      aria-label={veg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[3px] bg-surface",
        dims[size],
        veg ? "border-veg" : "border-nonveg",
        className,
      )}
    >
      {veg ? (
        <span className={cn("rounded-full bg-veg", dot[size])} />
      ) : (
        <svg viewBox="0 0 10 10" className={cn("fill-nonveg", dot[size])} aria-hidden>
          <path d="M5 0.8 9.6 9.2H0.4z" />
        </svg>
      )}
    </span>
  );
}
