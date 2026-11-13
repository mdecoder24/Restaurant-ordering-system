/**
 * Avatar initials from a display name: first letter of the first two words that start with a
 * letter or digit, so "Ravi (floor)" gives "RF", not "R(".
 */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((w) => w.match(/[\p{L}\p{N}]/u)?.[0] ?? "")
    .filter(Boolean);
  return letters.slice(0, 2).join("").toUpperCase() || "?";
}
