"""Write qa/svg/AUDIT.md from qa/svg/audit.json (after both workflow rounds are merged)."""
from __future__ import annotations

import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
A = json.loads((HERE / "audit.json").read_text(encoding="utf-8"))

ORDER = [
    "keylist-stop-assess-communicate.svg", "scene-helmet-fit.svg", "keylist-stability-model.svg",
    "keylist-four-families.svg", "keylist-pavement-physics.svg", "scene-crossing.svg",
    "scene-loading-cargo.svg", "sort-cond-cold-hands.svg", "sort-cond-heat.svg", "sort-cond-storm.svg",
    "sort-cargo-towing.svg", "level-6-wayfinder.svg", "badge-b-terrain.svg",
]
KEYS = "ABCDEFGHIJKLM"

out = ["# qa/svg — audit log", "",
       "Per candidate: how it was built and reviewed, the verdict, and what is still imperfect.",
       "Verdicts are the reviewers' (Opus, max effort, adversarial) and, where noted, Claude's own look at the renders.",
       "Nothing here is wired; see README.md.", "",
       "| # | File | Verdict | Round 1 | Round 2 | Size |", "| --- | --- | --- | --- | --- | --- |"]
rows, sections = [], []
for k, f in zip(KEYS, ORDER):
    a = A.get(f, {})
    b = a.get("build") or {}
    hist = a.get("history") or []
    r2 = a.get("round2") or {}
    verdict = a.get("verdict") or (a.get("final") or {}).get("verdict") or "?"
    r1 = ", ".join(str((h.get("review") or {}).get("verdict", "?")) for h in hist) or "—"
    r2s = ", ".join(str((r2.get(t) or {}).get("verdict", "?")) for t in ("v1", "v2") if r2.get(t)) or "—"
    size = (HERE / f).stat().st_size if (HERE / f).exists() else 0
    rows.append(f"| {k} | `{f}` | **{verdict.upper()}** | {r1} | {r2s} | {size:,} B |")
    s = [f"## {k}. `{f}` — {verdict.upper()}", ""]
    if a.get("my_note"):
        s += [f"**Claude's own look:** {a['my_note']}", ""]
    if a.get("owner_note"):
        s += [f"**Reviewer's owner note:** {a['owner_note']}", ""]
    s += [f"- Round 1: builder {b.get('iterations', '?')} iteration(s), {len(hist)} review round(s): {r1}."]
    if b.get("residuals"):
        s += ["- Builder residuals: " + " | ".join(b["residuals"])]
    for t in ("v1", "v2"):
        v = r2.get(t)
        if not v:
            continue
        s += [f"- Round 2 verify {t[-1]}: **{v.get('verdict')}**"]
        for d in v.get("dossier_status") or []:
            s += [f"  - dossier #{d.get('index')} [{d.get('severity')}] {d.get('status')} — {d.get('evidence')}"]
        for d in v.get("defects") or []:
            s += [f"  - remaining [{d.get('severity')}] {d.get('element')} — {d.get('what')} → {d.get('fix')}"]
    for t in ("fix1", "fix2"):
        fx = r2.get(t)
        if fx and fx.get("residuals"):
            s += [f"- {t} residuals: " + " | ".join(fx["residuals"])]
    if not r2 and hist:
        fin = hist[-1].get("review") or {}
        for d in fin.get("defects") or []:
            s += [f"  - round-1 final [{d.get('severity')}] {d.get('element')} — {d.get('what')}"]
    sections += s + [""]
out += rows + [""] + sections
(HERE / "AUDIT.md").write_text("\n".join(out), encoding="utf-8")
print("wrote", HERE / "AUDIT.md")
