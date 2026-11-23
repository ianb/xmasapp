#!/usr/bin/env python3
"""Build public/og/<song>.jpg, the 1200x630 link-preview picture for each song
listed in art/art.json: the artwork on the left, the song title on the right.

Requires ImageMagick and macOS's Georgia font. Run it after editing art.json
and commit the images. Songs without art use public/og-image.png.

    python3 art/build-share-images.py [song-id ...]
"""

import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"
FONTS = Path("/System/Library/Fonts/Supplemental")
W, H = 1200, 630
BAR = 20  # red and green stripe along the bottom
MAX_ART_W = 680
PAD = 56
CREAM = "#fdfbf7"
RED = "#b3261e"
GREEN = "#1f6b3a"
GREY = "#6b645c"


def magick(*args):
    subprocess.run(["magick", *map(str, args)], check=True)


def size(path):
    out = subprocess.run(["magick", "identify", "-format", "%w %h", str(path)], check=True, capture_output=True, text=True)
    w, h = out.stdout.split()
    return int(w), int(h)


def song_title(song_id):
    text = (ROOT / "songs" / f"{song_id}.md").read_text()
    for line in text.splitlines()[1:]:
        if line.startswith("title:"):
            return typography(line[len("title:"):].strip())
    raise SystemExit(f"{song_id}: no title")


def typography(text):
    # Same as src/client/songs.ts, for the few characters titles use.
    return text.replace("'", "’")


def download(url, dest):
    # The museum's API asks for a descriptive User-Agent.
    req = urllib.request.Request(url, headers={"User-Agent": "xmascarols.app share image builder"})
    with urllib.request.urlopen(req) as res:
        dest.write_bytes(res.read())


def text_block(tmp, name, text, font, pointsize, color, width):
    path = tmp / f"{name}.png"
    magick("-background", "none", "-fill", color, "-font", FONTS / font, "-pointsize", pointsize,
           "-interline-spacing", -4, "-size", f"{width}x", f"caption:{text}", "-trim", "+repage", path)
    return path


def title_size(tmp, text, width):
    """Largest point size, up to 64, at which no word has to break."""
    longest = max(text.split(), key=len)
    for pointsize in range(64, 30, -4):
        path = tmp / "word.png"
        magick("-font", FONTS / "Georgia Bold.ttf", "-pointsize", pointsize, f"label:{longest}", path)
        if size(path)[0] <= width:
            return pointsize
    return 32


def build(song_id, art, tmp):
    src = tmp / f"{song_id}-src.jpg"
    download(art["image"], src)
    sw, sh = size(src)
    area_h = H - BAR
    art_w = min(MAX_ART_W, round(sw * area_h / sh))
    art_img = tmp / f"{song_id}-art.png"
    magick(src, "-resize", f"{art_w}x{area_h}^", "-gravity", "center", "-extent", f"{art_w}x{area_h}", art_img)

    text_w = W - art_w - 2 * PAD
    name = song_title(song_id)
    title = text_block(tmp, "title", name, "Georgia Bold.ttf", title_size(tmp, name, text_w), RED, text_w)
    credit = text_block(tmp, "credit", f"{art['artist']}, {art['title']}, {art['date']}",
                        "Georgia Italic.ttf", 24, GREY, text_w)
    site = text_block(tmp, "site", "xmascarols.app", "Georgia Bold.ttf", 34, GREEN, text_w)

    parts = [(title, 36), (credit, 40), (site, 0)]
    total = sum(size(p)[1] + gap for p, gap in parts)
    y = (area_h - total) // 2
    x = art_w + PAD
    cmd = ["-size", f"{W}x{H}", f"xc:{CREAM}", art_img, "-geometry", "+0+0", "-composite"]
    for path, gap in parts:
        cmd += [path, "-geometry", f"+{x}+{y}", "-composite"]
        y += size(path)[1] + gap
    cmd += ["-fill", RED, "-draw", f"rectangle 0,{H - BAR} {W // 2 - 1},{H}",
            "-fill", GREEN, "-draw", f"rectangle {W // 2},{H - BAR} {W},{H}",
            "-strip", "-quality", 82, OUT / f"{song_id}.jpg"]
    magick(*cmd)
    print(f"public/og/{song_id}.jpg")


def main():
    arts = json.loads((ROOT / "art" / "art.json").read_text())
    wanted = sys.argv[1:] or list(arts)
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        for song_id in wanted:
            build(song_id, arts[song_id], Path(d))


if __name__ == "__main__":
    main()
