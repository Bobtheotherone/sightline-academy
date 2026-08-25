"""Produce the Sightline identity set (VISUAL_ASSETS B-061..B-068).

Mark: D-notch — pine-950 tile, clay-500 blaze, paper-0 sightline cut through it.
Chosen because it is the only candidate whose second element survives 16px:
paper-0 on clay-500 is a large enough contrast jump to hold one device pixel.

Three geometries, because the platforms mask differently and a single file
would be wrong for two of them:
  * favicon.svg / .png  — rounded tile, shown as authored in the tab strip.
  * apple-touch-icon    — SQUARE, full bleed. iOS applies its own superellipse
                          mask; a pre-rounded icon gets rounded twice and shows
                          dark corner fringes.
  * icon-192/512        — maskable. Android crops to an arbitrary shape, so the
                          ground bleeds to the edge and the mark stays inside
                          the 80% safe circle (content <= 0.8 * size).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

OUT = Path(r"D:\Sightline_Saftey_Academy\web\public")
OUT.mkdir(parents=True, exist_ok=True)

PINE_950, CLAY_500, PAPER_0, PINE_300 = "#0D1E2E", "#B5446E", "#F9FCFA", "#ABCDB8"
INK_500 = "#46555A"

CONTOUR = (
    "<g fill='none' stroke='%s' stroke-opacity='0.07' stroke-width='1'>"
    "<path d='M-20 60 C 80 20, 160 100, 260 70 S 440 30, 460 80'/>"
    "<path d='M-20 120 C 90 80, 170 160, 270 128 S 440 92, 460 140'/>"
    "<path d='M-20 180 C 100 140, 180 220, 280 186 S 440 152, 460 200'/>"
    "<path d='M-20 240 C 90 205, 175 280, 275 246 S 440 212, 460 260'/>"
    "<path d='M-20 300 C 80 268, 165 340, 265 306 S 440 272, 460 320'/>"
    "<path d='M-20 360 C 90 330, 170 400, 270 366 S 440 332, 460 380'/>"
    "</g>" % PAPER_0
)


def blaze(cx, cy, half, r, fill):
    s = half * 2
    return (f'<rect x="{cx-half}" y="{cy-half}" width="{s}" height="{s}" rx="{r}" '
            f'fill="{fill}" transform="rotate(45 {cx} {cy})"/>')


def mark(size=64, tile_radius=14, scale=1.0, ground=PINE_950):
    """The mark on a `size` grid. scale shrinks the blaze for maskable safe zones."""
    c = size / 2
    half = 15 * (size / 64) * scale
    r = 4.5 * (size / 64) * scale
    bar_w = 4 * (size / 64) * scale
    # The bar must END INSIDE the diamond. A rotated square of half-side `half`
    # has half-diagonal half*sqrt(2); the round cap adds bar_w/2 beyond
    # bar_half, so solve for the cap landing at 90% of the vertex. Overshoot
    # leaves white nubs on the ground that turn into stray fringe pixels at 16.
    bar_half = 0.90 * (half * 1.41421356) - bar_w / 2
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">
  <rect width="{size}" height="{size}" rx="{tile_radius}" fill="{ground}"/>
  {blaze(c, c, half, r, CLAY_500)}
  <path d="M{c-bar_half} {c} H{c+bar_half}" stroke="{PAPER_0}" stroke-width="{bar_w}" stroke-linecap="round"/>
</svg>'''


# Safari pinned tab: ONE colour, no fill attrs honoured — the browser tints the
# whole silhouette. So the sightline must be a hole in the path, not a stroke.
# Rounded to match the brand diamond everywhere else (clause C4 — one object
# drawn one way across a set). Corner back-off along a 45 degree edge for
# radius r is exactly r, so each vertex retreats r/sqrt(2) in x and y.
MASK_ICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <path fill-rule="evenodd" d="M35.54 11.54 L52.46 28.46 A5 5 0 0 1 52.46 35.54
    L35.54 52.46 A5 5 0 0 1 28.46 52.46 L11.54 35.54 A5 5 0 0 1 11.54 28.46
    L28.46 11.54 A5 5 0 0 1 35.54 11.54 Z M12 30 h40 v4 h-40 Z"/>
</svg>'''

OG = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="{PINE_950}"/>
  <g transform="translate(0,0) scale(2.858)">{CONTOUR}</g>
  <g transform="translate(0,300) scale(2.858)">{CONTOUR}</g>
  <g transform="translate(96,126)">
    {blaze(58, 58, 52, 15, CLAY_500)}
    <path d="M-1 58 H117" stroke="{PAPER_0}" stroke-width="14" stroke-linecap="round"/>
  </g>
  <text x="290" y="214" fill="{PAPER_0}" font-family="system-ui, sans-serif"
        font-size="86" font-weight="800" letter-spacing="-1.5">Sightline</text>
  <text x="292" y="262" fill="{PINE_300}" font-family="system-ui, sans-serif"
        font-size="27" font-weight="600" letter-spacing="6.2">ATV SAFETY ACADEMY</text>
  <path d="M292 316 H1104" stroke="{PAPER_0}" stroke-opacity="0.16" stroke-width="2"/>
  <text x="292" y="386" fill="{PAPER_0}" font-family="system-ui, sans-serif"
        font-size="45" font-weight="600">Ride like you&#8217;ve thought it through.</text>
  <text x="292" y="446" fill="{PINE_300}" font-family="system-ui, sans-serif"
        font-size="27" font-weight="400">An ATV and road safety course built around judgment, not fear.</text>
  <g transform="translate(292,498)">
    <rect x="0" y="0" width="13" height="13" rx="3.5" fill="{CLAY_500}" transform="rotate(45 6.5 6.5)"/>
    <text x="30" y="15" fill="{PAPER_0}" font-family="system-ui, sans-serif"
          font-size="24" font-weight="500">Six modules</text>
    <rect x="196" y="0" width="13" height="13" rx="3.5" fill="{CLAY_500}" transform="rotate(45 202.5 6.5)"/>
    <text x="226" y="15" fill="{PAPER_0}" font-family="system-ui, sans-serif"
          font-size="24" font-weight="500">A field journal</text>
    <rect x="430" y="0" width="13" height="13" rx="3.5" fill="{CLAY_500}" transform="rotate(45 436.5 6.5)"/>
    <text x="460" y="15" fill="{PAPER_0}" font-family="system-ui, sans-serif"
          font-size="24" font-weight="500">Ranger, a safety tutor</text>
  </g>
</svg>'''

SUPERSAMPLE = {"og-default.png": True}

# (svg_text, out_name, width, height, transparent)
JOBS = [
    (mark(64, 14), "favicon.svg", None, None, False),
    (mark(64, 14), "favicon-32.png", 32, 32, True),
    (mark(64, 14), "favicon-16.png", 16, 16, True),
    # iOS: square, full bleed, no pre-rounding.
    (mark(64, 0), "apple-touch-icon.png", 180, 180, False),
    # Android maskable: full bleed + mark inside the 80% safe circle.
    (mark(64, 0, scale=0.72), "icon-192.png", 192, 192, False),
    (mark(64, 0, scale=0.72), "icon-512.png", 512, 512, False),
    (MASK_ICON, "mask-icon.svg", None, None, False),
    # v2: renamed deliberately. Scrapers cache OG images aggressively and
    # key on URL, so overwriting og-default.png would keep serving the old
    # "SAFETY ACADEMY" + "A free ... course" card from their caches.
    (OG, "og-default-v2.png", 1200, 630, False),
]


def main():
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for svg, name, w, h, transparent in JOBS:
            path = OUT / name
            if name.endswith(".svg"):
                path.write_text(svg, encoding="utf-8")
                print("wrote", name)
                continue
            # Text-bearing plates get supersampled (VISUAL_ASSETS Part 1): render
            # 3x, Lanczos down. Chromium composites glyphs with LCD subpixel AA,
            # which bakes RGB fringes into the PNG — measured at 912 px of
            # >40 channel spread on a two-colour card. Averaging 9 subpixels per
            # output pixel removes the fringe and sharpens the glyph edges.
            ss = 3 if SUPERSAMPLE.get(name) else 1
            p = b.new_page(viewport={"width": w, "height": h},
                           device_scale_factor=ss)
            p.set_content(
                "<style>html,body{margin:0;padding:0;overflow:hidden}"
                f"svg{{display:block;width:{w}px;height:{h}px}}</style>" + svg)
            p.screenshot(path=str(path), omit_background=transparent)
            p.close()
            if ss > 1:
                im = Image.open(path)
                im.resize((w, h), Image.LANCZOS).save(path, optimize=True)
            print("wrote", name, f"{w}x{h}", f"(ss x{ss})" if ss > 1 else "")
        b.close()


main()
