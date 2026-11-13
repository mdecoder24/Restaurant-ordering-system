/**
 * Browser chrome colours for the viewport meta, which cannot read CSS variables.
 * Must mirror --color-bg in app/tokens.css; allow-listed by scripts/check-raw-hex.mjs.
 */
export const themeColors = { light: "#fafaf7", dark: "#111315" } as const;

/**
 * Print colours for generated PDFs (table tents, invoices), which cannot read CSS variables.
 * Mirror --color-text, --color-text-muted and --color-primary (light theme).
 */
export const printColors = {
  ink: "#1c1b19",
  muted: "#6b6860",
  brand: "#c2410c",
  rule: "#e3e1da",
} as const;
