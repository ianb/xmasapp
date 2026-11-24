# xmasapp

A little web app of Christmas carol lyrics, at https://xmascarols.app, made for singing along on a phone.
It is an installable PWA and works offline once loaded.

## Songs

Each song is a text file in [`songs/`](songs/):

```
---
title: Silent Night
about: https://en.wikipedia.org/wiki/Silent_Night
layout: columns        # optional: columns (2 columns on wide screens/print) or longlines
tune: G4q. A4e G4q E4h. | G4q. A4e G4q E4h.   # optional: the opening of the melody
tempo: 84              # optional: quarter notes per minute, default 100
---

First line of a stanza
Second line
  an indented (refrain) line
Last line *Chorus*

Chorus:
A stanza starting with "Chorus:" is shown as the chorus
```

A blank line separates stanzas, and `*text*` becomes a small cue such as *Chorus*.

House style, enforced by `npm test`:

- Use plain ASCII punctuation: `'`, `"`, `--` for a dash, `...`. The app turns
  these into curly quotes, em dashes and ellipses.
- Put dialogue in double quotes. A leading `'` is only for elisions like `'Tis`.
- Start every line with a capital letter, and use sentence case within lyrics.
- Write repeats as `(x3)`. They show as a small "×3" cue.
- Titles are in title case ("Frosty the Snowman", not "Frosty The Snowman").
The file name is the song's URL: `/song/silent-night`.

A song with a `tune` gets a "Hear how it goes" button at the bottom that plays
the opening with a simple synthesized tone, to remind people how it goes. Notes
are a pitch and octave (`C4` is middle C, `#` sharp, `b` flat) or `r` for a
rest, followed by a length: `w` whole, `h` half, `q` quarter, `e` eighth, `s`
sixteenth, with `.` for dotted. `|` bar lines are just for reading. Keep it to
a line or two, between G3 and A5.

## Singing together

"Sing together" starts a session at `/s/<code>` and opens the invite panel. It
shows a QR code to scan, the code itself, and the link to share or copy. Everyone
in the session sees the same "now singing" song and verse:

- Tap a verse to mark it as being sung now. It scrolls near the top for everyone.
- Everyone follows the active verse by default: following takes you to the song
  and scrolls with it. If you scroll or browse on your own, following stops and
  the bar at the bottom shows **Jump to** so you can rejoin.
- Anyone in the session can set the verse; there's no leader.

Each session is a Durable Object (`src/worker/session.ts`) holding the current
song and verse, using hibernating WebSockets. The message types are in
`src/shared/protocol.ts`. A session that nobody joins for a week is deleted.

## Printing

`/print` builds a songbook from your favorites, or from all songs if you have
none starred. It has a contents page with page numbers, and choices for regular
pages (two columns) or a folded booklet, on Letter or A4 paper. Pressing Cmd/Ctrl+P
anywhere in the app prints that songbook.

Browsers can't paginate well enough for this, so `src/client/print.ts` measures
each song at its printed size and packs songs into columns stanza by stanza. For
a booklet it puts the pages on sheets in fold order. You can set the options in
the URL, e.g. `/print?format=booklet&paper=a4&songs=all`.

## Link previews and search

`build/prerender.ts` runs at build time. It writes a real HTML page for the home
page, `/about` and each song (`song/<id>.html`, served at `/song/<id>`), with a
title, description, Open Graph/Twitter tags, structured data and the lyrics in
plain HTML. Link previewers and search engines see that; the app replaces it
once its script loads. The build also writes `sitemap.xml` and `robots.txt`.

A song's preview picture is `public/og/<id>.jpg` if it has one, otherwise the
general `public/og-image.png`. Song pictures are made from public domain art
listed in `art/art.json` (credited on the about page): add an entry, run
`python3 art/build-share-images.py <id>` (needs ImageMagick) and commit the
image.

Session links (`/s/<code>`) go through the Worker, which retitles the page
"Sing Christmas carols with me" and marks it noindex.

The share image is `public/og-image.png`, built by `assets/build-og-image.sh`.

## Development

```sh
npm install
npm run dev       # Vite plus the Worker, running locally in workerd
npm test          # tests for the song parser and the song files
npm run check     # type check
```

## Deploying (Cloudflare Workers)

```sh
npx wrangler login
npm run deploy
```

The site is a Worker with [static assets](https://developers.cloudflare.com/workers/static-assets/).
Most requests are served as assets. Unknown paths fall back to `index.html`, and
the client routes them. Only `/api/*` runs the Worker (`src/worker/`), which
includes the session WebSockets.

## Icons

The icon sources are in `assets/`: `bell-rounded.svg` for the favicon and app
icons, and `bell.svg`, a full-bleed version for maskable icons. To regenerate the
PNGs in `public/` (needs ImageMagick), run `assets/build-icons.sh`.

## Old domain

`redirect/` is a tiny separate Worker. It permanently redirects the app's old
home, `xmasapp.ianbicking.org`, to `xmascarols.app`. Deploy it with
`npx wrangler deploy -c redirect/wrangler.jsonc`.
