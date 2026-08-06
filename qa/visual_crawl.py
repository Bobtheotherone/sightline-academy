"""Visual crawl harness (QA-001). Copy to qa/visual_crawl.py.

Walks STARTER/route-manifest.json with Playwright, logs in as the fixture
account each route-state names, drives the route into that state where a
`stepId`/`note` says how, and screenshots everything into a timestamped run
folder. The RESULT of this script is not "tests passed" — it is a folder of
PNGs that the QA agent OPENS AND LOOKS AT, one by one, against DESIGN-003
blueprints and the DESIGN-006 anti-generic checklist. Screenshots nobody views
are QA theater (QA-001 is explicit about this).

Usage:
    python qa/visual_crawl.py --base http://localhost:5173 \
        --manifest STARTER/route-manifest.json --out qa/crawl-runs

Requires: pip install playwright && playwright install chromium
Assumes the seed created the three crawl fixtures (QA-001):
    fresh@crawl.test / mid@crawl.test / grad@crawl.test  (password: crawl-pass)

Notes for the QA agent:
- States marked with a `note` (e.g. "revisit mode", "scripted failing attempt",
  "run with no ANTHROPIC_API_KEY") need the small manual drive implemented in
  drive_state(); the harness ships with the common ones and raises SKIP for
  anything it can't reach, so unreachable states are visible in the run log
  instead of silently missing.
- Add routes by editing route-manifest.json (mirrors SPEC-010), never by
  hardcoding here.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

PASSWORD = "crawl-pass"


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def login(page: Page, base: str, email: str) -> None:
    page.goto(f"{base}/login")
    page.get_by_label(re.compile("email", re.I)).fill(email)
    # ^anchor: the field label is "Password"; an unanchored regex also matches
    # the PasswordInput's accessible "Show password" toggle (strict-mode clash).
    page.get_by_label(re.compile(r"^password$", re.I)).fill(PASSWORD)
    page.get_by_role("button", name=re.compile("log ?in|sign ?in", re.I)).click()
    page.wait_for_url(re.compile(r"/dashboard"))


def resolve_route(route: str, state: dict) -> str:
    if ":" in route and "param" in state:
        return re.sub(r":\w+", state["param"], route)
    if ":" in route:
        return route  # verify/:code etc. — drive_state handles or SKIP
    return route


def drive_state(page: Page, route: str, state: dict) -> None:
    """Push the page into the named state. Extend as screens land."""
    name = state["state"] if isinstance(state, dict) else state
    if name.startswith("renderer-") and "stepId" in state:
        # Lesson player: reach the target step. Review-mode/frontier fixtures
        # honor ?step deep links directly; otherwise advance generically:
        # dismiss the (skippable) section interstitial, press Continue when
        # enabled, else poke the first enabled activity control on the stage.
        target = state["stepId"]
        page.goto(page.url.split("?")[0] + f"?step={target}")
        page.wait_for_load_state("networkidle")
        try:
            # First /learn visit cold-compiles the whole lesson chunk graph in
            # dev; wait for the player to actually mount before driving.
            page.wait_for_selector(
                "[data-step-id], [aria-label^='Next section']", timeout=20000
            )
        except Exception:
            pass  # fall through — the loop below reports a real gate
        idle = 0
        for i in range(60):
            if page.locator(f"[data-step-id='{target}']").count():
                page.wait_for_timeout(400)  # let reveal/settle motion finish
                return
            overlay = page.locator("[aria-label^='Next section']")
            if overlay.count():
                overlay.first.click()
                page.wait_for_timeout(200)
                idle = 0
                continue
            btn = page.get_by_role("button", name=re.compile("continue|next", re.I))
            if btn.count() and btn.first.is_enabled():
                btn.first.click()
                page.wait_for_timeout(300)
                idle = 0
                continue
            stage = page.locator("[data-step-id]")
            pokes = stage.locator("button:enabled") if stage.count() else None
            n = pokes.count() if pokes else 0
            if n:
                # Cycle instead of always-first: a risky branching choice
                # re-offers its node, and always-first would loop on it.
                pokes.nth(i % n).click()
                page.wait_for_timeout(300)
                idle = 0
                continue
            # Nothing actionable yet — lazy chunks / queries may still be
            # loading. Give it a few beats before declaring a gate.
            idle += 1
            if idle >= 8:
                raise LookupError(f"SKIP: cannot advance to {target} (gate?)")
            page.wait_for_timeout(500)
        raise LookupError(f"SKIP: step {target} not reached in 60 advances")
    if name == "delete-confirm-modal":
        page.get_by_role("button", name=re.compile("delete", re.I)).first.click()
    if name == "invalid-credentials":
        page.get_by_label(re.compile("email", re.I)).fill("nobody@crawl.test")
        page.get_by_label(re.compile(r"^password$", re.I)).fill("wrong-pass")
        page.get_by_role("button", name=re.compile("log ?in", re.I)).click()
        page.wait_for_timeout(400)
    # Unknown states without params: screenshot the default render — the
    # reviewer decides whether that satisfies the state or files a gap.


def crawl(base: str, manifest_path: Path, out_root: Path) -> int:
    manifest = json.loads(manifest_path.read_text())
    run_dir = out_root / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True)
    log, shot_count, skips = [], 0, 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for vp in manifest["viewports"]:
            mobile_routes = {
                r for cc in manifest.get("crossCutting", [])
                if cc.get("viewport") == "mobile" for r in cc["routes"]
            }
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]}
            )
            page = context.new_page()
            current_fixture = None

            for section in ("public", "app"):
                for entry in manifest[section]:
                    route = entry["route"]
                    if vp["name"] == "mobile" and route not in mobile_routes:
                        continue
                    for state in entry["states"]:
                        sdict = state if isinstance(state, dict) else {"state": state}
                        name = sdict["state"]
                        try:
                            if section == "app":
                                fixture = manifest["fixtures"][sdict.get("fixture", "mid")]
                                if fixture["email"] != current_fixture:
                                    login(page, base, fixture["email"])
                                    current_fixture = fixture["email"]
                            page.goto(base + resolve_route(route, sdict))
                            page.wait_for_load_state("networkidle")
                            drive_state(page, route, sdict)
                            fn = f"{vp['name']}--{slug(route) or 'root'}--{slug(name)}.png"
                            page.screenshot(path=str(run_dir / fn), full_page=True)
                            shot_count += 1
                            log.append({"route": route, "state": name,
                                        "viewport": vp["name"], "file": fn, "ok": True})
                        except LookupError as e:
                            skips += 1
                            log.append({"route": route, "state": name,
                                        "viewport": vp["name"], "ok": False,
                                        "skip": str(e)})
                        except Exception as e:  # noqa: BLE001 — log-and-continue crawl
                            skips += 1
                            log.append({"route": route, "state": name,
                                        "viewport": vp["name"], "ok": False,
                                        "error": f"{type(e).__name__}: {e}"})
            context.close()
        browser.close()

    (run_dir / "run-log.json").write_text(json.dumps(log, indent=2))
    print(f"[crawl] {shot_count} screenshots, {skips} skipped/failed -> {run_dir}")
    print("[crawl] NOW OPEN AND REVIEW EVERY PNG (QA-001). The crawl is the")
    print("[crawl] camera; the review is the QA. Log findings in BUILDLOG.")
    return 0 if shot_count else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:5173")
    ap.add_argument("--manifest", default="STARTER/route-manifest.json")
    ap.add_argument("--out", default="qa/crawl-runs")
    a = ap.parse_args()
    sys.exit(crawl(a.base, Path(a.manifest), Path(a.out)))
