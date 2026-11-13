import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("skips punctuation", () => expect(initials("Ravi (floor)")).toBe("RF"));
  it("takes two words", () => expect(initials("Asha Rao Kumar")).toBe("AR"));
  it("handles one word", () => expect(initials("Kitchen")).toBe("K"));
  it("falls back for empty names", () => expect(initials("  ( ) ")).toBe("?"));
  it("keeps non-Latin letters", () => expect(initials("आशा राव")).toBe("आर"));
});
