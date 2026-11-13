import { describe, expect, it } from "vitest";
import { formatDuration, formatInr, paiseToInput, parseInr } from "./format";

describe("formatInr", () => {
  it.each([
    [0, "₹0"],
    [50, "₹0.50"],
    [100, "₹1"],
    [125_000, "₹1,250"],
    [12_500_000, "₹1,25,000"],
    [12_345_678_905, "₹12,34,56,789.05"],
    [45_010, "₹450.10"],
    [-5_000, "-₹50"],
  ])("formats %i paise as %s", (paise, expected) => {
    expect(formatInr(paise)).toBe(expected);
  });

  it("handles the largest safe integer without float drift", () => {
    expect(formatInr(Number.MAX_SAFE_INTEGER)).toBe("₹9,00,71,99,25,47,409.91");
  });

  it.each([1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 2])(
    "rejects non-integer paise %s",
    (value) => {
      expect(() => formatInr(value)).toThrow(RangeError);
    },
  );
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [65, "1:05"],
    [600, "10:00"],
    [3_723, "1:02:03"],
    [59.9, "0:59"],
  ])("formats %d seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("clamps negative durations to zero", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});

describe("parseInr / paiseToInput", () => {
  it.each([
    ["120", 12_000],
    ["120.5", 12_050],
    ["120.05", 12_005],
    ["₹ 1,250.00", 125_000],
    ["0", 0],
  ])("parses %s", (input, paise) => {
    expect(parseInr(input)).toBe(paise);
  });
  it.each(["", "abc", "1.234", "-5", "1e3", "12."])("rejects %s", (input) => {
    expect(parseInr(input)).toBeNull();
  });
  it("round-trips", () => {
    expect(paiseToInput(12_050)).toBe("120.50");
    expect(paiseToInput(12_000)).toBe("120");
    expect(parseInr(paiseToInput(99_999))).toBe(99_999);
  });
});
