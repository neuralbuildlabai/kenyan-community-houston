#!/usr/bin/env python3
"""Generate scan-to-visit QR assets for a page on the KIGH website.

Produces, for one URL, four files in the output directory:
  <slug>-qr.svg          vector poster (title + QR + URL caption) for print
  <slug>-qr.png          poster raster at screen size, for web and social
  <slug>-qr-print.png    poster raster at 3x, for flyers and banners
  <slug>-qr-plain.png    bare QR with quiet zone only, for designers

The QR uses error correction level H, so it still scans with a logo placed
over the middle or with print wear on a flyer.

Requires: qrcode, pillow (both already present in the local python3).

    python3 scripts/generate-qr-poster.py \
      --url https://www.kenyansingreaterhouston.org/membership \
      --title "Become a Member" \
      --subtitle "Kenyans in Greater Houston" \
      --slug membership \
      --out public/qr
"""

from __future__ import annotations

import argparse
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont

# Brand palette, mirroring tailwind.config.ts `kenyan` colors.
GREEN = "#15803d"
RED = "#be123c"
INK = "#111111"
WHITE = "#ffffff"

# Poster geometry, in SVG user units (1 unit == 1 px in the screen-size PNG).
WIDTH = 780
HEIGHT = 872
QR_BOX = 588  # width and height of the QR block, including its quiet zone
QR_X = (WIDTH - QR_BOX) // 2
QR_Y = 192
TITLE_BASELINE = 76
SUBTITLE_BASELINE = 120
ACCENT_Y = 148
ACCENT_W = 120
ACCENT_H = 6
CAPTION_BASELINE = 834

TITLE_SIZE = 46
SUBTITLE_SIZE = 26
CAPTION_SIZE = 26

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONT_BOLD = FONT_DIR / "Arial Bold.ttf"
FONT_REGULAR = FONT_DIR / "Arial.ttf"


def build_matrix(url: str) -> list[list[bool]]:
    """Encode `url` and return the module grid including a 4-module quiet zone."""
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_H, box_size=1, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    return [[bool(cell) for cell in row] for row in qr.get_matrix()]


def caption_for(url: str) -> str:
    """The URL as it should read on the poster: no scheme, no www, no trailing slash."""
    return url.replace("https://", "").replace("http://", "").removeprefix("www.").rstrip("/")


def write_svg(path: Path, matrix, url: str, title: str, subtitle: str) -> None:
    count = len(matrix)
    module = QR_BOX / count
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="{title} QR code">',
        f"  <title>{title}</title>",
        f"  <desc>{url}</desc>",
        f'  <rect width="100%" height="100%" fill="{WHITE}"/>',
        f'  <text x="{WIDTH / 2}" y="{TITLE_BASELINE}" text-anchor="middle" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="{TITLE_SIZE}" '
        f'font-weight="700" fill="{GREEN}">{title}</text>',
    ]
    if subtitle:
        parts.append(
            f'  <text x="{WIDTH / 2}" y="{SUBTITLE_BASELINE}" text-anchor="middle" '
            f'font-family="Arial, Helvetica, sans-serif" font-size="{SUBTITLE_SIZE}" '
            f'fill="{INK}">{subtitle}</text>'
        )
    # Flag accent: green then red, centered under the heading.
    half = ACCENT_W / 2
    parts.append(
        f'  <rect x="{WIDTH / 2 - half}" y="{ACCENT_Y}" width="{half}" '
        f'height="{ACCENT_H}" fill="{GREEN}"/>'
    )
    parts.append(
        f'  <rect x="{WIDTH / 2}" y="{ACCENT_Y}" width="{half}" '
        f'height="{ACCENT_H}" fill="{RED}"/>'
    )

    rects = []
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if not dark:
                continue
            x = QR_X + col * module
            y = QR_Y + row * module
            rects.append(
                f'<rect x="{x:g}" y="{y:g}" width="{module:g}" height="{module:g}" fill="#000000"/>'
            )
    parts.append("  " + "".join(rects))
    parts.append(
        f'  <text x="{WIDTH / 2}" y="{CAPTION_BASELINE}" text-anchor="middle" '
        f'font-family="Arial, Helvetica, sans-serif" font-size="{CAPTION_SIZE}" '
        f'font-weight="700" fill="{INK}">{caption_for(url)}</text>'
    )
    parts.append("</svg>")
    path.write_text("\n".join(parts) + "\n", encoding="utf-8")


