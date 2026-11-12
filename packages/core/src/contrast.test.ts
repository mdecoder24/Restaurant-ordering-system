import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex } from "./contrast";

describe("parseHex", () => {
  it("parses 6- and 3-digit hex", () => {
    expect(parseHex("#E4572E")).toEqual([228, 87, 46]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
  });

  it("rejects invalid input", () => {
    expect(() => parseHex("red")).toThrow(TypeError);
    expect(() => parseHex("#12345")).toThrow(TypeError);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and symmetric", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("is 1 for identical colours", () => {
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });

  it("matches a known reference value", () => {
    // #767676 on white is the classic 4.54:1 AA threshold grey.
    expect(contrastRatio("#767676", "#FFFFFF")).toBeCloseTo(4.54, 2);
  });
});
