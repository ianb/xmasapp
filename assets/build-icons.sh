#!/bin/sh
# Regenerate public/ icons from the SVG sources. Requires ImageMagick.
set -e
cd "$(dirname "$0")/.."
cp assets/bell-rounded.svg public/icon.svg
for s in 512 192 32; do
  magick -background none -density 384 assets/bell-rounded.svg -resize ${s}x$s public/icon-$s.png
done
magick -density 384 assets/bell.svg -resize 512x512 public/icon-maskable-512.png
magick -density 384 assets/bell.svg -resize 180x180 public/apple-touch-icon.png
