import "./style.css";
import { registerSW } from "virtual:pwa-register";
import { Favorites } from "./favorites";
import { buildBook, loadSettings, paperLabel, saveSettings, type PrintSettings } from "./print";
import { qrSvg } from "./qr";
import { SessionConnection } from "./session";
import { h, renderStanza } from "./dom";
import { loadSongs, type Art, type Song } from "./songs";
import artJson from "../../art/art.json";
import { newCode, parseCode, type NowSinging } from "../shared/protocol";

const songs = loadSongs(
  import.meta.glob<string>("../../songs/*.md", { query: "?raw", import: "default", eager: true }),
);
const songsById = new Map(songs.map((s) => [s.id, s]));
const favorites = new Favorites();

// --- rendering ------------------------------------------------------------

const songPath = (song: Song) => `/song/${song.id}`;
const star = (on: boolean) => (on ? "★" : "☆");

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
    h("p", { class: "session-hint" }, "Tap a verse to show everyone where you are."),
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

// --- about page ---------------------------------------------------------

const arts: Record<string, Art> = artJson;

function renderAbout(): HTMLElement {
  const link = (href: string, text: string) => h("a", { href, target: "_blank", rel: "noopener" }, text);
  return h(
    "article",
    { class: "about-page" },
    h(
      "header",
      { class: "song-header" },
      h("a", { class: "back", href: "/", "aria-label": "Back to song list" }, "\u2039 Songs"),
      h("h2", { class: "song-title" }, "About"),
      h("span", { class: "header-spacer" }),
    ),
    h(
      "div",
      { class: "prose" },
      h(
        "p",
        {},
        "Words to Christmas carols and holiday songs, for singing along from your phone. ",
        "Made by ",
        link("https://ianbicking.org", "Ian Bicking"),
        ". I just hope it helps everyone sing together.",
      ),
      h("h3", {}, "Singing together"),
      h(
        "p",
        {},
        "Tap ",
        h("strong", {}, "Sing together"),
        " on the song list to start a session. Others join by scanning its QR code, opening the link you share, ",
        "or tapping Sing together and entering its code. While you\u2019re in a session, the code shows at the top of ",
        "the song list; tap it to invite more people.",
      ),
      h(
        "ul",
        {},
        h("li", {}, "Tap a verse to mark it as being sung now. It lights up for everyone and scrolls near the top."),
        h(
          "li",
          {},
          "Everyone follows along automatically. If you scroll or look at another song, you stop following; tap ",
          h("strong", {}, "Jump to"),
          " at the bottom to catch up.",
        ),
        h("li", {}, "Anyone in the session can set the verse."),
      ),
      h("p", {}, "Outside a session, tapping a verse just highlights it for you."),
      h("h3", {}, "Put it on your home screen"),
      h(
        "ul",
        {},
        h("li", {}, "iPhone or iPad: in Safari, tap Share, then ", h("strong", {}, "Add to Home Screen"), "."),
        h("li", {}, "Android: in Chrome, open the \u22ee menu and tap ", h("strong", {}, "Install app"), "."),
        h("li", {}, "Computer: in Chrome or Edge, click the install icon in the address bar."),
      ),
      h("p", {}, "Once it has loaded, the songs work offline. Sessions need a connection."),
      h("h3", {}, "Privacy"),
      h(
        "p",
        {},
        "This site collects nothing: no accounts, no cookies, no analytics, no tracking. ",
        "Your favorites are saved only on your own device. A singing session only knows ",
        "which song and verse is up, and is forgotten after a week of no use.",
      ),
      h("h3", {}, "Feedback"),
      h(
        "p",
        {},
        "Feedback is welcome, including wrong lyrics, missing songs and ideas, as ",
        link("https://github.com/ianb/xmasapp/issues", "GitHub issues"),
        ". The ",
        link("https://github.com/ianb/xmasapp", "source code"),
        " is there too.",
      ),
      h("h3", {}, "Credits"),
      h(
        "p",
        {},
        "The traditional carols are in the public domain. Words to the newer songs belong to their writers ",
        "and are included here for singing along. The \u201cAbout this song\u201d links go to Wikipedia.",
      ),
      h("p", {}, "Pictures shown when a song is shared are public domain artworks:"),
      h(
        "ul",
        { class: "art-credits" },
        songs
          .filter((song) => arts[song.id])
          .map((song) => {
            const art = arts[song.id];
            return h(
              "li",
              {},
              `${song.title}: ${art.artist}, `,
              link(art.url, art.title),
              `, ${art.date}, ${art.museum}`,
            );
          }),
      ),
    ),
  );
}

