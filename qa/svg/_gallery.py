"""Build qa/svg/index.html — an owner-inspection gallery of every candidate SVG.

    python qa/svg/_gallery.py

Reads qa/svg/audit.json (written from the build/review workflow) when present, and
shows per candidate: the live SVG (animations play), the reduced-motion render, the
12-frame sheet (animated) or true-size/zoom renders (icons), the shipped art the
candidate would replace, and the review verdict with defects. Self-contained: no
external scripts or fonts; relative links into web/src/assets for the shipped art.
"""
from __future__ import annotations

import html
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REND = HERE / "renders"
AUDIT = json.loads((HERE / "audit.json").read_text(encoding="utf-8")) if (HERE / "audit.json").exists() else {}

ITEMS = [
    ("A", "keylist-stop-assess-communicate.svg", "plate", None, "keylist-stop-assess-communicate-1024w.png", "M5 L3 S1 — plain figure 5:3 (recommended animation; raster fallback ships today)"),
    ("B", "scene-helmet-fit.svg", "plate", None, "scene-helmet-fit-1024w.png", "M3 L1 S1 — plain figure 5:3 (optional upgrade over the shipped raster)"),
    ("C", "keylist-stability-model.svg", "plate", None, "keylist-stability-model-768w.png", "M4 L2 S1 — hotspot_figure 3:2, medallions pinned to the live stops"),
    ("D", "keylist-four-families.svg", "plate", None, "keylist-four-families-768w.png", "M5 L1 S1 — hotspot_figure 3:2, medallions pinned"),
    ("E", "keylist-pavement-physics.svg", "plate", None, "keylist-pavement-physics-768w.png", "M6 L1 S2 — hotspot_figure 3:2, medallions pinned"),
    ("F", "scene-crossing.svg", "plate", None, "scene-crossing-768w.png", "M6 L2 S1 — as a PLAIN figure 5:3 (adopting it means keylist + figure again)"),
    ("G", "scene-loading-cargo.svg", "plate", None, "scene-loading-cargo-768w.png", "M6 L2 S2 — ActivityHost host slot 5:2"),
    ("H", "sort-cond-cold-hands.svg", "icon", 40, None, "M5 L1 S2 sort card, 40 px"),
    ("I", "sort-cond-heat.svg", "icon", 40, None, "M5 L1 S2 sort card, 40 px"),
    ("J", "sort-cond-storm.svg", "icon", 40, None, "M5 L1 S2 sort card, 40 px"),
    ("K", "sort-cargo-towing.svg", "icon", 40, None, "M6 L2 S2 sort card, 40 px"),
    ("L", "level-6-wayfinder.svg", "icon", 96, None, "/progress + dashboard, 56–96 px"),
    ("M", "badge-b-terrain.svg", "icon", 32, None, "BadgeMedal, 32 / 44 px inside the blaze frame"),
]

CSS = """
:root{--ink:#0D1E2E;--spruce:#2F6B52;--sage:#ABCDB8;--moss:#ECF3EF;--paper:#F9FCFA;--clay:#B5446E;--amber:#DBA12E;--brick:#A93226;--grey:#46555A;--line:#D6DFDA}
*{box-sizing:border-box}body{margin:0;background:var(--moss);color:var(--ink);font:15px/1.5 system-ui,Segoe UI,Inter,sans-serif}
header{background:var(--ink);color:var(--paper);padding:28px 32px}header h1{margin:0 0 6px;font-size:24px}header p{margin:0;opacity:.8;max-width:900px}
nav{display:flex;flex-wrap:wrap;gap:8px;padding:14px 32px;background:var(--paper);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
nav a{font:600 13px/1 system-ui;color:var(--ink);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:7px 11px;background:#fff}
nav a .v{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle}
section{margin:28px 32px;background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:22px 24px}
section h2{margin:0 0 2px;font-size:20px}section .ctx{margin:0 0 16px;color:var(--grey)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
figure{margin:0;background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px}
figure figcaption{font:600 12px/1.3 system-ui;color:var(--grey);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}
figure img,figure object{display:block;width:100%;height:auto;background:var(--paper)}
figure.icon .row{display:flex;gap:18px;align-items:flex-end}figure.icon img{width:auto}
.verdict{display:inline-block;font:700 12px/1 system-ui;padding:6px 10px;border-radius:999px;color:#fff;background:var(--grey)}
.verdict.pass{background:var(--spruce)}.verdict.fix{background:var(--brick)}.verdict.none{background:var(--grey)}
.review{margin-top:16px;padding:14px 16px;background:var(--moss);border-radius:8px}
.review h3{margin:0 0 8px;font-size:14px}.review ul{margin:6px 0 0 18px;padding:0}.review li{margin:4px 0}
.sev{font:700 11px/1 system-ui;padding:2px 6px;border-radius:4px;color:#fff;background:var(--grey);margin-right:6px}
.sev.P1{background:var(--brick)}.sev.P2{background:var(--amber)}.sev.P3{background:var(--spruce)}
.meta{font-size:13px;color:var(--grey);margin:8px 0 0}
"""


def rel(p: pathlib.Path) -> str:
    return p.relative_to(HERE).as_posix()


def fig(caption: str, src: str, cls: str = "") -> str:
    return f'<figure class="{cls}"><figcaption>{html.escape(caption)}</figcaption><img src="{src}" alt=""></figure>'


