import { describe, expect, it } from "vitest";
import { isValidCode, newCode, parseNowSinging } from "./protocol";

describe("session codes", () => {
  it("generates valid codes", () => {
    for (let i = 0; i < 50; i++) expect(isValidCode(newCode())).toBe(true);
  });
  it("rejects bad codes", () => {
    expect(isValidCode("ab")).toBe(false);
    expect(isValidCode("ABCDE")).toBe(false);
    expect(isValidCode("ab/cd")).toBe(false);
  });
});

describe("parseNowSinging", () => {
  it("accepts valid values", () => {
    expect(parseNowSinging(null)).toBeNull();
    expect(parseNowSinging({ songId: "silent-night", stanza: 2 })).toEqual({ songId: "silent-night", stanza: 2 });
    expect(parseNowSinging({ songId: "silent-night", stanza: null })).toEqual({ songId: "silent-night", stanza: null });
  });
  it("rejects invalid values", () => {
    expect(parseNowSinging(undefined)).toBeUndefined();
    expect(parseNowSinging({ songId: "<script>", stanza: 0 })).toBeUndefined();
    expect(parseNowSinging({ songId: "x", stanza: -1 })).toBeUndefined();
    expect(parseNowSinging({ songId: "x", stanza: 1.5 })).toBeUndefined();
    expect(parseNowSinging({ songId: "x" })).toBeUndefined();
  });
});