// --- page structure -------------------------------------------------------

const app = document.getElementById("app")!;
// Replace the pre-rendered page (for link previews and search) with the app.
app.replaceChildren();
app.classList.remove("prerendered");
// "Sing together" outside a session; the session's code inside one.
const startButton = h("button", { type: "button", class: "start-session", "data-action": "sing-together" }, "Sing together");
const favoriteList = h("ul", { class: "song-list" });
const favoriteSection = h("section", { class: "favorites" }, h("h2", {}, "Favorites"), favoriteList);
const index = h(
  "nav",
  { class: "index", "aria-label": "Songs" },
  h(
    "header",
    { class: "index-header" },
    h("h1", { class: "app-title" }, "Christmas Carols"),
    startButton,
  ),
  favoriteSection,
  h("section", { class: "all-songs" }, h("h2", {}, "All songs"), h("ul", { class: "song-list" }, songs.map(songLink))),
  h(
    "footer",
    { class: "index-footer" },
    h("a", { href: "/print" }, "Print a songbook"),
    " \u00b7 ",
    h("a", { href: "/about" }, "About this app"),
  ),
);
const aboutPage = renderAbout();
const songEls = new Map(songs.map((s) => [s.id, renderSong(s)]));

const sessionStatus = h("span", { class: "session-status" });
const sessionCode = h("span", { class: "session-code" });
const sessionCount = h("span", { class: "session-count" });
const nowButton = h("button", { type: "button", class: "now", "data-action": "follow" });
const shareButton = h("button", { type: "button", "data-action": "invite" }, "Invite");
const sessionBar = h(
  "aside",
  { class: "session-bar", "aria-label": "Singing session", hidden: true },
  h("div", { class: "session-info" }, sessionStatus, sessionCode, sessionCount),
  nowButton,
  h(
    "div",
    { class: "session-actions" },
    shareButton,
    h("button", { type: "button", "data-action": "leave" }, "Leave"),
  ),
);

const inviteQr = h("div", { class: "invite-qr" });
const inviteCode = h("div", { class: "invite-code" });
const inviteUrl = h("div", { class: "invite-url" });
const copyButton = h("button", { type: "button", "data-action": "copy-link" }, "Copy link");
const inviteDialog = h(
  "dialog",
  { class: "invite", "aria-label": "Invite people" },
  h("h2", {}, "Sing together"),
  h("p", { class: "invite-help" }, "Have people scan this with their phone camera, or send them the link."),
  inviteQr,
  inviteCode,
  inviteUrl,
  h(
    "div",
    { class: "invite-actions" },
    "share" in navigator && h("button", { type: "button", "data-action": "share-link" }, "Share link\u2026"),
    copyButton,
    h("button", { type: "button", class: "primary", "data-action": "close-invite", autofocus: true }, "Done"),
  ),
);
const joinInput = h("input", {
  name: "code",
  class: "join-code",
  placeholder: "Code",
  "aria-label": "Session code",
  autocomplete: "off",
  autocapitalize: "characters",
  spellcheck: "false",
  enterkeyhint: "go",
}) as HTMLInputElement;
const joinError = h("p", { class: "join-error", role: "alert", hidden: true }, "That doesn\u2019t look like a session code.");
const joinForm = h(
  "form",
  { class: "join-form" },
  joinInput,
  h("button", { type: "submit" }, "Join"),
) as HTMLFormElement;
const singDialog = h(
  "dialog",
  { class: "invite sing", "aria-label": "Sing together" },
  h("h2", {}, "Sing together"),
  h(
    "p",
    { class: "invite-help" },
    "Everyone sees the same song, and the verse being sung lights up on every phone.",
  ),
  h("button", { type: "button", class: "primary start", "data-action": "start-session" }, "Start a session"),
  h("p", { class: "join-or" }, "or join one with its code"),
  joinForm,
  joinError,
  h(
    "div",
    { class: "invite-actions" },
    h("button", { type: "button", "data-action": "close-sing" }, "Cancel"),
  ),
);
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = parseCode(joinInput.value);
  joinError.hidden = code !== null;
  if (!code) return;
  singDialog.close();
  navigate(`/s/${code}`);
});
joinInput.addEventListener("input", () => (joinError.hidden = true));

