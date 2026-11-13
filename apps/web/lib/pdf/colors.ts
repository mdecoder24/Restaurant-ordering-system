import { rgb } from "pdf-lib";
import { printColors } from "@/lib/theme-colors";

function fromHex(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export const pdfColors = {
  ink: fromHex(printColors.ink),
  muted: fromHex(printColors.muted),
  brand: fromHex(printColors.brand),
  rule: fromHex(printColors.rule),
};
