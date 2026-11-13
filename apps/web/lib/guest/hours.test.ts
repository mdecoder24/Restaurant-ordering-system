import { describe, expect, it } from "vitest";
import { isOpenNow } from "./hours";

describe("isOpenNow", () => {
  const at = new Date("2026-11-13T07:30:00Z"); // Fri 13:00 IST
  it("treats empty hours as always open", () => {
    expect(isOpenNow({}, "Asia/Kolkata", at)).toBe(true);
  });
  it("checks the local weekday and time", () => {
    expect(isOpenNow({ fri: { open: "11:00", close: "15:00" } }, "Asia/Kolkata", at)).toBe(true);
    expect(isOpenNow({ fri: { open: "14:00", close: "23:00" } }, "Asia/Kolkata", at)).toBe(false);
    expect(isOpenNow({ fri: null, sat: { open: "00:00", close: "23:59" } }, "Asia/Kolkata", at)).toBe(false);
  });
  it("wraps past midnight", () => {
    expect(isOpenNow({ fri: { open: "18:00", close: "02:00" } }, "Asia/Kolkata", new Date("2026-11-13T15:30:00Z"))).toBe(true);
  });
});
