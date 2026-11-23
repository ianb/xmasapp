import { describe, expect, it } from "vitest";
import { isValidCode, newCode, parseCode, parseNowSinging } from "./protocol";

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

describe("parseCode", () => {
  it("accepts typed codes in any case, with spaces or dashes", () => {
    expect(parseCode("P9PJR")).toBe("p9pjr");
    expect(parseCode(" p9 pjr ")).toBe("p9pjr");
    expect(parseCode("P9-PJR")).toBe("p9pjr");
  });
  it("accepts a pasted session link", () => {
    expect(parseCode("https://xmascarols.app/s/P9PJR")).toBe("p9pjr");
    expect(parseCode("xmascarols.app/s/p9pjr/song/silent-night")).toBe("p9pjr");
  });
  it("rejects things that aren't codes", () => {
    expect(parseCode("")).toBeNull();
    expect(parseCode("ab")).toBeNull();
    expect(parseCode("hello there!")).toBeNull();
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
