export interface Line {
  text: string;
  indent: boolean;
}

export interface Stanza {
  chorus: boolean;
  lines: Line[];
}

/** Public domain artwork for a song's link preview; see art/art.json. */
export interface Art {
  title: string;
  artist: string;
  date: string;
  museum: string;
  /** The museum's page for the artwork. */
  url: string;
  /** Image the share picture is made from. */
  image: string;
}

export type Layout = "normal" | "columns" | "longlines";

export interface Song {
  /** URL-safe identifier, from the file name (e.g. "silent-night"). */
  id: string;
  title: string;
  about?: string;
  layout: Layout;
  stanzas: Stanza[];
  /** The opening of the melody, to remind people how the song goes. */
  tune?: Tune;
}

export interface Note {
  /** MIDI note number (60 is middle C), or null for a rest. */
  pitch: number | null;
  /** Length in beats, where a quarter note is one beat. */
  beats: number;
}

export interface Tune {
  /** Quarter notes per minute. */
  tempo: number;
  notes: Note[];
}

/**
 * Parse a song file. Format:
 *
 *     ---
 *     title: Silent Night
 *     about: https://...
 *     layout: columns | longlines   (optional)
 *     tune: G4q. A4e G4q E4h. | G4q. A4e G4q E4h.   (optional, see parseTune)
 *     tempo: 90                     (optional, quarter notes per minute)
 *     ---
 *
 *     First stanza line
 *     Second line
 *       an indented (refrain) line
 *
 *     Chorus:
 *     A chorus stanza starts with a "Chorus:" line
 *
 * Stanzas are separated by blank lines; *text* is a cue like *Chorus*, and
 * (x3) marks a repeat. Files use plain ASCII punctuation (' " -- ...), which
 * is turned into typographic quotes, dashes and ellipses here.
 */
export function parseSong(id: string, source: string): Song {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match) {
    throw new Error(`Song ${id} is missing its --- header ---`);
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  if (!meta.title) {
    throw new Error(`Song ${id} has no title`);
  }
  const layout = (meta.layout || "normal") as Layout;
  if (!["normal", "columns", "longlines"].includes(layout)) {
    throw new Error(`Song ${id} has unknown layout ${layout}`);
  }

  const body = source.slice(match[0].length).replace(/\r\n/g, "\n");
  const stanzas: Stanza[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const rawLines = block.split("\n").filter((l) => l.trim());
    if (!rawLines.length) continue;
    let chorus = false;
    if (/^chorus:$/i.test(rawLines[0].trim())) {
      chorus = true;
      rawLines.shift();
    }
    stanzas.push({
      chorus,
      lines: rawLines.map((l) => ({ text: typography(l.trim()), indent: /^\s/.test(l) })),
    });
  }

  let tune: Tune | undefined;
  if (meta.tune) {
    const tempo = meta.tempo ? Number(meta.tempo) : 100;
    if (!(tempo > 0)) throw new Error(`Song ${id} has a bad tempo ${meta.tempo}`);
    try {
      tune = { tempo, notes: parseTune(meta.tune) };
    } catch (e) {
      throw new Error(`Song ${id}: ${(e as Error).message}`);
    }
  }

  return { id, title: typography(meta.title), about: meta.about || undefined, layout, stanzas, tune };
}

const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LENGTHS: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

/**
 * Parse a tune: notes separated by spaces, with | bar lines for readability.
 * A note is a pitch and octave (C4 is middle C; # sharp, b flat) or r for a
 * rest, then its length: w whole, h half, q quarter, e eighth, s sixteenth,
 * with . for dotted. "F#4q." is a dotted quarter F sharp above middle C.
 */
export function parseTune(text: string): Note[] {
  const notes: Note[] = [];
  for (const token of text.split(/\s+/)) {
    if (!token || token === "|") continue;
    const m = /^(?:([A-G])([#b]?)(\d)|r)([whqes])(\.?)$/.exec(token);
    if (!m) throw new Error(`can't read note "${token}" in tune`);
    const [, step, accidental, octave, length, dot] = m;
    const pitch = step
      ? 12 * (Number(octave) + 1) + STEPS[step] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0)
      : null;
    notes.push({ pitch, beats: LENGTHS[length] * (dot ? 1.5 : 1) });
  }
  if (!notes.length) throw new Error("tune has no notes");
  return notes;
}

/** Curly quotes, em dashes and ellipses from plain ASCII punctuation. */
export function typography(text: string): string {
  return text
    .replace(/\s*--\s*/g, "\u2014")
    .replace(/\.\.\./g, "\u2026")
    .replace(/(^|[\s(\[\u2014])"/g, "$1\u201c")
    .replace(/"/g, "\u201d")
    .replace(/'/g, "\u2019");
}

/** Sort key that ignores a leading article ("The First Noël" sorts under F). */
export function sortKey(title: string): string {
  return title.replace(/^(the|a|an)\s+/i, "");
}

export function loadSongs(files: Record<string, string>): Song[] {
  const songs = Object.entries(files).map(([path, source]) => {
    const id = path.replace(/^.*\//, "").replace(/\.md$/, "");
    return parseSong(id, source);
  });
  songs.sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)));
  return songs;
}
