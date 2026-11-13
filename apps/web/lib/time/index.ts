/** Start of "today" in an outlet's timezone, as an ISO instant (for range queries). */
export function startOfLocalDay(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offset = localAsUtc - Math.floor(now.getTime() / 1000) * 1000;
  const midnightLocalAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"));
  return new Date(midnightLocalAsUtc - offset).toISOString();
}

/** YYYY-MM-DD for a date in a timezone. */
export function localDate(timezone: string, at = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function formatTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: timezone, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}
