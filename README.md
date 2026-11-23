# xmasapp

A little web app of Christmas carol lyrics, made for singing along on a phone.
It works offline once loaded, and you can install it as a PWA.

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
the client routes them. Only `/api/*` runs the Worker (`src/worker/`). To use a
custom domain, add a `routes` entry in `wrangler.jsonc`.
