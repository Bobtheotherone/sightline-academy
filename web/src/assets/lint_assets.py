"""Asset lint — VISUAL_ASSETS.md §10.4.

Cheap, deterministic checks over the illustration set. Not a test of the app
(so it sits outside the QA-003 budget by design); it is a check on the assets
themselves, in the same spirit as `ruff` on the server.

    python lint_assets.py

Checks:
  1. manifest integrity  — every `real` slot has an existing file and alt text
  2. orphan detection    — every `real` slot is referenced by some component,
                           page, or curriculum payload
  3. text ban            — no <text> elements in any plate
  4. external refs       — no remote hrefs, no @import, no <script>
  5. budget              — plates <= 25 KB, glyphs/icons/badges <= 8 KB
  6. palette             — every hex is a DESIGN-001 token

Orphan detection understands DYNAMIC slot resolution. Components legitimately
build slot names from data (BadgeMedal does `badge-${badgeId}`), so a literal
grep reports false orphans. Any family prefix that appears inside a template
literal marks that whole family as reachable.

*** WHAT THIS LINT DOES NOT PROVE ***
It proves a slot is REFERENCED, not that it RENDERS. A slot named only in a
comment, in dead code, or behind a condition that is never true still counts as
wired here. That is not a defect to fix — a static check cannot know what
paints — but it means a green lint is necessary and NOT sufficient.

The visual crawl (qa/visual_crawl.py, QA-001) is what proves rendering, and it
is the gate that matters. This was learned the direct way: lesson cards reported
as wired while the module page showed no thumbnails at all, because the wiring
landed after the lint ran and the slot names happened to appear in a doc
comment. Always finish with a crawl, and always look at it.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
WEB_SRC = HERE.parent
REPO = WEB_SRC.parent.parent
SEARCH = [str(WEB_SRC), str(REPO / "content")]

TOKENS = {
    "#0E2A23", "#1F5546", "#9CC3B4", "#EEF3EC", "#FBFCFA", "#C4622D",
    "#2E6E8E", "#E0A72E", "#A93226", "#4A5A54", "#D8E0DA",
}
# Families whose slot names are BUILT AT RUNTIME from data, so a literal grep
# cannot see them. Used only for orphan detection.
DYNAMIC_FAMILIES = ("badge-", "act-", "topic-", "section-", "match-", "sort-",
                    "xp-", "lesson-", "level-", "artifact-", "inset-",
                    "scenario-")

# Families that are small glyphs/icons and get the tight size budget. This is a
# DIFFERENT question from the one above — a scenario plate is dynamically
# resolved but is a full 960x540 illustration, not an icon.
GLYPH_FAMILIES = ("badge-", "act-", "topic-", "section-", "match-", "sort-",
                  "xp-")


SKIP_PARTS = ("node_modules", "dist", "__pycache__")
SEARCH_EXT = {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".md", ".json"}


def _corpus() -> list[tuple[str, str]]:
    """Every searchable source file, read once. Pure Python — no grep on PATH."""
    out: list[tuple[str, str]] = []
    for root in SEARCH:
        for p in Path(root).rglob("*"):
            if not p.is_file() or p.suffix not in SEARCH_EXT:
                continue
            s = str(p)
            if any(part in s for part in SKIP_PARTS):
                continue
            if p.name == "manifest.json" or p.name.startswith("_frag"):
                continue
            if p.parent.name == "svg":
                continue
            try:
                out.append((s, p.read_text(encoding="utf-8", errors="ignore")))
            except OSError:
                pass
    return out


CORPUS = None


def grep(pattern: str, literal: bool = True) -> list[str]:
    global CORPUS
    if CORPUS is None:
        CORPUS = _corpus()
    rx = re.compile(re.escape(pattern) if literal else pattern)
    return [f for f, body in CORPUS if rx.search(body)]


def main() -> int:
    man = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
    slots = {k: v for k, v in man["slots"].items() if not k.startswith("$")}
    problems: list[str] = []
    orphans: list[str] = []

    # Families reachable through template literals, e.g. `badge-${id}`.
    dynamic: set[str] = set()
    for fam in DYNAMIC_FAMILIES:
        if grep(rf"`{re.escape(fam)}\$\{{", literal=False):
            dynamic.add(fam)

    for slot, meta in slots.items():
        status = meta.get("status")
        if status != "real":
            continue
        # Raster slots carry a width ladder instead of a single file. Check the
        # ladder is actually on disk in every format the component will offer:
        # a missing rung is invisible in dev (the browser silently falls back a
        # format) and only shows up as a 404 in someone else's network tab.
        if meta.get("kind") == "raster":
            widths = meta.get("widths") or []
            if not widths:
                problems.append(f"{slot}: kind raster but no widths")
                continue
            for w in widths:
                png = HERE / "raster" / f"{slot}-{w}w.png"
                if not png.exists():
                    problems.append(f"{slot}: missing raster rung {png.name}")
            for ext in ("webp", "avif"):
                missing = [w for w in widths
                           if not (HERE / "raster" / f"{slot}-{w}w.{ext}").exists()]
                if missing and len(missing) != len(widths):
                    problems.append(f"{slot}: partial {ext} ladder, missing {missing}")
            if not meta.get("alt"):
                problems.append(f"{slot}: no alt text")
            reachable = any(slot.startswith(d) for d in dynamic) or bool(grep(slot))
            if not reachable:
                orphans.append(slot)
            continue

        f = meta.get("file")
        if not f:
            problems.append(f"{slot}: status real but no file")
            continue
        fp = HERE / f
        if not fp.exists():
            problems.append(f"{slot}: missing file {f}")
            continue
        if not meta.get("alt") and not meta.get("note"):
            problems.append(f"{slot}: no alt text")

        body = fp.read_text(encoding="utf-8", errors="ignore")
        if "<text" in body:
            problems.append(f"{slot}: contains <text> (U3)")
        if re.search(r'(?:xlink:)?href="http|@import|<script', body):
            problems.append(f"{slot}: external reference or script")

        size = fp.stat().st_size
        limit = 8192 if slot.startswith(GLYPH_FAMILIES) else 25600
        if size > limit:
            problems.append(f"{slot}: {size}B exceeds {limit}B")

        stray = {h.upper() for h in re.findall(r"#[0-9a-fA-F]{6}", body)} - TOKENS
        if stray:
            problems.append(f"{slot}: non-token colours {sorted(stray)}")

        reachable = any(slot.startswith(d) for d in dynamic) or bool(grep(slot))
        if not reachable:
            orphans.append(slot)

    real = sum(1 for m in slots.values() if m.get("status") == "real")
    deferred = sum(1 for m in slots.values() if m.get("status") == "deferred")
    print(f"slots            : {len(slots)}  ({real} real, {deferred} deferred)")
    print(f"dynamic families : {sorted(dynamic) or 'none'}")
    print(f"wired            : {real - len(orphans)}")
    print(f"ORPHANED         : {len(orphans)}")
    if orphans:
        print(f"  by family      : {dict(Counter(o.split('-')[0] for o in orphans))}")
        for o in sorted(orphans):
            print(f"    - {o}")
    print(f"problems         : {len(problems)}")
    for p in problems:
        print(f"    ! {p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
