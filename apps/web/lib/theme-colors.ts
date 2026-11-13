/**
 * Browser chrome colours for the viewport meta, which cannot read CSS variables.
 * Must mirror --color-bg in app/tokens.css; allow-listed by scripts/check-raw-hex.mjs.
 */
export const themeColors = { light: "#fafaf7", dark: "#111315" } as const;