// Tapping the backdrop closes a dialog.
for (const dialog of [inviteDialog, singDialog]) {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

app.append(
  index,
  h("main", { class: "songs" }, [...songEls.values()]),
  aboutPage,
  sessionBar,
  inviteDialog,
  singDialog,
);

// --- printing -------------------------------------------------------------
//
// The print view lives outside #app because its preview pages are wider than
// the app column. Printing from anywhere prints the songbook it describes.

let printSettings = loadSettings();
// /print?format=booklet&paper=a4&songs=all overrides the saved settings (not saved).
{
  const params = new URLSearchParams(location.search);
  const pick = <T extends string>(key: string, values: readonly T[]) => {
    const v = params.get(key) as T | null;
    return v && values.includes(v) ? v : undefined;
  };
  printSettings = {
    songs: pick("songs", ["favorites", "all"] as const) ?? printSettings.songs,
    format: pick("format", ["pages", "booklet"] as const) ?? printSettings.format,
    paper: pick("paper", ["letter", "a4"] as const) ?? printSettings.paper,
  };
}
const pageStyle = h("style", {});
document.head.append(pageStyle);
const printSummary = h("p", { class: "print-summary" });
const bookletHelp = h(
  "p",
  { class: "print-help" },
  "Print double-sided and choose ",
  h("strong", {}, "flip on short edge"),
  ". Stack the sheets in order, fold them in half, and staple along the fold.",
);
const favoritesNote = h("span", { class: "print-note" });
const printHolder = h("div", { class: "print-preview" });

function choice<K extends keyof PrintSettings>(key: K, value: PrintSettings[K], label: Node | string) {
  return h(
    "label",
    {},
    h("input", { type: "radio", name: `print-${key}`, value, "data-print-setting": key }),
    " ",
    label,
  );
}

const favoritesLabel = h("span", {});
const printView = h(
  "div",
  { class: "print-view" },
  h(
    "div",
    { class: "print-controls" },
    h(
      "header",
      { class: "song-header" },
      h("a", { class: "back", href: "/", "aria-label": "Back to song list" }, "\u2039 Songs"),
      h("h2", { class: "song-title" }, "Print a songbook"),
      h("span", { class: "header-spacer" }),
    ),
    h(
      "fieldset",
      {},
      h("legend", {}, "Songs"),
      choice("songs", "favorites", favoritesLabel),
      choice("songs", "all", `All songs (${songs.length})`),
      favoritesNote,
    ),
    h(
      "fieldset",
      {},
      h("legend", {}, "Format"),
      choice("format", "pages", "Pages"),
      choice("format", "booklet", "Folded booklet"),
    ),
    h(
      "fieldset",
      {},
      h("legend", {}, "Paper"),
      choice("paper", "letter", "Letter"),
      choice("paper", "a4", "A4"),
    ),
    printSummary,
    bookletHelp,
    h("p", { class: "print-help" }, "If your browser asks, set margins to none and scale to 100%."),
    h("button", { type: "button", class: "print-button", "data-action": "print" }, "Print"),
  ),
  printHolder,
);
document.body.append(printView);

function renderPrint() {
  const favs = songs.filter((s) => favorites.has(s.id));
  const useFavorites = printSettings.songs === "favorites" && favs.length > 0;
  const list = useFavorites ? favs : songs;
  const book = buildBook(list, printSettings);
  printHolder.replaceChildren(book.el);
  pageStyle.textContent = book.pageCss;

  favoritesLabel.textContent = `Favorites (${favs.length})`;
  favoritesNote.textContent = favs.length ? "" : "Star songs to choose them; until then, all songs print.";
  for (const input of printView.querySelectorAll<HTMLInputElement>("[data-print-setting]")) {
    input.checked = printSettings[input.dataset.printSetting as keyof PrintSettings] === input.value;
    if (input.value === "favorites") input.disabled = favs.length === 0;
  }
  const paper = paperLabel(printSettings.paper);
  const n = list.length;
  printSummary.textContent =
    printSettings.format === "booklet"
      ? `${n} songs, ${book.pageCount} pages: ${book.sheetCount} sheets of ${paper} paper, printed on both sides.`
      : `${n} songs on ${book.pageCount} pages of ${paper} paper.`;
  bookletHelp.hidden = printSettings.format !== "booklet";
  fitPreview();
}

/** Shrink the on-screen preview to fit narrow windows. */
function fitPreview() {
  const sheet = printHolder.querySelector<HTMLElement>(".p-sheet");
  if (!sheet) return;
  const available = Math.min(window.innerWidth, document.documentElement.clientWidth) - 32;
  printHolder.style.zoom = String(Math.min(1, available / sheet.offsetWidth));
}

printView.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  const key = input.dataset.printSetting as keyof PrintSettings | undefined;
  if (!key) return;
  printSettings = { ...printSettings, [key]: input.value };
  saveSettings(printSettings);
  renderPrint();
});
window.addEventListener("resize", () => {
  if (document.body.dataset.view === "print") fitPreview();
});
// Printing from any page prints the songbook, built fresh with current favorites.
window.addEventListener("beforeprint", renderPrint);

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

