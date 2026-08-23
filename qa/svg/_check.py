"""Static checks for a review SVG (the parts of VISUAL_ASSETS §10.4 and the SVG
contract a script can see). Exit code 1 on any problem.

    python qa/svg/_check.py qa/svg/<file>.svg
"""
from __future__ import annotations

import pathlib
import re
import sys

ALLOWED = {
    # tokens.css (2026-08-21) — assets are the token layer, so literal hex is correct
    "#0D1E2E", "#1E4440", "#2F6B52", "#3B8266", "#ABCDB8", "#DEEDE5", "#ECF3EF", "#F4F9F6",
    "#F9FCFA", "#FCFEFD", "#B5446E", "#CE6B92", "#983A5D", "#F6E0E9", "#1E8A6E", "#DCF0E8",
    "#DBA12E", "#F9EFD3", "#A93226", "#F5E0DE", "#46555A", "#D6DFDA",
}

p = pathlib.Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
problems: list[str] = []
warnings: list[str] = []

m = re.search(r'viewBox="([^"]+)"', t)
if not m:
    problems.append("root <svg> has no viewBox")
    vw = vh = 0
else:
    vw, vh = [float(x) for x in m.group(1).replace(",", " ").split()[2:4]]
is_icon = max(vw, vh) <= 128
budget = (8 if is_icon else 25) * 1024
size = p.stat().st_size
if size > budget:
    problems.append(f"{size} bytes exceeds the {'8 KB icon' if is_icon else '25 KB plate'} budget")

if re.search(r"<text[\s>]", t):
    problems.append("contains <text> — the asset lint bans it; let the caption carry words")
if re.search(r"<script|@import|<foreignObject|href=\"https?:|url\(https?:|xlink:href=\"https?:", t):
    problems.append("external reference, @import, <script> or <foreignObject> present")
if re.search(r"\b(white|black|gray|grey|red|blue|green|yellow|orange)\b\s*[;\"]", t):
    problems.append("named CSS colour used — hex tokens only")
if re.search(r"#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])", t):
    problems.append("3-digit hex colour used — spell the token out in 6 digits")
for h in sorted({h.upper() for h in re.findall(r"#[0-9a-fA-F]{6}\b", t)}):
    if h not in ALLOWED:
        problems.append(f"{h} is not a DESIGN-001 token")
if "rgb(" in t or "hsl(" in t:
    warnings.append("rgb()/hsl() colours present — make sure they are token values")

animated = ("@keyframes" in t) or ("<animate" in t) or ("<set " in t)
if animated and "prefers-reduced-motion" not in t:
    problems.append("animated but no @media (prefers-reduced-motion: reduce) block")
if "<title" not in t:
    warnings.append("no <title> (the manifest alt is the real accessibility text, but add one)")
if 'role="img"' not in t:
    warnings.append('root lacks role="img"')
ids = re.findall(r'\sid="([^"]+)"', t)
dups = sorted({i for i in ids if ids.count(i) > 1})
if dups:
    problems.append(f"duplicate ids: {dups}")
if re.search(r"\bvar\(--", t):
    problems.append("CSS variables used — they do not reach an <img>; use literal hex")
if re.search(r"font-family|<tspan", t):
    warnings.append("font/tspan present — text is banned, remove")
if re.search(r":hover|onclick|onload|addEventListener", t):
    problems.append("interactivity/JS present — nothing interactive works inside an <img>")

print(f"{p.name}: {size} bytes, viewBox {vw:g}x{vh:g}, {'icon' if is_icon else 'plate'}, animated={animated}")
for w in warnings:
    print("  warn:", w)
for pr in problems:
    print("  PROBLEM:", pr)
if not problems:
    print("  OK")
sys.exit(1 if problems else 0)
