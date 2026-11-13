import { describe, expect, it } from "vitest";
import { localDate, startOfLocalDay } from "./index";

describe("time helpers", () => {
  it("finds local midnight in IST", () => {
    const now = new Date("2026-11-13T20:00:00Z"); // 01:30 IST on the 14th
    expect(startOfLocalDay("Asia/Kolkata", now)).toBe("2026-11-13T18:30:00.000Z");
    expect(localDate("Asia/Kolkata", now)).toBe("2026-11-14");
  });
  it("works for UTC", () => {
    expect(startOfLocalDay("UTC", new Date("2026-11-13T10:15:30Z"))).toBe("2026-11-13T00:00:00.000Z");
  });
});
