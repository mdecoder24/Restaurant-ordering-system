import { contrastRatio } from "@krudex/core/contrast";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Parses tokens.css so the gate tests the real shipped values, not a copy. */
function readBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Missing ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{3,6})\s*;/gi)) vars[m[1]!] = m[2]!;
  return vars;
}

/** Composites `fg` at `alpha` over `bg`, as Tailwind's `/12` tints render. */
function tint(fg: string, bg: string, alpha: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(fg), p(bg)];
  return (
    "#" +
    a.map((c, i) => Math.round(c * alpha + b[i]! * (1 - alpha)).toString(16).padStart(2, "0")).join("")
  );
}

const css = readFileSync(join(process.cwd(), "app/tokens.css"), "utf8");
const light = readBlock(css, ":root");
const dark = { ...light, ...readBlock(css, '[data-theme="dark"]') };

const textTokens = [
  "--color-text",
  "--color-text-muted",
  "--color-primary",
  "--color-success",
  "--color-warning",
  "--color-danger",
  "--color-info",
  "--status-placed",
  "--status-accepted",
  "--status-preparing",
  "--status-ready",
  "--status-served",
  "--status-cancelled",
];
const backgrounds = ["--color-bg", "--color-surface", "--color-surface-2"];
const solids = ["--color-success", "--color-warning", "--color-danger", "--color-info"];

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("%s theme", (_name, t) => {
  const v = (k: string) => {
    const value = t[k];
    if (!value) throw new Error(`Token ${k} missing`);
    return value;
  };

  it.each(textTokens.flatMap((fg) => backgrounds.map((bg) => [fg, bg])))(
    "%s on %s clears AA",
    (fg, bg) => {
      expect(contrastRatio(v(fg), v(bg))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(textTokens.filter((k) => !["--color-text", "--color-text-muted", "--color-primary"].includes(k)))(
    "%s on its own 12 percent tint (badges) clears AA",
    (fg) => {
      expect(contrastRatio(v(fg), tint(v(fg), v("--color-surface"), 0.12))).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("primary-fg on primary clears AA", () => {
    expect(contrastRatio(v("--color-primary-fg"), v("--color-primary"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(v("--color-primary-fg"), v("--color-primary-hover"))).toBeGreaterThanOrEqual(4.5);
  });

  it("primary on primary-soft clears AA", () => {
    expect(contrastRatio(v("--color-primary"), v("--color-primary-soft"))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(solids)("on-solid text over %s clears AA", (bg) => {
    expect(contrastRatio(v("--color-on-solid"), v(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("focus ring (primary) is visible against the page at 3:1", () => {
    expect(contrastRatio(v("--color-primary"), v("--color-bg"))).toBeGreaterThanOrEqual(3);
  });
});
