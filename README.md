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
---

First line of a stanza
Second line
  an indented (refrain) line
Last line *Chorus*

Chorus:
A stanza starting with "Chorus:" is shown as the chorus
```

A blank line separates stanzas, and `*text*` becomes a small cue such as *Chorus*.
The file name is the song's URL: `/song/silent-night`.

## Singing together

"Sing together" starts a session at `/s/<code>`. Share that link and everyone
in the session sees the same "now singing" song and verse:

- Tap a verse to mark it as being sung now. It scrolls near the top for everyone.
- Everyone follows the active verse by default: following takes you to the song
  and scrolls with it. If you scroll or browse on your own, following stops and
  the bar at the bottom shows **Jump to** so you can rejoin.
- Anyone in the session can set the verse; there's no leader.

Each session is a Durable Object (`src/worker/session.ts`) holding the current
song and verse, using hibernating WebSockets. The message types are in
`src/shared/protocol.ts`. A session that nobody joins for a week is deleted.

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

`assets/bell.svg` is the source for the icons. To regenerate the PNGs in `public/`:

```sh
sed 's|width="512" height="512" fill|width="512" height="512" rx="112" fill|' assets/bell.svg > public/icon.svg
for s in 512 192 32; do magick -background none -density 384 public/icon.svg -resize ${s}x$s public/icon-$s.png; done
magick -density 384 assets/bell.svg -resize 512x512 public/icon-maskable-512.png
magick -density 384 assets/bell.svg -resize 180x180 public/apple-touch-icon.png
```

## Old domain

`redirect/` is a tiny separate Worker. It permanently redirects the app's old
home, `xmasapp.ianbicking.org`, to `xmascarols.app`. Deploy it with
`npx wrangler deploy -c redirect/wrangler.jsonc`.