// --- "now singing" --------------------------------------------------------
//
// Outside a session, tapping a verse just highlights it locally. In a session
// it's shared: everyone sees the active verse, and anyone "following" is taken
// to that song and scrolled to the verse.

let session: SessionConnection | null = null;
let localNow: NowSinging | null = null;
/** Whether this client automatically goes wherever the group is singing. */
let following = true;

const getNow = () => (session ? session.now : localNow);

function setNow(now: NowSinging | null) {
  if (session) {
    session.set(now);
  } else {
    localNow = now;
  }
  following = true;
  applyNow(true);
}

/** Reflect the current "now singing" in the page; optionally scroll to it. */
function applyNow(scroll: boolean) {
  const now = getNow();
  for (const el of document.querySelectorAll(".stanza.active")) el.classList.remove("active");
  for (const el of document.querySelectorAll(".song.now-singing")) el.classList.remove("now-singing");
  if (now) {
    const songEl = songEls.get(now.songId);
    songEl?.classList.add("now-singing");
    if (now.stanza !== null) {
      songEl?.querySelector(`[data-stanza="${now.stanza}"]`)?.classList.add("active");
    }
  }

  if (session && following && now && current?.id !== now.songId && songsById.has(now.songId)) {
    navigate(`${base()}/song/${now.songId}`, { keepFollowing: true });
  }
  if (scroll && following && now && current?.id === now.songId) {
    scrollToStanza(now.stanza);
  }
  renderSessionBar();
}

function scrollToStanza(index: number | null) {
  if (!current) return;
  const songEl = songEls.get(current.id)!;
  if (index === null) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const stanza = songEl.querySelector<HTMLElement>(`[data-stanza="${index}"]`);
  if (!stanza) return;
  const header = songEl.querySelector<HTMLElement>(".song-header")!;
  const top = stanza.getBoundingClientRect().top + window.scrollY - header.offsetHeight - 12;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

// A deliberate scroll by the user means they want to look around, so stop following.
function stopFollowingOnScroll() {
  if (session && following && getNow()) {
    following = false;
    renderSessionBar();
  }
}
window.addEventListener("wheel", stopFollowingOnScroll, { passive: true });
window.addEventListener("touchmove", stopFollowingOnScroll, { passive: true });
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) stopFollowingOnScroll();
});

