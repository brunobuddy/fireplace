#!/usr/bin/env bash
# Regenerate the PWA / favicon asset set from the Fireplace flame mark.
#
# The SVG sources live inline below so this script is the single source of
# truth — run it whenever the brand mark changes:
#
#     ./frontend/scripts/generate-pwa-icons.sh
#
# Requires ImageMagick (`magick`). Gradients are intentionally avoided: the
# only SVG rasteriser guaranteed on the build hosts is ImageMagick's internal
# MSVG renderer, which fills gradient refs as black. Flat fills only.
#
# Palette (from src/app.css): terracotta #dd5b2c · honey amber #f1bd4b ·
# warm cream #fdf3df.
set -euo pipefail

OUT="$(cd "$(dirname "$0")/../public" && pwd)"
TERRACOTTA="#dd5b2c"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# The flame mark: a notched two-tongue flame (amber) over a cream hot core.
FLAME='<path fill="#f1bd4b" d="M556 196 C 540 300 540 356 486 410 C 462 388 446 366 432 340 C 410 430 360 474 360 584 C 360 720 428 802 512 802 C 596 802 664 720 664 584 C 664 470 582 404 566 322 C 560 282 558 238 556 196 Z"/>
       <path fill="#fdf3df" d="M516 470 C 480 540 426 580 426 650 C 426 710 466 750 516 750 C 566 750 604 710 604 648 C 604 576 552 540 516 470 Z"/>'

# "any" / favicon: rounded square, full-size flame.
cat > "$TMP/icon.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="$TERRACOTTA"/>
  $FLAME
</svg>
SVG

# "maskable": full-bleed background, flame scaled to ~82% so it survives the
# circular safe-zone crop launchers apply to adaptive icons.
cat > "$TMP/maskable.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="$TERRACOTTA"/>
  <g transform="translate(512 512) scale(0.82) translate(-512 -512)">
    $FLAME
  </g>
</svg>
SVG

echo "→ $OUT"

# 8-bit, metadata stripped — smallest files with the widest decoder support.
PNG=(-depth 8 -strip)

# Maskable purpose (full-bleed, opaque).
magick -background none "$TMP/maskable.svg" -resize 512x512 "${PNG[@]}" "$OUT/maskable-512x512.png"

# Any purpose (rounded, transparent corners).
magick -background none "$TMP/icon.svg" -resize 512x512 "${PNG[@]}" "$OUT/pwa-512x512.png"
magick -background none "$TMP/icon.svg" -resize 192x192 "${PNG[@]}" "$OUT/pwa-192x192.png"

# Apple touch icon: iOS ignores transparency and rounds the corners itself, so
# flatten onto the terracotta to avoid black corners.
magick -background "$TERRACOTTA" "$TMP/icon.svg" -flatten -resize 180x180 "${PNG[@]}" \
  "$OUT/apple-touch-icon-180x180.png"

# Favicons: scalable SVG for modern browsers + a multi-size .ico fallback.
cp "$TMP/icon.svg" "$OUT/favicon.svg"
magick -background "$TERRACOTTA" "$TMP/icon.svg" -flatten \
  -define icon:auto-resize=16,32,48 "$OUT/favicon.ico"

echo "done:"
ls -1 "$OUT"
