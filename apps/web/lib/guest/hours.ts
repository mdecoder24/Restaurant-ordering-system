import type { OpenHours } from "@krudex/core/schemas";

const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Open-hours check in the outlet's timezone. No hours configured means always open. */
export function isOpenNow(hours: OpenHours | null | undefined, timezone: string, at = new Date()): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at);
  const wd = parts.find((p) => p.type === "weekday")?.value.toLowerCase().slice(0, 3) as (typeof days)[number];
  const hhmm = `${parts.find((p) => p.type === "hour")?.value}:${parts.find((p) => p.type === "minute")?.value}`;
  const today = hours[wd as keyof OpenHours];
  if (!today) return false;
  // Ranges past midnight (e.g. 18:00–02:00) wrap.
  return today.open <= today.close ? hhmm >= today.open && hhmm < today.close : hhmm >= today.open || hhmm < today.close;
}

export function describeHours(hours: OpenHours | null | undefined): string[] {
  if (!hours || Object.keys(hours).length === 0) return ["Open all day"];
  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const names = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
  return order.map((d) => {
    const h = hours[d];
    return `${names[d]}  ${h ? `${h.open}–${h.close}` : "Closed"}`;
  });
}
