import { h, renderStanza } from "./dom";
import { qrSvg } from "./qr";
// Inlined so it is there even when the book is built right as printing starts.
import bellSvg from "../../assets/bell-rounded.svg?raw";
import type { Song } from "./songs";

/**
 * Printable songbook. Browsers can't paginate well enough for a contents page
 * with page numbers or a folded booklet, so we lay out pages ourselves: measure
 * each song at its printed size, pack songs into columns stanza by stanza, then
 * place those pages on sheets of paper (one per sheet, or two per side for a
 * booklet).
 */

export interface PrintSettings {
  songs: "favorites" | "all";
  format: "pages" | "booklet";
  paper: "letter" | "a4";
}

const PAPER = {
  letter: { w: 8.5, h: 11, label: "Letter" },
  a4: { w: 8.27, h: 11.69, label: "A4" },
} as const;

const PX_PER_IN = 96;
const PX_PER_PT = 96 / 72;
/** Space between stanzas, and extra space before a song title, in points. */
const GAP_PT = 7;
const SONG_GAP_PT = 10;

interface Geometry {
  pageW: number;
  pageH: number;
  margin: number;
  columns: number;
  gutter: number;
  /** Physical sheet size; for a booklet, two pages sit side by side on it. */
  sheetW: number;
  sheetH: number;
}

function geometry(settings: PrintSettings): Geometry {
  const paper = PAPER[settings.paper];
  if (settings.format === "booklet") {
    return {
      pageW: paper.h / 2,
      pageH: paper.w,
      margin: 0.45,
      columns: 1,
      gutter: 0,
      sheetW: paper.h,
      sheetH: paper.w,
    };
  }
  return { pageW: paper.w, pageH: paper.h, margin: 0.6, columns: 2, gutter: 0.35, sheetW: paper.w, sheetH: paper.h };
}

const SETTINGS_KEY = "printSettings";

