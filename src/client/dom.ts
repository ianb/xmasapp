import type { Stanza } from "./songs";

// --- tiny DOM helper ------------------------------------------------------

export type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | undefined> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c) el.append(c);
  }
  return el;
}

/** Render a lyric line: *cues* and (x3) repeat markers get cue styling. */
export function inline(text: string): (Node | string)[] {
  return text.split(/(\*[^*]+\*|\(x\d+\))/).map((part) => {
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return h("em", {}, part.slice(1, -1));
    }
    const repeat = /^\(x(\d+)\)$/.exec(part);
    return repeat ? h("em", { class: "repeat", title: `Repeat ${repeat[1]} times` }, `\u00d7${repeat[1]}`) : part;
  });
}

export function renderStanza(stanza: Stanza, index: number): HTMLElement {
  return h(
    "div",
    { class: stanza.chorus ? "stanza chorus" : "stanza", "data-stanza": String(index) },
    stanza.chorus && h("div", { class: "stanza-label" }, "Chorus"),
    stanza.lines.map((line) => h("div", { class: line.indent ? "line indent" : "line" }, inline(line.text))),
  );
}
