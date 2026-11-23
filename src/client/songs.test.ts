import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadSongs, parseSong } from "./songs";

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

  it("have unique titles", () => {
    const titles = songs.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
