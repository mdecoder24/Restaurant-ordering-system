/**
 * Money is integer paise everywhere (AGENTS.md rule 8). Formatting uses BigInt-free
 * integer maths so values up to Number.MAX_SAFE_INTEGER never drift.
 */
export function formatInr(paise: number): string {
  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`formatInr expects integer paise, got ${paise}`);
  }
  const negative = paise < 0;
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const rest = abs % 100;
  const fraction = rest === 0 ? "" : `.${String(rest).padStart(2, "0")}`;
  return `${negative ? "-" : ""}₹${groupIndian(String(rupees))}${fraction}`;
}

/** Indian grouping: last three digits, then pairs (1,25,000). */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${last3}`;
}

/** Elapsed timer for tickets and tracking: m:ss, or h:mm:ss past an hour. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
  return `${minutes}:${seconds}`;
}
