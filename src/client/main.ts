import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { Favorites } from "./favorites";
import { loadSongs, type Song, type Stanza } from "./songs";

const songs = loadSongs(
  import.meta.glob<string>("../../songs/*.md", { query: "?raw", import: "default", eager: true }),
);
const songsById = new Map(songs.map((s) => [s.id, s]));
const favorites = new Favorites(songs);

// --- tiny DOM helper ------------------------------------------------------

type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(
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

/** Render text with *emphasis* markers. */
function inline(text: string): (Node | string)[] {
  return text.split(/(\*[^*]+\*)/).map((part) =>
    part.startsWith("*") && part.endsWith("*") && part.length > 2
      ? h("em", {}, part.slice(1, -1))
      : part,
  );
}

// --- rendering ------------------------------------------------------------

const songPath = (song: Song) => `/song/${song.id}`;
const star = (on: boolean) => (on ? "★" : "☆");

function renderStanza(stanza: Stanza, index: number): HTMLElement {
  return h(
    "div",
    { class: stanza.chorus ? "stanza chorus" : "stanza", "data-stanza": String(index) },
    stanza.chorus && h("div", { class: "stanza-label" }, "Chorus"),
    stanza.lines.map((line) => h("div", { class: line.indent ? "line indent" : "line" }, inline(line.text))),
  );
}

function favoriteButton(song: Song): HTMLButtonElement {
  const on = favorites.has(song.id);
  return h(
    "button",
    {
      class: "favorite",
      type: "button",
      "data-favorite": song.id,
      "aria-pressed": String(on),
      "aria-label": "Favorite",
      title: "Favorite",
    },
    star(on),
  );
}

function renderSong(song: Song): HTMLElement {
  return h(
    "article",
    { class: `song layout-${song.layout}`, id: `song-${song.id}`, "data-song": song.id },
    h(
      "header",
      { class: "song-header" },
      h("a", { class: "back", href: "/", "aria-label": "Back to song list" }, "‹ Songs"),
      h("h2", { class: "song-title" }, song.title),
      favoriteButton(song),
    ),
    h("div", { class: "lyrics" }, song.stanzas.map(renderStanza)),
    song.about &&
      h(
        "footer",
        { class: "about" },
        h("a", { href: song.about, target: "_blank", rel: "noopener" }, "About this song"),
      ),
  );
}

function songLink(song: Song): HTMLElement {
  return h("li", {}, h("a", { href: songPath(song), "data-song-link": song.id }, song.title));
}

const app = document.getElementById("app")!;
const favoriteList = h("ul", { class: "song-list" });
const favoriteSection = h(
  "section",
  { class: "favorites" },
  h("h2", {}, "Favorites"),
  favoriteList,
);
const index = h(
  "nav",
  { class: "index", "aria-label": "Songs" },
  h("h1", { class: "app-title" }, "Christmas Carols"),
  favoriteSection,
  h("section", { class: "all-songs" }, h("h2", {}, "All songs"), h("ul", { class: "song-list" }, songs.map(songLink))),
);
const songEls = new Map(songs.map((s) => [s.id, renderSong(s)]));
app.append(index, h("main", { class: "songs" }, [...songEls.values()]));

function refreshFavorites() {
  const favs = songs.filter((s) => favorites.has(s.id));
  favoriteList.replaceChildren(...favs.map(songLink));
  favoriteSection.hidden = favs.length === 0;
  for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-favorite]")) {
    const on = favorites.has(btn.dataset.favorite!);
    btn.textContent = star(on);
    btn.setAttribute("aria-pressed", String(on));
  }
}
refreshFavorites();

// --- routing --------------------------------------------------------------

interface NavState {
  /** True when this entry was reached by navigating from the index. */
  fromIndex?: boolean;
  /** Index scroll position, saved on the index entry before leaving it. */
  scrollY?: number;
}

let current: Song | null = null;

function route() {
  const m = /^\/song\/([^/]+)\/?$/.exec(location.pathname);
  const song = m ? songsById.get(decodeURIComponent(m[1])) : undefined;
  if (m && !song) {
    history.replaceState(null, "", "/");
  }
  show(song ?? null);
}

function show(song: Song | null) {
  if (current) songEls.get(current.id)!.classList.remove("current");
  current = song;
  document.body.dataset.view = song ? "song" : "index";
  if (song) {
    songEls.get(song.id)!.classList.add("current");
    document.title = `${song.title} – Christmas Carols`;
    window.scrollTo(0, 0);
  } else {
    document.title = "Christmas Carols";
    window.scrollTo(0, (history.state as NavState | null)?.scrollY ?? 0);
  }
}

function navigate(path: string) {
  if (path === location.pathname) return;
  if (path === "/" && (history.state as NavState | null)?.fromIndex) {
    // Going "back" to the list: use real history so the browser's back stack stays tidy.
    history.back();
    return;
  }
  if (!current) {
    history.replaceState({ ...history.state, scrollY: window.scrollY } satisfies NavState, "");
  }
  history.pushState({ fromIndex: !current } satisfies NavState, "", path);
  route();
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target as Element;

  const fav = target.closest<HTMLElement>("[data-favorite]");
  if (fav) {
    favorites.toggle(fav.dataset.favorite!);
    refreshFavorites();
    return;
  }

  const link = target.closest("a");
  if (link && link.origin === location.origin && !link.target) {
    event.preventDefault();
    navigate(link.pathname);
  }
});

window.addEventListener("popstate", route);

// Legacy URLs looked like /#Silent%20Night
if (location.hash.length > 1) {
  const title = decodeURIComponent(location.hash.slice(1));
  const song = songs.find((s) => s.title === title);
  history.replaceState(null, "", song ? songPath(song) : "/");
}

route();

registerSW({ immediate: true });
