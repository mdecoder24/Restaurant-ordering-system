#!/usr/bin/env node
// AGENTS.md rule 7: components use tokens, never raw hex. Only the token sources may hold colours.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const scanDirs = ["apps/web/app", "apps/web/components", "apps/web/lib"];
const allow = new Set(["apps/web/app/tokens.css", "apps/web/lib/theme-colors.ts"]);
const exts = /\.(tsx?|css|mjs|js)$/;
// CSS: any hex. TS/TSX: a string literal that is exactly a colour (so "#0142" order labels pass).
const cssHex = /#[0-9a-fA-F]{3,8}\b/g;
const tsHex = /["'`]#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})["'`]|(?:rgb|hsl)a?\(\s*\d/g;
// Tailwind arbitrary colours like bg-[rgb(...)] are also banned.
const arbitrary = /\b(?:bg|text|border|fill|stroke|ring|outline|from|to|via)-\[(?:#|rgb|hsl|oklch)/g;

const failures = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (exts.test(name)) check(full);
  }
}
function check(file) {
  const rel = relative(root, file);
  if (allow.has(rel) || /\.test\.tsx?$/.test(rel)) return;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      // Ignore HTML entities like &#8377; and URL fragments in hrefs.
      const cleaned = line.replace(/&#\w+;/g, "").replace(/href="[^"]*"/g, "");
      const hex = rel.endsWith(".css") ? cssHex : tsHex;
      if (cleaned.match(hex) || cleaned.match(arbitrary)) failures.push(`${rel}:${i + 1}: ${line.trim()}`);
    });
}
for (const d of scanDirs) walk(join(root, d));
if (failures.length) {
  console.error("Raw colour values found outside token files:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("check-raw-hex: ok");
