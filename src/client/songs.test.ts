import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSongs, parseSong, parseTune, typography } from "./songs";

describe("parseSong", () => {
  it("parses header, stanzas, chorus and indented lines", () => {
    const song = parseSong(
      "test",
      `---\ntitle: Test Song\nabout: https://example.com\nlayout: columns\n---\n\nOne\nTwo *Chorus*\n  three\n\nChorus:\nSing\n`,
    );
    expect(song).toEqual({
      id: "test",
      title: "Test Song",
      about: "https://example.com",
      layout: "columns",
      stanzas: [
        {
          chorus: false,
          lines: [
            { text: "One", indent: false },
            { text: "Two *Chorus*", indent: false },
            { text: "three", indent: true },
          ],
        },
        { chorus: true, lines: [{ text: "Sing", indent: false }] },
      ],
    });
  });

  it("rejects a missing header", () => {
    expect(() => parseSong("x", "no header")).toThrow();
  });
});

describe("typography", () => {
  it("curls quotes and apostrophes", () => {
    expect(typography(`He said, "Let's go" 'Tis "Stop!"`)).toBe("He said, \u201cLet\u2019s go\u201d \u2019Tis \u201cStop!\u201d");
    expect(typography(`"Glory to the new-born King;`)).toBe("\u201cGlory to the new-born King;");
    expect(typography(`God and sinners reconciled!"`)).toBe("God and sinners reconciled!\u201d");
  });
  it("makes dashes and ellipses", () => {
    expect(typography("the wood--")).toBe("the wood\u2014");
    expect(typography("slow -- so")).toBe("slow\u2014so");
    expect(typography("Roasting...")).toBe("Roasting\u2026");
  });
});

describe("parseTune", () => {
  it("reads pitches, octaves, accidentals, lengths and dots", () => {
    expect(parseTune("C4q | A4e F#4h. Bb3s rw")).toEqual([
      { pitch: 60, beats: 1 },
      { pitch: 69, beats: 0.5 },
      { pitch: 66, beats: 3 },
      { pitch: 58, beats: 0.25 },
      { pitch: null, beats: 4 },
    ]);
  });
  it("rejects notes it can't read", () => {
    expect(() => parseTune("C4q H4q")).toThrow(/H4q/);
    expect(() => parseTune("C4")).toThrow();
    expect(() => parseTune("|")).toThrow();
  });
});

describe("songs/*.md", () => {
  const dir = new URL("../../songs/", import.meta.url);
  const files = Object.fromEntries(
    readdirSync(dir).map((f) => [`songs/${f}`, readFileSync(new URL(f, dir), "utf8")]),
  );
  const songs = loadSongs(files);

  it("all parse with titles and stanzas", () => {
    expect(songs.length).toBeGreaterThan(30);
    for (const song of songs) {
      expect(song.stanzas.length, song.id).toBeGreaterThan(0);
    }
  });

  it("tunes are short openings in a comfortable range", () => {
    for (const song of songs.filter((s) => s.tune)) {
      const { tempo, notes } = song.tune!;
      const seconds = (notes.reduce((sum, n) => sum + n.beats, 0) * 60) / tempo;
      expect(seconds, song.id).toBeLessThan(20);
      for (const n of notes) {
        if (n.pitch === null) continue;
        // G3 to A5
        expect(n.pitch, song.id).toBeGreaterThanOrEqual(55);
        expect(n.pitch, song.id).toBeLessThanOrEqual(81);
      }
    }
  });

  // House style, so every song reads the same. See README.
  const lyricLines = Object.entries(files).flatMap(([path, source]) =>
    source
      .replace(/^---\n[\s\S]*?\n---\n/, "")
      .split("\n")
      .map((line, i) => ({ where: `${path} line ${i + 1}: ${line}`, line: line.trim() }))
      .filter(({ line }) => line && !/^chorus:$/i.test(line)),
  );

  it("use plain ASCII punctuation", () => {
    for (const { where, line } of lyricLines) {
      expect(line, where).not.toMatch(/[\u2018\u2019\u201c\u201d\u2013\u2014\u2026]/);
    }
  });

  it("start every line with a capital", () => {
    for (const { where, line } of lyricLines) {
      expect(line, where).not.toMatch(/^["(]?[a-z]/);
    }
  });

  it("write repeats as (x3)", () => {
    for (const { where, line } of lyricLines) {
      expect(line.replace(/\(x\d+\)/g, ""), where).not.toMatch(/\bx\d+\b/);
    }
  });

  it("put dialogue in double quotes", () => {
    // A leading apostrophe is only allowed for elisions like 'Tis.
    for (const { where, line } of lyricLines) {
      expect(line.replace(/(^|[\s("])'(tis|til|twas|cause|em|round|neath)\b/gi, ""), where).not.toMatch(
        /(^|[\s("])'[a-z]/i,
      );
    }
  });

  it("have unique titles", () => {
    const titles = songs.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
