"""Render a review SVG the way the app shows it, for visual inspection.

    python qa/svg/_render.py qa/svg/<file>.svg            # plate: 700 px wide, as <img>
    python qa/svg/_render.py qa/svg/<file>.svg --icon 40  # icon: true size + 4x zoom
    python qa/svg/_render.py qa/svg/<file>.svg --width 900

Outputs into qa/svg/renders/<stem>.*.png:
    <stem>.img.png     rendered inside an <img> at display width, DPR 2, motion on
    <stem>.rm.png      same, in a Chromium launched with --force-prefers-reduced-motion
                       (must show the FINAL/complete state for animated files)
    <stem>.true.png    icons only: true display size at DPR 2 (what a learner sees)
    <stem>.zoom.png    icons only: 4x zoom for defect hunting
    <stem>.frames.png  animated only: 12 paused frames (t = 0 … 12 s) in one sheet —
                       CSS animations and SMIL are seeked, so every beat is inspectable
SlotArt renders plates object-contain inside an <img>; nothing here uses JS inside the
SVG, page CSS variables, or hover — those do not exist in an <img> and must not be
relied on.
"""
from __future__ import annotations

import pathlib
import re
import sys

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "renders"
TMP = OUT / "_tmp"
OUT.mkdir(exist_ok=True)
TMP.mkdir(exist_ok=True)

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)
svg = pathlib.Path(args[0]).resolve()
stem = svg.stem


def opt(flag, default=None, cast=str):
    if flag in args:
        return cast(args[args.index(flag) + 1])
    return default


text = svg.read_text(encoding="utf-8")
m = re.search(r'viewBox="([^"]+)"', text)
if not m:
    sys.exit("no viewBox on the root <svg>")
vw, vh = [float(x) for x in m.group(1).replace(",", " ").split()[2:4]]
animated = ("@keyframes" in text) or ("<animate" in text) or ("<set " in text)
icon_px = opt("--icon", None, int)
width = opt("--width", None, int) or (icon_px if icon_px else 700)
FRAME_T = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12]


def wrapper_img(w: int, name: str) -> pathlib.Path:
    html = (
        '<!doctype html><body style="margin:0;background:#ECF3EF;padding:24px">'
        f'<img id="i" src="{svg.as_uri()}" style="display:block;width:{w}px;height:auto;background:#F9FCFA">'
        "</body>"
    )
    p = TMP / f"{stem}.{name}.html"
    p.write_text(html, encoding="utf-8")
    return p


def wrapper_inline(w: int) -> pathlib.Path:
    # strip width/height on the root so the inline copy scales to the box like an <img>
    root_end = text.index(">")
    root = re.sub(r'\s(width|height)="[^"]*"', "", text[: root_end + 1])
    inline = root + text[root_end + 1 :]
    html = (
        '<!doctype html><body style="margin:0;background:#ECF3EF;padding:24px">'
        f'<div id="box" style="width:{w}px;background:#F9FCFA;line-height:0">{inline}</div></body>'
    )
    p = TMP / f"{stem}.inline.html"
    p.write_text(html, encoding="utf-8")
    return p


SEEK_JS = """(t) => {
  const svg = document.querySelector('svg');
  if (svg && svg.pauseAnimations) { svg.pauseAnimations(); svg.setCurrentTime(t); }
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
}"""


def shoot_img(b, w, name, reduced=False):
    # NOTE: Playwright's reduced_motion emulation does NOT reach an SVG document loaded
    # through <img>; the caller passes a browser launched with
    # --force-prefers-reduced-motion for the reduced shot instead (verified
    # pixel-identical to an inline render with the media query honoured).
    ctx = b.new_context(
        device_scale_factor=2,
        viewport={"width": w + 48, "height": int(w * vh / vw) + 48},
    )
    pg = ctx.new_page()
    pg.goto(wrapper_img(w, name).as_uri())
    pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(500)
    pg.locator("#i").screenshot(path=str(OUT / f"{stem}.{name}.png"))
    ctx.close()


with sync_playwright() as p:
    b = p.chromium.launch()
    shoot_img(b, width, "img")
    if icon_px:
        shoot_img(b, icon_px, "true")
        shoot_img(b, icon_px * 4, "zoom")
    brm = p.chromium.launch(args=["--force-prefers-reduced-motion"])
    shoot_img(brm, width, "rm", reduced=True)
    brm.close()
    if animated:
        ctx = b.new_context(
            device_scale_factor=1, viewport={"width": width + 48, "height": int(width * vh / vw) + 48}
        )
        pg = ctx.new_page()
        pg.goto(wrapper_inline(width).as_uri())
        pg.wait_for_timeout(300)
        frames = []
        for t in FRAME_T:
            pg.evaluate(SEEK_JS, t)
            pg.wait_for_timeout(80)
            fp = TMP / f"{stem}.t{t:04.1f}.png"
            pg.locator("#box").screenshot(path=str(fp))
            frames.append((t, fp))
        ctx.close()
        tiles = [Image.open(fp).convert("RGB") for _, fp in frames]
        tw, th = tiles[0].size
        cols = 4
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * tw, rows * (th + 22)), "#ECF3EF")
        d = ImageDraw.Draw(sheet)
        for i, ((t, _), tile) in enumerate(zip(frames, tiles)):
            x, y = (i % cols) * tw, (i // cols) * (th + 22)
            sheet.paste(tile, (x, y + 22))
            d.text((x + 6, y + 5), f"t = {t:g} s", fill="#0D1E2E")
        sheet.save(OUT / f"{stem}.frames.png")
    b.close()

made = sorted(OUT.glob(f"{stem}.*.png"))
print(f"{stem}: viewBox {vw:g}x{vh:g}  animated={animated}  width={width}px")
for f in made:
    print("  ", f.relative_to(HERE))
