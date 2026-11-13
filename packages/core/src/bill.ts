/**
 * computeBill: the single source of pricing truth (Architecture §10). The server uses it to
 * store totals; the client uses it only to display a preview. All values are integer paise
 * (AGENTS.md rule 8); every division goes through `roundDiv`, which rounds half up.
 */

export type BillLineInput = {
  /** Base price + variant delta + add-ons, per unit, in paise. */
  unitPrice: number;
  qty: number;
  /** Item GST rate in basis points; null falls back to the outlet default. */
  taxRateBps: number | null;
};

export type BillConfig = {
  defaultTaxRateBps: number;
  pricesIncludeTax: boolean;
  serviceChargeBps: number;
};

export type BillLine = { gross: number; net: number; tax: number };

export type Bill = {
  lines: BillLine[];
  /** Pre-tax item total. */
  subtotal: number;
  serviceCharge: number;
  cgst: number;
  sgst: number;
  tax: number;
  /** Adjustment that brings the total to a whole rupee (may be negative). */
  rounding: number;
  total: number;
};

function assertPaise(n: number, label: string) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`${label} must be a non-negative integer, got ${n}`);
}

/** Integer a/b rounded half up, for non-negative a and positive b. */
export function roundDiv(a: number, b: number): number {
  return Math.floor((2 * a + b) / (2 * b));
}

export function unitPrice(base: number, variantDelta: number, addonPrices: readonly number[]): number {
  const total = base + variantDelta + addonPrices.reduce((s, p) => s + p, 0);
  assertPaise(total, "unit price");
  return total;
}

export function computeBill(lines: readonly BillLineInput[], config: BillConfig): Bill {
  assertPaise(config.serviceChargeBps, "service charge");
  assertPaise(config.defaultTaxRateBps, "default tax rate");

  const billLines = lines.map((line): BillLine => {
    assertPaise(line.unitPrice, "unit price");
    if (!Number.isSafeInteger(line.qty) || line.qty < 1) throw new RangeError(`qty must be a positive integer, got ${line.qty}`);
    const rate = line.taxRateBps ?? config.defaultTaxRateBps;
    assertPaise(rate, "tax rate");
    const gross = line.unitPrice * line.qty;
    if (config.pricesIncludeTax) {
      const tax = roundDiv(gross * rate, 10_000 + rate);
      return { gross, net: gross - tax, tax };
    }
    return { gross, net: gross, tax: roundDiv(gross * rate, 10_000) };
  });

  const subtotal = billLines.reduce((s, l) => s + l.net, 0);
  const serviceCharge = roundDiv(subtotal * config.serviceChargeBps, 10_000);
  // GST applies to the service charge at the outlet's default rate.
  const serviceTax = roundDiv(serviceCharge * config.defaultTaxRateBps, 10_000);
  const tax = billLines.reduce((s, l) => s + l.tax, 0) + serviceTax;
  // Intra-state supply: split equally; any odd paisa goes to SGST.
  const cgst = Math.floor(tax / 2);
  const sgst = tax - cgst;
  const raw = subtotal + serviceCharge + tax;
  const total = roundDiv(raw, 100) * 100;

  return { lines: billLines, subtotal, serviceCharge, cgst, sgst, tax, rounding: total - raw, total };
}
