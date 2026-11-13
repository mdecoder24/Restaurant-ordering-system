import { describe, expect, it } from "vitest";
import { computeBill, roundDiv, unitPrice } from "./bill";

const exclusive = { defaultTaxRateBps: 500, pricesIncludeTax: false, serviceChargeBps: 0 };

describe("roundDiv", () => {
  it("rounds half up", () => {
    expect(roundDiv(5, 2)).toBe(3);
    expect(roundDiv(4, 3)).toBe(1);
    expect(roundDiv(0, 7)).toBe(0);
  });
});

describe("unitPrice", () => {
  it("adds variant delta and add-ons", () => {
    expect(unitPrice(10_000, 2_000, [500, 1_500])).toBe(14_000);
    expect(unitPrice(10_000, -2_000, [])).toBe(8_000);
  });
  it("rejects negative results", () => {
    expect(() => unitPrice(1_000, -2_000, [])).toThrow(RangeError);
  });
});

describe("computeBill", () => {
  it("handles an empty cart", () => {
    expect(computeBill([], exclusive)).toEqual({
      lines: [], subtotal: 0, serviceCharge: 0, cgst: 0, sgst: 0, tax: 0, rounding: 0, total: 0,
    });
  });

  it("adds exclusive GST and splits CGST/SGST", () => {
    const bill = computeBill([{ unitPrice: 18_000, qty: 2, taxRateBps: null }, { unitPrice: 6_000, qty: 1, taxRateBps: 1_800 }], exclusive);
    expect(bill.subtotal).toBe(42_000);
    expect(bill.tax).toBe(1_800 + 1_080);
    expect(bill.cgst + bill.sgst).toBe(bill.tax);
    expect(bill.total).toBe(44_900);
    expect(bill.rounding).toBe(20);
  });

  it("extracts GST from tax-inclusive prices", () => {
    const bill = computeBill([{ unitPrice: 10_500, qty: 1, taxRateBps: 500 }], { ...exclusive, pricesIncludeTax: true });
    expect(bill.lines[0]).toEqual({ gross: 10_500, net: 10_000, tax: 500 });
    expect(bill.total).toBe(10_500);
  });

  it("charges service and taxes it at the default rate", () => {
    const bill = computeBill([{ unitPrice: 10_000, qty: 1, taxRateBps: 0 }], { ...exclusive, serviceChargeBps: 1_000 });
    expect(bill.serviceCharge).toBe(1_000);
    expect(bill.tax).toBe(50);
    expect(bill.cgst).toBe(25);
    expect(bill.sgst).toBe(25);
    expect(bill.total).toBe(11_100);
    expect(bill.rounding).toBe(50);
  });

  it("puts the odd paisa on SGST and can round down", () => {
    const bill = computeBill([{ unitPrice: 2_020, qty: 1, taxRateBps: 500 }], exclusive);
    expect(bill.tax).toBe(101);
    expect(bill.cgst).toBe(50);
    expect(bill.sgst).toBe(51);
    expect(bill.total).toBe(2_100);
    const down = computeBill([{ unitPrice: 10_000, qty: 1, taxRateBps: 0 }, { unitPrice: 30, qty: 1, taxRateBps: 0 }], exclusive);
    expect(down.rounding).toBe(-30);
    expect(down.total).toBe(10_000);
  });

  it.each([
    [{ unitPrice: 1.5, qty: 1, taxRateBps: 0 }],
    [{ unitPrice: -1, qty: 1, taxRateBps: 0 }],
    [{ unitPrice: 100, qty: 0, taxRateBps: 0 }],
    [{ unitPrice: 100, qty: 1.5, taxRateBps: 0 }],
    [{ unitPrice: 100, qty: 1, taxRateBps: -5 }],
  ])("rejects invalid line %o", (line) => {
    expect(() => computeBill([line], exclusive)).toThrow(RangeError);
  });

  it("rejects an invalid config", () => {
    expect(() => computeBill([], { ...exclusive, serviceChargeBps: -1 })).toThrow(RangeError);
    expect(() => computeBill([], { ...exclusive, defaultTaxRateBps: 0.5 })).toThrow(RangeError);
  });
});