// --- session --------------------------------------------------------------

function base() {
  return session ? `/s/${session.code}` : "";
}

function joinSession(code: string) {
  if (session?.code === code) return;
  session?.close();
  following = true;
  session = new SessionConnection(code, {
    state: (_now, mine) => applyNow(!mine),
    presence: () => renderSessionBar(),
    status: () => renderSessionBar(),
  });
  document.body.classList.add("in-session");
  renderSessionBar();
}

function leaveSession() {
  inviteDialog.close();
  session?.close();
  session = null;
  document.body.classList.remove("in-session");
  sessionBar.hidden = true;
  startButton.dataset.action = "sing-together";
  startButton.removeAttribute("aria-label");
  startButton.replaceChildren("Sing together");
  applyNow(false);
}

function renderSessionBar() {
  if (!session) return;
  sessionBar.hidden = false;
  sessionStatus.className = `session-status ${session.status}`;
  sessionStatus.title = session.status === "open" ? "Connected" : "Reconnecting…";
  sessionCode.textContent = session.code.toUpperCase();
  startButton.dataset.action = "invite";
  startButton.setAttribute("aria-label", `Singing session ${session.code.toUpperCase()}: invite people`);
  startButton.replaceChildren(
    h("span", { class: `session-status ${session.status}` }),
    h("span", { class: "session-code" }, session.code.toUpperCase()),
  );
  const n = session.count;
  sessionCount.textContent = n ? `${n} ${n === 1 ? "person" : "people"}` : "";

  const now = session.now;
  const song = now && songsById.get(now.songId);
  if (!song) {
    nowButton.hidden = true;
    return;
  }
  nowButton.hidden = false;
  const verse = now.stanza === null ? "" : ` · ${verseLabel(song, now.stanza)}`;
  const synced = following && current?.id === song.id;
  nowButton.classList.toggle("synced", synced);
  nowButton.replaceChildren(
    h("span", { class: "now-label" }, synced ? "Following" : "Jump to"),
    h("span", { class: "now-what" }, song.title + verse),
  );
}

/** "verse 2" or "chorus", counting only non-chorus stanzas as verses. */
function verseLabel(song: Song, index: number): string {
  const stanza = song.stanzas[index];
  if (!stanza) return "";
  if (stanza.chorus) return "chorus";
  const verse = song.stanzas.slice(0, index + 1).filter((s) => !s.chorus).length;
  return `verse ${verse}`;
}

const sessionUrl = (code: string) => `${location.origin}/s/${code}`;