out = []
out.append(f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>qa/svg — SVG candidates</title><style>{CSS}</style></head><body>")
out.append("<header><h1>qa/svg — SVG candidates for inspection</h1><p>Nothing here is wired. Each card shows the candidate live (animations play inside an &lt;img&gt;, exactly as SlotArt renders it), its reduced-motion state, its frame sheet or true-size renders, the art it would replace, and the build/review verdict. Source briefs: <code>BRIEFS.md</code>; review log: <code>AUDIT.md</code>.</p></header>")

nav = []
body = []
for key, file, kind, icon, raster, ctx in ITEMS:
    stem = file[:-4]
    svg = HERE / file
    a = AUDIT.get(file, {})
    final = a.get("final") or {}
    verdict = (a.get("verdict") or final.get("verdict", "none")) if svg.exists() else "none"
    nav.append(f'<a href="#{stem}"><span class="v" style="background:{"#2F6B52" if verdict=="pass" else "#A93226" if verdict=="fix" else "#46555A"}"></span>{key} · {html.escape(stem)}</a>')
    body.append(f'<section id="{stem}"><h2>{key} · <code>{html.escape(file)}</code> <span class="verdict {verdict}">{verdict.upper() if verdict!="none" else "NOT BUILT"}</span></h2><p class="ctx">{html.escape(ctx)}</p>')
    if not svg.exists():
        body.append("<p>No file produced.</p></section>")
        continue
    size = svg.stat().st_size
    body.append('<div class="grid">')
    body.append(f'<figure><figcaption>Candidate — live, as &lt;img&gt; ({size:,} bytes)</figcaption><img src="{file}" alt=""></figure>')
    rm = REND / f"{stem}.rm.png"
    if rm.exists():
        body.append(fig("Reduced motion (must equal the complete state)", rel(rm)))
    if kind == "plate":
        fr = REND / f"{stem}.frames.png"
        if fr.exists():
            body.append(fig("12 paused frames, t = 0 … 12 s", rel(fr)))
    else:
        tr, zm = REND / f"{stem}.true.png", REND / f"{stem}.zoom.png"
        if tr.exists() and zm.exists():
            body.append(f'<figure class="icon"><figcaption>True size ({icon} px, DPR 2) · 4× zoom</figcaption><div class="row"><img src="{rel(tr)}" style="width:{icon*2}px" alt=""><img src="{rel(zm)}" style="width:{icon*4}px" alt=""></div></figure>')
    # what it replaces
    if raster:
        rp = ROOT / "web/src/assets/raster" / raster
        if rp.exists():
            body.append(fig("Shipped today (batch-13 raster)", pathlib.Path("../../web/src/assets/raster") .joinpath(raster).as_posix()))
    old = ROOT / "web/src/assets/svg" / file
    if old.exists():
        body.append(f'<figure class="{"icon" if kind=="icon" else ""}"><figcaption>Current SVG in web/src/assets/svg (being replaced)</figcaption><img src="../../web/src/assets/svg/{file}" style="{"width:%dpx" % (icon*4) if icon else ""}" alt=""></figure>')
    body.append("</div>")
    # review block
    if a:
        b = a.get("build") or {}
        hist = a.get("history") or []
        r2 = a.get("round2") or {}
        body.append('<div class="review"><h3>Build &amp; review</h3>')
        if a.get("owner_note"):
            body.append(f'<p><b>Owner note:</b> {html.escape(a["owner_note"])}</p>')
        if a.get("my_note"):
            body.append("<p><b>Claude&#39;s own look:</b> " + html.escape(a["my_note"]) + "</p>")
        body.append(f'<p class="meta">Round 1 — builder: {b.get("iterations","?")} iteration(s); review rounds: {len(hist)} ({", ".join(str((h.get("review") or {}).get("verdict","?")) for h in hist)}). Reduced-motion = complete state: {final.get("reduced_motion_equals_complete_state")}.</p>')
        for tag in ("v1", "v2"):
            v = r2.get(tag)
            if not v:
                continue
            body.append(f'<p class="meta"><b>Round 2 verify {tag[-1]}</b> — verdict <b>{html.escape(str(v.get("verdict")))}</b>.</p>')
            ds = v.get("dossier_status") or []
            if ds:
                body.append("<ul>" + "".join(f'<li><span class="sev {d.get("severity","")}">{d.get("severity","")}</span>#{d.get("index")} <b>{html.escape(d.get("status",""))}</b> — {html.escape(d.get("evidence",""))}</li>' for d in ds) + "</ul>")
            if v.get("defects"):
                body.append("<p class='meta'><b>Remaining / new:</b></p><ul>" + "".join(f'<li><span class="sev {d.get("severity","")}">{d.get("severity","")}</span><b>{html.escape(d.get("element",""))}</b> — {html.escape(d.get("where",""))}: {html.escape(d.get("what",""))} <i>→ {html.escape(d.get("fix",""))}</i></li>' for d in v["defects"]) + "</ul>")
        for tag in ("fix1", "fix2"):
            f = r2.get(tag)
            if f and f.get("residuals"):
                body.append(f"<p class='meta'><b>{tag} residuals:</b> " + "; ".join(html.escape(x) for x in f["residuals"]) + "</p>")
        if not r2 and hist:
            fin1 = (hist[-1].get("review") or {})
            if fin1.get("defects"):
                body.append("<p class='meta'><b>Round-1 final review defects:</b></p><ul>" + "".join(f'<li><span class="sev {d.get("severity","")}">{d.get("severity","")}</span><b>{html.escape(d.get("element",""))}</b> — {html.escape(d.get("what",""))}</li>' for d in fin1["defects"]) + "</ul>")
        body.append("</div>")
    body.append("</section>")

out.append("<nav>" + "".join(nav) + "</nav>")
out.extend(body)
out.append("</body></html>")
(HERE / "index.html").write_text("\n".join(out), encoding="utf-8")
print("wrote", HERE / "index.html")
