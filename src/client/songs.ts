export interface Line {
  text: string;
  indent: boolean;
}

export interface Stanza {
  chorus: boolean;
  lines: Line[];
}

export type Layout = "normal" | "columns" | "longlines";

export interface Song {
  /** URL-safe identifier, from the file name (e.g. "silent-night"). */
  id: string;
  title: string;
  about?: string;
  layout: Layout;
  stanzas: Stanza[];
}

/**
 * Parse a song file. Format:
 *
 *     ---
 *     title: Silent Night
 *     about: https://...
 *     layout: columns | longlines   (optional)
 *     ---
 *
 *     First stanza line
 *     Second line
 *       an indented (refrain) line
 *
 *     Chorus:
 *     A chorus stanza starts with a "Chorus:" line
 *
 * Stanzas are separated by blank lines; *text* is rendered as emphasis.
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
      lines: rawLines.map((l) => ({ text: l.trim(), indent: /^\s/.test(l) })),
    });
  }

  return { id, title: meta.title, about: meta.about || undefined, layout, stanzas };
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
