#!/bin/sh
# Build public/og-image.png, the 1200x630 picture shown when a link is shared.
# Requires ImageMagick and macOS's Georgia font.
set -e
cd "$(dirname "$0")/.."
F=/System/Library/Fonts/Supplemental
ICON=$(mktemp -t bell).png
magick -background none -density 384 assets/bell-rounded.svg -resize 340x340 "$ICON"
magick -size 1200x630 xc:'#fdfbf7' \
  "$ICON" -geometry +100+130 -composite \
  -fill '#b3261e' -font "$F/Georgia Bold.ttf" -pointsize 70 -annotate +500+250 'Christmas Carols' \
  -fill '#4a4540' -font "$F/Georgia.ttf" -pointsize 38 -annotate +504+330 'Lyrics for singing along,' \
  -annotate +504+380 'on your own or together' \
  -fill '#1f6b3a' -font "$F/Georgia Bold.ttf" -pointsize 36 -annotate +504+460 'xmascarols.app' \
  -fill '#b3261e' -draw 'rectangle 0,610 599,630' -fill '#1f6b3a' -draw 'rectangle 600,610 1200,630' \
  -depth 8 public/og-image.png
rm -f "$ICON"