function showInvite() {
  if (!session) return;
  const url = sessionUrl(session.code);
  // Upper case lets the QR code use its compact alphanumeric mode; the server
  // and router treat codes case-insensitively.
  inviteQr.replaceChildren(qrSvg(url.toUpperCase()));
  inviteCode.textContent = session.code.toUpperCase();
  inviteUrl.textContent = url.replace(/^https?:\/\//, "");
  copyButton.textContent = "Copy link";
  inviteDialog.showModal();
}

async function shareLink() {
  if (!session) return;
  try {
    await navigator.share({ title: "Sing Christmas carols with me", url: sessionUrl(session.code) });
  } catch {
    // cancelled
  }
}

async function copyLink() {
  if (!session) return;
  try {
    await navigator.clipboard.writeText(sessionUrl(session.code));
    copyButton.textContent = "Copied!";
  } catch {
    copyButton.textContent = "Couldn't copy";
  }
  setTimeout(() => (copyButton.textContent = "Copy link"), 2500);
}

// --- routing --------------------------------------------------------------
//
//   /                      song list
//   /song/<id>             a song
//   /s/<code>[/song/<id>]  the same, inside a shared session

interface NavState {
  /** True when this entry was reached by navigating from the index. */
  fromIndex?: boolean;
  /** Index scroll position, saved on the index entry before leaving it. */
  scrollY?: number;
}

let current: Song | null = null;

function route() {
  // QR codes use an upper-case URL (it encodes more compactly); tidy it up.
  if (location.pathname !== location.pathname.toLowerCase()) {
    history.replaceState(history.state, "", location.pathname.toLowerCase() + location.search);
  }
  const m = /^(?:\/s\/([a-z0-9]{4,16}))?(?:\/song\/([^/]+)|\/(about|print))?\/?$/.exec(location.pathname);
  const code = m?.[1];
  const song = m?.[2] ? songsById.get(m[2]) : undefined;
  const page = (m?.[3] as Page | undefined) ?? null;
  if (!m || (m[2] && !song)) {
    history.replaceState(null, "", code ? `/s/${code}` : "/");
  }
  if (code) {
    joinSession(code);
  } else if (session) {
    leaveSession();
  }
  show(song ?? null, page);
  // Navigating away from what the group is singing means you're browsing on your own.
  const now = getNow();
  if (session && following && now && current?.id !== now.songId && !navigatingToNow) {
    following = false;
  }
  applyNow(true);
}

type Page = "about" | "print";

function show(song: Song | null, page: Page | null = null) {
  if (current) songEls.get(current.id)!.classList.remove("current");
  current = song;
  document.body.dataset.view = song ? "song" : (page ?? "index");
  if (page) {
    document.title = `${page === "about" ? "About" : "Print a songbook"} \u2013 Christmas Carols`;
    if (page === "print") renderPrint();
    window.scrollTo(0, 0);
  } else if (song) {
    songEls.get(song.id)!.classList.add("current");
    document.title = `${song.title} lyrics – Christmas Carols`;
    window.scrollTo(0, 0);
  } else {
    document.title = "Christmas Carols";
    window.scrollTo(0, (history.state as NavState | null)?.scrollY ?? 0);
  }
}

let navigatingToNow = false;

function navigate(path: string, { keepFollowing = false } = {}) {
  if (path === location.pathname) return;
  const home = base() || "/";
  if (path === home && (history.state as NavState | null)?.fromIndex) {
    // Going "back" to the list: use real history so the browser's back stack stays tidy.
    history.back();
    return;
  }
  if (!current) {
    history.replaceState({ ...history.state, scrollY: window.scrollY } satisfies NavState, "");
  }
  history.pushState({ fromIndex: !current } satisfies NavState, "", path);
  navigatingToNow = keepFollowing;
  try {
    route();
  } finally {
    navigatingToNow = false;
  }
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

  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  if (action === "sing-together") {
    joinInput.value = "";
    joinError.hidden = true;
    singDialog.showModal();
    return;
  } else if (action === "close-sing") {
    singDialog.close();
    return;
  } else if (action === "start-session") {
    singDialog.close();
    navigate(`/s/${newCode()}`);
    showInvite();
    return;
  } else if (action === "invite") {
    showInvite();
    return;
  } else if (action === "share-link") {
    void shareLink();
    return;
  } else if (action === "copy-link") {
    void copyLink();
    return;
  } else if (action === "print") {
    window.print();
    return;
  } else if (action === "close-invite") {
    inviteDialog.close();
    return;
  } else if (action === "leave") {
    navigate(current ? songPath(current) : "/");
    return;
  } else if (action === "follow") {
    const now = getNow();
    following = true;
    if (now && current?.id !== now.songId) {
      navigate(`${base()}/song/${now.songId}`, { keepFollowing: true });
    } else {
      applyNow(true);
    }
    return;
  }

  const stanza = target.closest<HTMLElement>("[data-stanza]");
  if (stanza && current && !window.getSelection()?.toString()) {
    const index = Number(stanza.dataset.stanza);
    const now = getNow();
    const isActive = now?.songId === current.id && now.stanza === index;
    setNow(isActive && !session ? null : { songId: current.id, stanza: index });
    return;
  }

  const link = target.closest("a");
  if (link && link.origin === location.origin && !link.target) {
    event.preventDefault();
    // Links are written without the session prefix; keep it while in a session.
    const path = link.pathname === "/" ? base() || "/" : base() + link.pathname;
    navigate(path);
  }
});

window.addEventListener("popstate", route);

route();

registerSW({ immediate: true });
