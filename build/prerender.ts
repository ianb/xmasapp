import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { loadSongs, type Art, type Song } from "../src/client/songs";
import arts from "../art/art.json";

/**
 * Writes a real HTML page for the home page, the about page and every song, so
 * link previews (iMessage, Slack, social sites) and search engines, which mostly
 * don't run JavaScript, see a proper title, description, image and the lyrics.
 * The app takes over once its script loads. Also writes sitemap.xml and robots.txt.
 *
 * Pages are written as song/<id>.html; Cloudflare serves them at /song/<id>.
 */

const SITE = "https://xmascarols.app";
const SITE_NAME = "Christmas Carols";
const HOME_DESCRIPTION =
  "Words to Christmas carols and holiday songs for singing along on your phone, " +
  "on your own or together: follow along verse by verse, or print a songbook.";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Lyric line as HTML: *cues* in italics, (x3) as ×3. */
const lineHtml = (text: string) =>
  esc(text)
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\(x(\d+)\)/g, "<em>\u00d7$1</em>");

/** Lyric line as plain text, for descriptions and structured data. */
const lineText = (text: string) => text.replace(/\*([^*]+)\*/g, "($1)").replace(/\(x(\d+)\)/g, "(\u00d7$1)");

interface PageInfo {
  path: string;
  title: string;
  /** Title for link previews, without the site name. */
  shareTitle: string;
  description: string;
  body: string;
  jsonLd: object;
  image?: { url: string; alt: string };
}

const DEFAULT_IMAGE = {
  url: `${SITE}/og-image.png`,
  alt: "A red and green bell icon with the words Christmas Carols and xmascarols.app",
};

function render(template: string, page: PageInfo): string {
  const url = SITE + page.path;
  const image = page.image ?? DEFAULT_IMAGE;
  const head = `
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${esc(page.shareTitle)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image.url}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(image.alt)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(page.jsonLd).replace(/</g, "\\u003c")}</script>
  `;
  const replace = (html: string, pattern: RegExp, value: string) => {
    if (!pattern.test(html)) throw new Error(`prerender: index.html has no match for ${pattern}`);
    return html.replace(pattern, () => value);
  };
  let html = template;
  html = replace(html, /<title>[^<]*<\/title>/, `<title>${esc(page.title)}</title>`);
  html = replace(html, /<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(page.description)}" />`);
  html = replace(html, /<\/head>/, `${head}</head>`);
  html = replace(html, /<div id="app"><\/div>/, `<div id="app" class="prerendered">${page.body}</div>`);
  return html;
}

const website = { "@type": "WebSite", name: SITE_NAME, url: SITE + "/" };

function homePage(songs: Song[]): PageInfo {
  return {
    path: "/",
    title: `${SITE_NAME}: lyrics for singing along`,
    shareTitle: SITE_NAME,
    description: HOME_DESCRIPTION,
    body: `<h1>${SITE_NAME}</h1><p>${esc(HOME_DESCRIPTION)}</p><ul>${songs
      .map((s) => `<li><a href="/song/${s.id}">${esc(s.title)}</a></li>`)
      .join("")}</ul><p><a href="/about">About this app</a></p>`,
    jsonLd: { "@context": "https://schema.org", ...website, description: HOME_DESCRIPTION },
  };
}

function aboutPage(): PageInfo {
  const description =
    "About Christmas Carols: how to sing together in a shared session, put it on your home screen, " +
    "and print a songbook. It collects nothing.";
  return {
    path: "/about",
    title: `About \u2013 ${SITE_NAME}`,
    shareTitle: `About ${SITE_NAME}`,
    description,
    body: `<h1>About</h1><p>${esc(description)}</p><p><a href="/">All songs</a></p>`,
    jsonLd: { "@context": "https://schema.org", "@type": "AboutPage", name: "About", url: `${SITE}/about`, isPartOf: website },
  };
}

function songPage(song: Song): PageInfo {
  const first = song.stanzas[0]?.lines.slice(0, 2).map((l) => lineText(l.text)) ?? [];
  const description = `Lyrics to \u201c${song.title}\u201d: ${first.join(" / ")}\u2026 Sing along at xmascarols.app.`;
  const stanzas = song.stanzas
    .map(
      (st) =>
        `<p>${st.chorus ? "<strong>Chorus:</strong><br>" : ""}${st.lines.map((l) => lineHtml(l.text)).join("<br>")}</p>`,
    )
    .join("");
  const lyrics = song.stanzas
    .map((st) => (st.chorus ? "Chorus:\n" : "") + st.lines.map((l) => lineText(l.text)).join("\n"))
    .join("\n\n");
  const art = (arts as Record<string, Art>)[song.id];
  return {
    path: `/song/${song.id}`,
    image: art && {
      url: `${SITE}/og/${song.id}.jpg`,
      alt: `${art.title} by ${art.artist}, with the title ${song.title}`,
    },
    title: `${song.title} lyrics \u2013 ${SITE_NAME}`,
    shareTitle: song.title,
    description,
    body:
      `<article><h1>${esc(song.title)}</h1>${stanzas}` +
      (song.about ? `<p><a href="${esc(song.about)}">About this song</a></p>` : "") +
      `</article><p><a href="/">All songs</a></p>`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicComposition",
      name: song.title,
      url: `${SITE}/song/${song.id}`,
      inLanguage: "en",
      lyrics: { "@type": "CreativeWork", text: lyrics },
      ...(song.about ? { sameAs: song.about } : {}),
      isPartOf: website,
    },
  };
}

export function prerender(songsDir: string): Plugin {
  return {
    name: "xmasapp-prerender",
    applyToEnvironment: (env) => env.name === "client",
    writeBundle(options) {
      const dir = options.dir!;
      const template = readFileSync(path.join(dir, "index.html"), "utf8");
      const files = Object.fromEntries(
        readdirSync(songsDir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => [f, readFileSync(path.join(songsDir, f), "utf8")]),
      );
      const songs = loadSongs(files);

      writeFileSync(path.join(dir, "index.html"), render(template, homePage(songs)));
      writeFileSync(path.join(dir, "about.html"), render(template, aboutPage()));
      mkdirSync(path.join(dir, "song"), { recursive: true });
      for (const song of songs) {
        writeFileSync(path.join(dir, "song", `${song.id}.html`), render(template, songPage(song)));
      }

      const urls = ["/", "/about", ...songs.map((s) => `/song/${s.id}`)];
      writeFileSync(
        path.join(dir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${SITE}${u}</loc></url>`)
          .join("\n")}\n</urlset>\n`,
      );
      writeFileSync(
        path.join(dir, "robots.txt"),
        `User-agent: *\nDisallow: /s/\nDisallow: /api/\nDisallow: /print\n\nSitemap: ${SITE}/sitemap.xml\n`,
      );
    },
  };
}