def write_poster_png(path: Path, matrix, url: str, title: str, subtitle: str, scale: int) -> None:
    count = len(matrix)
    image = Image.new("RGB", (WIDTH * scale, HEIGHT * scale), WHITE)
    draw = ImageDraw.Draw(image)

    # Draw modules on an integer grid so no seams or gaps appear between them.
    module_px = (QR_BOX * scale) / count
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if not dark:
                continue
            x0 = round(QR_X * scale + col * module_px)
            y0 = round(QR_Y * scale + row * module_px)
            x1 = round(QR_X * scale + (col + 1) * module_px)
            y1 = round(QR_Y * scale + (row + 1) * module_px)
            draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill="#000000")

    title_font = ImageFont.truetype(str(FONT_BOLD), TITLE_SIZE * scale)
    caption_font = ImageFont.truetype(str(FONT_BOLD), CAPTION_SIZE * scale)
    center = (WIDTH * scale) / 2
    draw.text((center, TITLE_BASELINE * scale), title, font=title_font, fill=GREEN, anchor="ms")
    if subtitle:
        subtitle_font = ImageFont.truetype(str(FONT_REGULAR), SUBTITLE_SIZE * scale)
        draw.text(
            (center, SUBTITLE_BASELINE * scale), subtitle, font=subtitle_font, fill=INK, anchor="ms"
        )
    half = (ACCENT_W * scale) / 2
    draw.rectangle(
        [center - half, ACCENT_Y * scale, center, ACCENT_Y * scale + ACCENT_H * scale], fill=GREEN
    )
    draw.rectangle(
        [center, ACCENT_Y * scale, center + half, ACCENT_Y * scale + ACCENT_H * scale], fill=RED
    )
    draw.text(
        (center, CAPTION_BASELINE * scale),
        caption_for(url),
        font=caption_font,
        fill=INK,
        anchor="ms",
    )
    image.save(path, "PNG", optimize=True)


def write_plain_png(path: Path, matrix, size: int = 1200) -> None:
    count = len(matrix)
    module_px = size / count
    image = Image.new("RGB", (size, size), WHITE)
    draw = ImageDraw.Draw(image)
    for row, cells in enumerate(matrix):
        for col, dark in enumerate(cells):
            if not dark:
                continue
            x0 = round(col * module_px)
            y0 = round(row * module_px)
            x1 = round((col + 1) * module_px)
            y1 = round((row + 1) * module_px)
            draw.rectangle([x0, y0, x1 - 1, y1 - 1], fill="#000000")
    image.save(path, "PNG", optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="Destination the QR code opens")
    parser.add_argument("--title", required=True, help="Heading above the QR code")
    parser.add_argument("--subtitle", default="Kenyans in Greater Houston")
    parser.add_argument("--slug", required=True, help="Filename stem, e.g. membership")
    parser.add_argument("--out", default="public/qr", help="Output directory")
    parser.add_argument("--print-scale", type=int, default=3, help="Multiplier for the print PNG")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    matrix = build_matrix(args.url)

    write_svg(out / f"{args.slug}-qr.svg", matrix, args.url, args.title, args.subtitle)
    write_poster_png(out / f"{args.slug}-qr.png", matrix, args.url, args.title, args.subtitle, 1)
    write_poster_png(
        out / f"{args.slug}-qr-print.png",
        matrix,
        args.url,
        args.title,
        args.subtitle,
        args.print_scale,
    )
    write_plain_png(out / f"{args.slug}-qr-plain.png", matrix)

    print(f"{len(matrix)}x{len(matrix)} modules (incl. quiet zone) for {args.url}")
    for name in sorted(p.name for p in out.glob(f"{args.slug}-qr*")):
        print(f"  {out / name}")


if __name__ == "__main__":
    main()