export function loadSettings(): PrintSettings {
  const usesLetter = /^(en-(US|CA)|es-(US|MX)|fil)\b/i.test(navigator.language);
  const defaults: PrintSettings = { songs: "favorites", format: "pages", paper: usesLetter ? "letter" : "a4" };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      songs: saved.songs === "all" ? "all" : defaults.songs,
      format: saved.format === "booklet" ? "booklet" : defaults.format,
      paper: saved.paper === "letter" || saved.paper === "a4" ? saved.paper : defaults.paper,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings: PrintSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// --- measuring ------------------------------------------------------------

function measurer(className: string, widthIn: number) {
  const box = h("div", { class: `print-book print-measure ${className}`, "aria-hidden": "true" });
  box.style.width = `${widthIn}in`;
  document.body.append(box);
  return {
    height(el: HTMLElement): number {
      box.replaceChildren(el);
      const height = el.getBoundingClientRect().height;
      el.remove();
      return height;
    },
    done: () => box.remove(),
  };
}

// --- layout ---------------------------------------------------------------

interface Block {
  el: HTMLElement;
  height: number;
  /** Extra space above this block when it isn't first in its column. */
  before: number;
}

type Frame = Block[];

function songTitle(number: number, title: string, continued = false): HTMLElement {
  return h(
    "h3",
    { class: continued ? "p-title continued" : "p-title" },
    h("span", { class: "p-number" }, `${number}.`),
    " ",
    title,
    continued && h("span", { class: "p-continued" }, " (continued)"),
  );
}

/** Pack songs into columns. Returns the columns and the column each song starts in. */
function packSongs(songs: Song[], geo: Geometry, className: string) {
  const frameW = (geo.pageW - 2 * geo.margin - geo.gutter * (geo.columns - 1)) / geo.columns;
  // A little slack so rounding never pushes a column past the page.
  const frameH = (geo.pageH - 2 * geo.margin) * PX_PER_IN - 4;
  const gap = GAP_PT * PX_PER_PT;
  const songGap = SONG_GAP_PT * PX_PER_PT;
  const m = measurer(className, frameW);

  const frames: Frame[] = [];
  let frame: Frame = [];
  let used = 0;
  const cost = (b: Pick<Block, "height" | "before">) => (frame.length ? gap + b.before : 0) + b.height;
  const fits = (height: number) => used + height <= frameH;
  const next = () => {
    frames.push(frame);
    frame = [];
    used = 0;
  };
  const place = (b: Block) => {
    used += cost(b);
    frame.push(b);
  };

  const startFrames: number[] = [];
  songs.forEach((song, i) => {
    const number = i + 1;
    const title: Block = { el: songTitle(number, song.title), height: 0, before: songGap };
    title.height = m.height(title.el);
    const stanzas: Block[] = song.stanzas.map((st, j) => {
      const el = renderStanza(st, j);
      return { el, height: m.height(el), before: 0 };
    });
    const whole = title.height + stanzas.reduce((sum, b) => sum + gap + b.height, 0);
    const opening = title.height + stanzas.slice(0, 2).reduce((sum, b) => sum + gap + b.height, 0);

    if (frame.length) {
      // Start the song here if it fits whole. Otherwise split it across columns
      // when a good part of this column is still free and at least its first
      // two stanzas fit; if not, move on to the next column.
      const free = frameH - used - gap - songGap;
      if (whole > free && (free < frameH * 0.35 || opening > free)) next();
    }
    startFrames.push(frames.length);
    place(title);
    for (const stanza of stanzas) {
      if (frame.length && !fits(cost(stanza))) {
        next();
        const cont: Block = { el: songTitle(number, song.title, true), height: 0, before: 0 };
        cont.height = m.height(cont.el);
        place(cont);
      }
      place(stanza);
    }
  });
  if (frame.length) next();
  m.done();
  return { frames, startFrames };
}

interface TocEntry {
  number: number;
  title: string;
  page: number;
}

function tocHeader(): HTMLElement {
  return h(
    "header",
    { class: "p-toc-header" },
    h("div", {}, h("h1", {}, "Christmas Carols"), h("p", {}, "xmascarols.app")),
    h("div", { class: "p-qr" }, qrSvg("HTTPS://XMASCAROLS.APP")),
  );
}

function tocLine(entry: TocEntry): HTMLElement {
  return h(
    "div",
    { class: "p-toc-line" },
    h("span", { class: "p-number" }, `${entry.number}.`),
    h("span", { class: "p-toc-title" }, entry.title),
    h("span", { class: "p-leader" }),
    h("span", { class: "p-toc-page" }, String(entry.page)),
  );
}

/** How many contents pages the entries need, and how many fit on each. */
function tocCapacity(geo: Geometry, className: string, count: number): number[] {
  const m = measurer(className, geo.pageW - 2 * geo.margin);
  const header = m.height(tocHeader());
  const line = m.height(tocLine({ number: 88, title: "Measure", page: 88 }));
  m.done();
  const usable = (geo.pageH - 2 * geo.margin) * PX_PER_IN - 4;
  const first = Math.max(1, Math.floor((usable - header) / line));
  const rest = Math.max(1, Math.floor(usable / line));
  const perPage = [first];
  let left = count - first;
  while (left > 0) {
    perPage.push(rest);
    left -= rest;
  }
  return perPage;
}

function pageEl(geo: Geometry, number: number | null, ...content: HTMLElement[]): HTMLElement {
  const page = h(
    "div",
    { class: "p-page" },
    ...content,
    number !== null && h("div", { class: "p-folio" }, String(number)),
  );
  page.style.width = `${geo.pageW}in`;
  page.style.height = `${geo.pageH}in`;
  page.style.padding = `${geo.margin}in`;
  return page;
}

function backCover(geo: Geometry): HTMLElement {
  const icon = h("div", { class: "p-back-icon", "aria-hidden": "true" });
  icon.innerHTML = bellSvg; // our own static asset
  return pageEl(
    geo,
    null,
    h(
      "div",
      { class: "p-back-cover" },
      icon,
      h("h2", {}, "Christmas Carols"),
      h("p", {}, "Sing along on your phone, on your own or together."),
      h("div", { class: "p-qr" }, qrSvg("HTTPS://XMASCAROLS.APP")),
      h("p", { class: "p-back-url" }, "xmascarols.app"),
    ),
  );
}

export interface Book {
  el: HTMLElement;
  pageCount: number;
  sheetCount: number;
  /** CSS for @page, so the printer uses the right paper and orientation. */
  pageCss: string;
}

export function buildBook(songs: Song[], settings: PrintSettings): Book {
  const geo = geometry(settings);
  const className = `format-${settings.format}`;
  const { frames, startFrames } = packSongs(songs, geo, className);
  const songPages: HTMLElement[][] = [];
  for (let i = 0; i < frames.length; i += geo.columns) {
    songPages.push(
      frames.slice(i, i + geo.columns).map((f) =>
        h(
          "div",
          { class: "p-frame" },
          f.map((b, j) => {
            b.el.style.marginTop = j && b.before ? `${b.before}px` : "";
            return b.el;
          }),
        ),
      ),
    );
  }

  const perTocPage = tocCapacity(geo, className, songs.length);
  const tocPages = perTocPage.length;
  const entries: TocEntry[] = songs.map((song, i) => ({
    number: i + 1,
    title: song.title,
    page: tocPages + Math.floor(startFrames[i] / geo.columns) + 1,
  }));

  const pages: HTMLElement[] = [];
  let offset = 0;
  perTocPage.forEach((n, i) => {
    const lines = entries.slice(offset, offset + n).map(tocLine);
    offset += n;
    pages.push(pageEl(geo, pages.length + 1, ...(i === 0 ? [tocHeader()] : []), h("div", { class: "p-toc" }, lines)));
  });
  for (const columns of songPages) {
    const grid = h("div", { class: "p-columns" }, columns);
    grid.style.gridTemplateColumns = `repeat(${geo.columns}, 1fr)`;
    grid.style.columnGap = `${geo.gutter}in`;
    pages.push(pageEl(geo, pages.length + 1, grid));
  }
  const pageCount = pages.length;

  const sheets: HTMLElement[] = [];
  const sheet = (label: string, ...content: HTMLElement[]) => {
    const el = h("div", { class: "p-sheet", "data-label": label }, ...content);
    el.style.width = `${geo.sheetW}in`;
    el.style.height = `${geo.sheetH}in`;
    sheets.push(el);
  };

  if (settings.format === "booklet") {
    // The outside back is always a cover, so the book never ends mid-song.
    // Blank pages go before it to make a multiple of 4. Then impose: the
    // outermost sheet carries the last and first pages, and so on inward.
    while ((pages.length + 1) % 4) pages.push(pageEl(geo, null));
    pages.push(backCover(geo));
    const n = pages.length;
    for (let i = 0; i < n / 4; i++) {
      sheet(`Sheet ${i + 1}, front`, pages[n - 1 - 2 * i], pages[2 * i]);
      sheet(`Sheet ${i + 1}, back`, pages[2 * i + 1], pages[n - 2 - 2 * i]);
    }
  } else {
    pages.forEach((p, i) => sheet(`Page ${i + 1}`, p));
  }

  return {
    el: h("div", { class: `print-book ${className}` }, sheets),
    pageCount,
    sheetCount: settings.format === "booklet" ? sheets.length / 2 : sheets.length,
    pageCss: `@page { size: ${geo.sheetW}in ${geo.sheetH}in; margin: 0; }`,
  };
}

export const paperLabel = (paper: PrintSettings["paper"]) => PAPER[paper].label;
