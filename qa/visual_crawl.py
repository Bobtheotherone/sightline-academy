"""Visual crawl harness (QA-001). Lives at qa/visual_crawl.py.

Walks qa/route-manifest.json with Playwright, logs in as the fixture account
each route-state names, drives the route into that state where a `stepId`/
`note` says how, and screenshots everything into a timestamped run folder. The
RESULT of this script is not "tests passed" — it is a folder of PNGs that the
QA agent OPENS AND LOOKS AT, one by one, against DESIGN-003 blueprints and the
DESIGN-006 anti-generic checklist. Screenshots nobody views are QA theater
(QA-001 is explicit about this).

Usage:
    python qa/visual_crawl.py --base http://localhost:4173 \
        --manifest qa/route-manifest.json --out qa/crawl-runs

PREFER CRAWLING THE PRODUCTION BUILD, not the dev server (bash form below; in
PowerShell set each var on its own line first, `$env:NAME = "..."`):

    # API first, or /instructor with-data 403s and deep states 401:
    #   FIXTURES=1 INSTRUCTOR_EMAILS=professor@example.edu,grad@crawl.test <api boot>
    cd web
    VITE_PUBLIC_ORIGIN=https://sightlinesafetyacademy.com npm run build
    VITE_API_TARGET=http://localhost:8000 npx vite preview --port 4173 --strictPort
    python qa/visual_crawl.py --base http://localhost:4173 ...

Two reasons. It tests the artifact that actually ships. And the dev server has
a failure mode the build does not: `import.meta.glob(..., {eager: true})` over
the art directories makes Vite serve every plate as its own module on every
page load (171 SVG + 81 raster rungs), which under crawl load produced
net::ERR_INSUFFICIENT_RESOURCES on /assessment — four states lost, reproducibly,
on clean servers. The same crawl against `vite preview` was clean, because the
build compiles those globs to a static URL map. A dev-only failure that looks
exactly like a product failure is the worst kind to debug at 2am.

VITE_PUBLIC_ORIGIN is not decoration here. The certificate sheet prints the
canonical public address under the verification code, and prints NOTHING there
when the only origin on offer is the local host (baking a preview address onto
a permanent sheet is worse than omitting it). Build without that var and
/certificate shoots code-only — correct behavior, but it leaves the one line a
learner hands an employer unreviewable in QA, and a reviewer who does not know
the rule reads it as a missing element. Substitute the real production domain
whenever it differs; the value only has to be the address that ships.
--strictPort matters too: without it vite silently slides to 4174 and the crawl
photographs a connection error 91 times.

Requires: pip install playwright && playwright install chromium
Assumes the API booted with FIXTURES=1 so the three crawl fixtures exist
(QA-001): fresh@crawl.test / mid@crawl.test / grad@crawl.test (crawl-pass),
and that INSTRUCTOR_EMAILS includes grad@crawl.test for /instructor.

Wave-3 harness notes:
- Mobile runs FIRST so fresh@crawl.test's first-run states shoot before the
  desktop deep-state drives write evidence into that account (QA-001 fixture
  discipline). Restart the API between passes to rebuild fixtures.
- The rate-limited login state spoofs X-Forwarded-For (the server keys its
  failure bucket on it), so the lockout binds to a throwaway IP and never
  poisons the crawl's real requests.
- The scripted assessment attempts derive their answer key ONCE per run from
  content/curriculum/final-assessment.md (reading authored content to drive
  the UI is sanctioned; the app itself still only sees the sanitized bank).
- The failing attempt runs as a dev-helper-completed account
  (examinee@crawl.test via POST /api/dev/complete-module, FIXTURES=1 only)
  so grad@'s fixture state stays untouched.
- States marked SKIP in the run log are unreachable, not silently missing.

Capture integrity (pass-9 review — half the deep-state evidence was unusable):
- Chromium paints sticky/fixed chrome into a full-page frame at the CURRENT
  scroll offset, so the lesson action bar, the tutor composer, the mobile tab
  bar and the app header floated mid-document and covered real content.
  shoot() now scrolls to the top and drops that chrome into normal flow for
  full-page frames only — the chrome is still judged in the viewport frames,
  where it is doing its real job.
- A full-screen fixed overlay can never be full-page-captured honestly (one
  viewport of overlay over a taller document). Overlay states are listed in
  VIEWPORT_SHOTS, and shoot() also detects an open one and drops to viewport
  size regardless, so a new overlay state cannot silently ship a hybrid frame.
- The five /tutor conversation states all resolve to the same seeded thread,
  which shot five byte-identical PNGs per breakpoint. Each one now frames its
  own turn, and pins /meta/health's provider so the header (offline badge or
  not) is the one the state name claims.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import Page, TimeoutError as PWTimeout, sync_playwright

REPO_ROOT = Path(__file__).resolve().parents[1]
PASSWORD = "crawl-pass"
FAKE_IP = "203.0.113.77"  # rate-limit isolation: server buckets on X-Forwarded-For
EXAMINEE = {"email": "examinee@crawl.test", "displayName": "Sam Kestrel"}
CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

# States shot as a viewport crop (the state IS a scroll/overlay/transient
# moment; a full-page capture would flatten it away).
VIEWPORT_SHOTS = {
    "scrolled-modules",
    "scrolled-tutor-teaser",
    "long-history-scroll",
    "asking-typing-bubble",
    "loading-skeletons",
    "error-toast",
    "focus-visible-tab-through",
    "in-progress",
    # Full-screen fixed overlays: a full-page frame paints one viewport of
    # overlay over an un-overlaid document and reads as a broken z-index.
    "section-interstitial",
    "delete-confirm-modal",
    # /tutor is a viewport-shaped surface with an internally scrolled message
    # list — a full-page frame unrolls the list and moots the framing that
    # makes each conversation state its own state.
    "conversation-grounding-curriculum",
    "conversation-grounding-mixed",
    "conversation-grounding-general",
    "conversation-triage-decline",
    "offline-mode-header",
}

# States that swap the logged-in session under the main loop's feet.
RESETS_SESSION = {"results-fail-interstitial"}

JSON_HEADERS = {"Content-Type": "application/json"}


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def grad_cert_code() -> str:
    """Mirror of services/fixtures.py: deterministic grad certificate code."""
    digest = hashlib.sha256(b"grad@crawl.test").digest()
    return "".join(CROCKFORD[b % 32] for b in digest[:10])


def load_answer_key() -> dict[str, str]:
    """question prompt -> authored best-option text, from the content bank."""
    text = (REPO_ROOT / "content" / "curriculum" / "final-assessment.md").read_text(
        encoding="utf-8"
    )
    match = re.search(r"```json assessment\n(.*?)```", text, re.S)
    if not match:
        raise RuntimeError("assessment bank fence not found in final-assessment.md")
    bank = json.loads(match.group(1))
    return {
        q["prompt"]: next(o["text"] for o in q["options"] if o.get("correct"))
        for q in bank["questions"]
    }


def bank_module_ids() -> list[str]:
    """The six module ids in course order, as the bank first mentions them."""
    text = (REPO_ROOT / "content" / "curriculum" / "final-assessment.md").read_text(
        encoding="utf-8"
    )
    bank = json.loads(re.search(r"```json assessment\n(.*?)```", text, re.S).group(1))
    seen: list[str] = []
    for q in bank["questions"]:
        if q["module"] not in seen:
            seen.append(q["module"])
    return seen


def login(page: Page, base: str, email: str) -> None:
    page.goto(f"{base}/login")
    page.get_by_label(re.compile("email", re.I)).fill(email)
    # ^anchor: the field label is "Password"; an unanchored regex also matches
    # the PasswordInput's accessible "Show password" toggle (strict-mode clash).
    page.get_by_label(re.compile(r"^password$", re.I)).fill(PASSWORD)
    page.get_by_role("button", name=re.compile("log ?in|sign ?in", re.I)).click()
    page.wait_for_url(re.compile(r"/dashboard"))


def resolve_route(route: str, state: dict) -> str:
    name = state.get("state", "")
    if route == "/verify/:code":
        # Deterministic grad code (fixtures.py) for the valid state; a
        # crockford-foldable junk code for the designed invalid state.
        code = grad_cert_code() if "invalid" not in name else "0000000000"
        return f"/verify/{code}"
    if ":" in route and "param" in state:
        return re.sub(r":\w+", state["param"], route)
    return route


# ── Lesson-player helpers ────────────────────────────────────────────────────


def dismiss_interstitial(page: Page) -> bool:
    overlay = page.locator("[aria-label^='Next section']")
    if overlay.count():
        overlay.first.click()
        page.wait_for_timeout(250)
        return True
    return False


def rail_goto(page: Page, title: str) -> bool:
    """Click the StepRail entry for a completed/current step (revisit, R2.5)."""
    rail = page.locator("nav[aria-label='Lesson steps']")
    if not rail.count():
        return False
    buttons = rail.get_by_role(
        "button", name=re.compile(re.escape(title[:40]), re.I)
    )
    for i in range(buttons.count()):
        btn = buttons.nth(i)
        if btn.is_visible() and btn.is_enabled():
            btn.click()
            page.wait_for_timeout(300)
            return True
    return False


def reach_step(page: Page, base: str, state: dict) -> None:
    """Land the lesson player on the target step.

    A target BEHIND the frontier (e.g. an auto-acknowledged content step) is
    reached by clicking its StepRail entry — the forward walk below would
    otherwise destructively answer activities while hunting a step it can
    never reach by advancing. Targets at/ahead of the frontier fall through
    to the ?step deep link + generic frontier walk.
    """
    target = state["stepId"]
    page.goto(page.url.split("?")[0] + f"?step={target}")
    page.wait_for_load_state("networkidle")
    try:
        # First /learn visit cold-compiles the whole lesson chunk graph in
        # dev; wait for the player to actually mount before driving.
        page.wait_for_selector(
            "[data-step-id], [aria-label^='Next section']", timeout=20000
        )
    except PWTimeout:
        pass  # fall through — the loop below reports a real gate
    if page.locator(f"[data-step-id='{target}']").count():
        page.wait_for_timeout(400)
        return
    # Behind the frontier? The rail knows: completed steps are clickable.
    if "param" in state:
        try:
            data = lesson_payload(page, base, state["param"])
            step = next((s for s in data["steps"] if s["id"] == target), None)
            if step is not None and rail_goto(page, step["title"]):
                page.wait_for_selector(f"[data-step-id='{target}']", timeout=5000)
                page.wait_for_timeout(400)
                return
        except LookupError:
            pass  # fall through to the frontier walk
    idle = 0
    for i in range(60):
        if page.locator(f"[data-step-id='{target}']").count():
            page.wait_for_timeout(400)  # let reveal/settle motion finish
            return
        if dismiss_interstitial(page):
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
        # Nothing actionable yet — lazy chunks / queries may still be loading.
        idle += 1
        if idle >= 8:
            raise LookupError(f"SKIP: cannot advance to {target} (gate?)")
        page.wait_for_timeout(500)
    raise LookupError(f"SKIP: step {target} not reached in 60 advances")


def drive_lesson_complete(page: Page) -> None:
    """Walk the whole lesson to the LessonCompleteView (fills text, answers MC)."""
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("[data-step-id], [aria-label^='Next section']", timeout=20000)
    for i in range(80):
        if page.get_by_text("Lesson complete", exact=True).count():
            page.wait_for_timeout(700)  # XP chip count-up settle
            return
        if dismiss_interstitial(page):
            continue
        stage = page.locator("[data-step-id]")
        # Reflection / structured steps: a short honest line unlocks them.
        boxes = stage.locator("textarea:enabled") if stage.count() else None
        if boxes and boxes.count() and not boxes.first.input_value():
            boxes.first.fill(
                "I ride faster when the group does — naming that here so I catch it."
            )
            page.wait_for_timeout(500)
        btn = page.get_by_role("button", name=re.compile("finish lesson|continue|next", re.I))
        if btn.count() and btn.first.is_enabled():
            btn.first.click()
            page.wait_for_timeout(350)
            continue
        pokes = stage.locator("button:enabled") if stage.count() else None
        n = pokes.count() if pokes else 0
        if n:
            pokes.nth(i % n).click()
            page.wait_for_timeout(300)
            continue
        page.wait_for_timeout(400)
    raise LookupError("SKIP: lesson-complete view not reached in 80 advances")


def lesson_payload(page: Page, base: str, lesson_id: str) -> dict:
    res = page.request.get(f"{base}/api/lessons/{lesson_id}")
    if not res.ok:
        raise LookupError(f"SKIP: GET /lessons/{lesson_id} -> {res.status}")
    return res.json()


def drive_mc_wrong(page: Page, base: str, state: dict) -> None:
    """Select a not-best option on the target MC step (QA-001 §crawl item 3)."""
    target = state["stepId"]
    reach_step(page, base, state)
    data = lesson_payload(page, base, state["param"])
    step = next(s for s in data["steps"] if s["id"] == target)
    payload = step["payload"]
    # checkpoint steps wrap the MC payload under `inner` (SPEC-007 §12)
    options = payload.get("options") or payload.get("inner", {}).get("options") or []
    if not options:
        raise LookupError(f"SKIP: no options in payload for {target}")
    wrong = next(o for o in options if not o.get("isBest"))
    stage = page.locator(f"[data-step-id='{target}']")
    stage.locator("button[aria-pressed]").filter(has_text=wrong["text"]).first.click()
    page.get_by_text("Worth another look").first.wait_for(timeout=5000)
    page.wait_for_timeout(400)


def drive_sort_wrong(page: Page, base: str, state: dict) -> None:
    """Tap items onto the first category until one lands wrong (teaching strip)."""
    target = state["stepId"]
    reach_step(page, base, state)
    stage = page.locator(f"[data-step-id='{target}']")
    zone = stage.locator("button[aria-label]").filter(
        has=page.locator("span.text-sm.font-semibold")
    )
    tray = stage.locator("li > button[draggable]")
    for _ in range(8):
        if not tray.count():
            raise LookupError("SKIP: sort tray emptied before a wrong drop landed")
        tray.first.click()
        page.wait_for_timeout(150)
        zone.first.click()
        page.wait_for_timeout(400)
        if stage.locator("text=Not where").count():
            page.wait_for_timeout(300)
            return
    raise LookupError("SKIP: no wrong drop after 8 tap-assign attempts")


def drive_prediction_locked(page: Page, base: str, state: dict) -> None:
    """Commit a prediction: Locked-in pill + per-option unmask + general reveal."""
    reach_step(page, base, state)
    stage = page.locator(f"[data-step-id='{state['stepId']}']")
    radios = stage.locator("button[role='radio']:enabled")
    if radios.count():
        radios.first.click()
    page.get_by_text("Locked in").first.wait_for(timeout=5000)
    page.wait_for_timeout(900)  # unmask + 200ms-delayed general reveal settle


def drive_section_interstitial(page: Page) -> None:
    """Step Back to a completed step, advance across the section boundary, and
    leave the interstitial on screen for the shot (1800ms dwell)."""
    page.wait_for_load_state("networkidle")
    page.wait_for_selector("[data-step-id]", timeout=20000)
    back = page.get_by_role("button", name=re.compile(r"^back$", re.I))
    if back.count() and back.first.is_enabled():
        back.first.click()
        page.wait_for_timeout(300)
        cont = page.get_by_role("button", name=re.compile("continue|next", re.I))
        if cont.count() and cont.first.is_enabled():
            cont.first.click()
            page.wait_for_selector("[aria-label^='Next section']", timeout=4000)
            page.wait_for_timeout(450)  # title fade-in (320ms) finishes
            return
    # Fallback: fresh lesson — the first Continue crosses briefing → learn.
    for _ in range(10):
        if page.locator("[aria-label^='Next section']").count():
            page.wait_for_timeout(450)
            return
        cont = page.get_by_role("button", name=re.compile("continue|next", re.I))
        if cont.count() and cont.first.is_enabled():
            cont.first.click()
            page.wait_for_timeout(300)
        else:
            page.wait_for_timeout(300)
    raise LookupError("SKIP: section interstitial did not appear")


# ── Auth-page drives ─────────────────────────────────────────────────────────


def drive_rate_limited(page: Page, base: str) -> None:
    """9 failed logins from a spoofed IP; the 9th shows the DESIGN-005 inline."""
    for _ in range(8):
        page.request.post(
            f"{base}/api/auth/login",
            data=json.dumps({"email": "nobody@crawl.test", "password": "wrong-pass"}),
            headers={**JSON_HEADERS, "X-Forwarded-For": FAKE_IP},
        )
    page.set_extra_http_headers({"X-Forwarded-For": FAKE_IP})
    try:
        page.get_by_label(re.compile("email", re.I)).fill("nobody@crawl.test")
        page.get_by_label(re.compile(r"^password$", re.I)).fill("wrong-pass")
        page.get_by_role("button", name=re.compile("log ?in", re.I)).click()
        page.get_by_text("Too many attempts").wait_for(timeout=5000)
        page.wait_for_timeout(250)
    finally:
        page.set_extra_http_headers({})


def drive_register_validation(page: Page) -> None:
    page.get_by_label(re.compile("display name", re.I)).fill("R")
    page.get_by_label(re.compile("^email$", re.I)).fill("not-an-email")
    page.get_by_label(re.compile(r"^password$", re.I)).fill("short")
    page.get_by_role("button", name=re.compile("start the course", re.I)).click()
    page.get_by_text("Password needs at least 10 characters").wait_for(timeout=5000)
    page.wait_for_timeout(250)


def drive_register_duplicate(page: Page) -> None:
    page.get_by_label(re.compile("display name", re.I)).fill("Trail Tester")
    page.get_by_label(re.compile("^email$", re.I)).fill("mid@crawl.test")
    page.get_by_label(re.compile(r"^password$", re.I)).fill("meadowlark-gravel-42")
    page.get_by_role("button", name=re.compile("start the course", re.I)).click()
    page.get_by_text("That email already has an account.").wait_for(timeout=5000)
    page.wait_for_timeout(250)


# ── Assessment drives ────────────────────────────────────────────────────────


def start_attempt(page: Page) -> None:
    page.get_by_role("button", name=re.compile("start the assessment", re.I)).click()
    page.get_by_text(re.compile(r"Question 1 of \d+")).wait_for(timeout=10000)
    page.wait_for_timeout(300)


def answer_current_question(page: Page, key: dict[str, str], correctly: bool) -> None:
    prompt_loc = page.locator("p.text-lg.font-medium").first
    prompt_loc.wait_for(timeout=10000)
    prompt = prompt_loc.inner_text().strip()
    best = key.get(prompt)
    if best is None:
        raise LookupError(f"SKIP: prompt not in answer key: {prompt[:60]!r}")
    options = page.locator("button[aria-pressed]")
    if correctly:
        options.filter(has_text=best).first.click()
    else:
        n = options.count()
        for i in range(n):
            if best not in options.nth(i).inner_text():
                options.nth(i).click()
                break
    page.wait_for_timeout(120)


def drive_attempt_in_progress(page: Page, key: dict[str, str]) -> None:
    """Answer three questions, land on question 4 with the rail showing it."""
    start_attempt(page)
    for _ in range(3):
        answer_current_question(page, key, correctly=True)
        page.get_by_role("button", name="Next question").click()
        page.wait_for_timeout(250)


def drive_scripted_attempt(page: Page, key: dict[str, str], passing: bool) -> None:
    """Play a full 20-question attempt through the real UI and submit it."""
    start_attempt(page)
    for i in range(20):
        answer_current_question(page, key, correctly=passing)
        if i < 19:
            page.get_by_role("button", name="Next question").click()
            page.wait_for_timeout(200)
    page.get_by_role("button", name="Review your answers").click()
    page.get_by_text("Review before you submit").wait_for(timeout=5000)
    page.get_by_role("button", name="Submit for scoring").click()
    marker = "Final assessment — passed" if passing else "Review these modules"
    page.get_by_text(marker).wait_for(timeout=15000)
    page.wait_for_timeout(600)


def become_examinee(page: Page, base: str) -> None:
    """Log in (or register) the dev-helper-completed failing-attempt account."""
    req = page.request
    res = req.post(
        f"{base}/api/auth/login",
        data=json.dumps({"email": EXAMINEE["email"], "password": PASSWORD}),
        headers=JSON_HEADERS,
    )
    if not res.ok:
        res = req.post(
            f"{base}/api/auth/register",
            data=json.dumps({**EXAMINEE, "password": PASSWORD}),
            headers=JSON_HEADERS,
        )
        if not res.ok:
            raise LookupError(f"SKIP: examinee register -> {res.status}")
    for module_id in bank_module_ids():
        done = req.post(
            f"{base}/api/dev/complete-module",
            data=json.dumps({"moduleId": module_id}),
            headers=JSON_HEADERS,
        )
        if not done.ok:
            raise LookupError(
                f"SKIP: dev/complete-module {module_id} -> {done.status} (FIXTURES=1?)"
            )


# ── Tutor drives ─────────────────────────────────────────────────────────────


def drive_typing_bubble(page: Page) -> None:
    """Hold the ask routes client-side and shoot the three-dot typing bubble.
    The request never leaves the browser, so nothing persists server-side."""
    page.route("**/api/tutor/ask**", lambda route: None)  # hold forever
    composer = page.locator("textarea").first
    composer.fill("Do I really need the full gear set for a ten-minute ride?")
    composer.press("Enter")
    bubble = page.locator("[aria-label='Ranger is thinking']")
    bubble.wait_for(timeout=5000)
    bubble.scroll_into_view_if_needed()
    page.wait_for_timeout(300)


def cleanup_typing_bubble(page: Page) -> None:
    # Reload FIRST while the route is still registered: navigation cancels the
    # held request client-side. Unrouting first releases it to the server and
    # persists a stray turn into the fixture's seeded history (pass-4 lesson).
    page.reload()
    page.wait_for_load_state("networkidle")
    page.unroute("**/api/tutor/ask**")


def drive_history_scroll(page: Page) -> None:
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(400)
    page.evaluate(
        """() => {
          const lists = [...document.querySelectorAll('.overflow-y-auto')];
          const list = lists.find((el) => el.scrollHeight > el.clientHeight);
          if (list) list.scrollTop = list.scrollHeight * 0.45;
        }"""
    )
    page.wait_for_timeout(300)


# The DESIGN-002 GroundingLabel / TriageEyebrow texts, one per named tutor
# state. All of them live in the SAME seeded thread (fixtures.py
# TUTOR_SCRIPT), so the state is a turn, not a route — the crawl has to frame
# it. `.` stands in for the apostrophe / em dash so the match is encoding-proof.
TUTOR_TURN_MARKS = {
    "conversation-grounding-curriculum": re.compile(r"^From the course$"),
    "conversation-grounding-mixed": re.compile(r"^Course \+ Ranger.s knowledge$"),
    "conversation-grounding-general": re.compile(r"^Ranger.s general knowledge"),
    "conversation-triage-decline": re.compile(
        r"^(Here for you|Not something I coach|Hard line|One for the professionals"
        r"|Rules vary by place|Ride with your supervisor|Still Ranger"
        r"|Trail boundary)$"
    ),
}
TUTOR_TURN_STATES = set(TUTOR_TURN_MARKS) | {"offline-mode-header"}

# Put the named turn just under the top of the message list: its grounding
# label, answer and source chips all in frame, with the question it answers
# still tailing in above it. The list only scrolls internally when the shell
# is height-locked; when the document scrolls instead, fall back to the
# ancestor that does scroll.
FRAME_TURN = """(el) => {
  const turn = el.closest('.group') || el;
  const list = el.closest('.overflow-y-auto');
  if (list && list.scrollHeight > list.clientHeight + 1) {
    const delta = turn.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop = Math.max(0, list.scrollTop + delta - 96);
    return;
  }
  turn.scrollIntoView({ block: 'center' });
}"""

LIST_TOP = """() => {
  window.scrollTo(0, 0);
  const lists = [...document.querySelectorAll('.overflow-y-auto')];
  const list = lists.find((el) => el.scrollHeight > el.clientHeight);
  if (list) list.scrollTop = 0;
}"""


def pin_health_provider(page: Page, provider: str) -> None:
    """Pin GET /meta/health's `provider` for the shot, then reload so the
    header renders under it.

    The badge is the only thing that reads the field (TutorChat; OfflineBanner
    only pings health for reachability), and it is the whole subject of
    offline-mode-header — yet the crawl env decided it for every tutor state
    at once, so pass-9 shot "Ranger is in offline mode" on all nine desktop
    tutor frames and never captured the online header at all. Pinning makes
    each header the one its state name claims, in either env. Torn down in
    post_state_cleanup.
    """

    def fulfill(route):  # noqa: ANN001
        try:
            body = route.fetch().json()
        except Exception:  # noqa: BLE001 — health really is down; show the truth
            route.continue_()
            return
        body["provider"] = provider
        route.fulfill(
            status=200, content_type="application/json", body=json.dumps(body)
        )

    page.unroute("**/api/meta/health")
    page.route("**/api/meta/health", fulfill)
    page.reload()
    page.wait_for_load_state("networkidle")


def drive_tutor_turn(page: Page, name: str) -> None:
    """Frame the seeded turn that IS this state, under the header it names.

    Five conversation states, one seeded thread: shooting the route unchanged
    produced five byte-identical files per breakpoint (pass-9: 8 of 27
    assigned files were duplicates, so grounding-general, grounding-mixed and
    the triage decline were never actually verified). Scrolling the message
    list to the turn carrying that state's grounding label — or, for the
    offline header, to the top of the thread — makes every frame evidence of
    its own state.
    """
    try:
        pin_health_provider(
            page, "extractive" if name == "offline-mode-header" else "anthropic"
        )
        mark = TUTOR_TURN_MARKS.get(name)
        if mark is None:  # offline-mode-header: the header is the subject
            page.evaluate(LIST_TOP)
            page.wait_for_timeout(300)
            return
        label = page.get_by_text(mark).first
        try:
            label.wait_for(timeout=8000)
        except PWTimeout as exc:
            raise LookupError(f"SKIP: no seeded turn labelled for {name}") from exc
        label.evaluate(FRAME_TURN)
        page.wait_for_timeout(300)
    except Exception:  # a failed state must not leave the pin on the next one
        page.unroute("**/api/meta/health")
        raise


# ── Account drives ───────────────────────────────────────────────────────────


def drive_delete_modal(page: Page) -> None:
    """Open the delete dialog with the document parked at the top.

    Playwright scrolls an element into view before clicking it, and /account
    is taller than the viewport — so the old click left the page 208px down
    and the frame painted the sticky header and the fixed scrim at that
    offset (pass-9: the header floating over the Display-name card, a 208px
    un-dimmed strip above the scrim). A DOM click needs no scroll, so the
    modal is judged over a page that is actually dimmed.
    """
    page.evaluate("() => window.scrollTo(0, 0)")
    trigger = page.get_by_role("button", name=re.compile("delete account", re.I)).first
    trigger.wait_for(timeout=5000)
    trigger.evaluate("(el) => el.click()")
    page.get_by_text("Delete your account?").wait_for(timeout=5000)
    page.wait_for_timeout(300)  # scrim fade + 0.96→1 content scale settle


# ── Cross-cutting drives (QA-001 §crawl items 3/5) ───────────────────────────


# Capture-only: park the document at the top and drop every sticky/fixed
# element into normal flow, remembering the inline position so it can be put
# back. Computed position is the only reliable test — a class name is not.
UNSTICK_CHROME = """() => {
  window.scrollTo(0, 0);
  const touched = [];
  for (const el of document.querySelectorAll('body *')) {
    const pos = getComputedStyle(el).position;
    if (pos === 'sticky' || pos === 'fixed') {
      touched.push([el, el.style.getPropertyValue('position'),
                    el.style.getPropertyPriority('position')]);
      el.style.setProperty('position', 'static', 'important');
    }
  }
  window.__tsUnstuck = touched;
  return touched.length;
}"""

RESTICK_CHROME = """() => {
  for (const [el, value, priority] of window.__tsUnstuck || []) {
    if (value) el.style.setProperty('position', value, priority);
    else el.style.removeProperty('position');
  }
  window.__tsUnstuck = null;
}"""

# Any visible fixed element covering the viewport: a modal scrim, the section
# interstitial, a mobile bottom sheet's scrim. Nothing decorative in the app
# is fixed-and-full-bleed, so this only fires on a real overlay.
OVERLAY_OPEN = """() => {
  const vw = window.innerWidth, vh = window.innerHeight;
  return [...document.querySelectorAll('body *')].some((el) => {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' || s.visibility === 'hidden') return false;
    if (Number(s.opacity) < 0.05) return false;
    const r = el.getBoundingClientRect();
    return r.width >= vw * 0.9 && r.height >= vh * 0.9;
  });
}"""


def shoot(page: Page, path: Path, full_page: bool) -> None:
    """Capture one frame — honestly.

    Full-page is the crawl's default and Chromium paints sticky/fixed chrome
    into it at the current scroll offset, so the frame becomes document +
    floating chrome on top of real content (pass-9: the lesson action bar hid
    an answer option in 12 of 24 lesson shots; the /account header floated
    over the Display-name card at the click's scroll offset). Full-page frames
    therefore shoot the DOCUMENT: scrolled to the top, chrome in normal flow,
    restored right after. Viewport frames are untouched — that is where the
    chrome is judged.

    An open full-screen overlay downgrades the frame to viewport size even if
    the state was never listed in VIEWPORT_SHOTS: a full-page overlay capture
    is a hybrid of two states and judges neither.
    """
    if full_page and page.evaluate(OVERLAY_OPEN):
        full_page = False
    if not full_page:
        page.screenshot(path=str(path), full_page=False)
        return
    page.evaluate(UNSTICK_CHROME)
    page.wait_for_timeout(120)  # reflow settles before the shutter
    try:
        page.screenshot(path=str(path), full_page=True)
    finally:
        page.evaluate(RESTICK_CHROME)


def cc_loading_skeletons(page: Page, base: str, route: str, out: Path) -> None:
    """Stall the page's data queries (auth/meta exempt so the shell resolves);
    react-query keeps them pending through retries — the 150ms-delayed
    layout-shaped skeletons (DESIGN-005) hold the frame for the shot."""

    def stall(r):  # noqa: ANN001
        url = r.request.url
        if "/api/auth/" in url or "/api/meta/" in url:
            r.continue_()
        # anything else: hold (never fulfilled; page gets reloaded after)

    page.route("**/api/**", stall)
    try:
        page.goto(base + route, wait_until="commit")
        page.wait_for_function(
            """() => [...document.querySelectorAll("[aria-busy='true']")]
                 .some((el) => el.getAttribute('aria-label') !== 'Checking your session')""",
            timeout=15000,
        )
        page.wait_for_timeout(400)  # past the 150ms anti-flash delay + shimmer
        shoot(page, out, full_page=False)
    finally:
        page.unroute("**/api/**")


def cc_error_toast(page: Page, base: str, route: str, out: Path) -> None:
    """Kill one API mutation mid-session: the logout POST 500s and the
    DESIGN-005 toast (incident id fine print) slides in top-right."""
    page.goto(base + route)
    page.wait_for_load_state("networkidle")
    envelope = {
        "error": {
            "code": "server_error",
            "message": "Something broke on our side.",
            "incidentId": "SLA-2481",
        }
    }
    page.route(
        "**/api/auth/logout",
        lambda r: r.fulfill(
            status=500, content_type="application/json", body=json.dumps(envelope)
        ),
    )
    try:
        page.get_by_role("button", name=re.compile("^Account menu")).click()
        page.get_by_role("button", name=re.compile("log ?out", re.I)).click()
        page.get_by_text("Something broke on our side.").wait_for(timeout=5000)
        # Close the user-menu popover with an outside click on the greeting —
        # Escape targets the focused toast first and dismisses IT (pass-4 bug).
        page.locator("h1").first.click()
        page.wait_for_timeout(350)
        shoot(page, out, full_page=False)
    finally:
        page.unroute("**/api/auth/logout")


def cc_offline_banner(page: Page, base: str, route: str, out: Path) -> None:
    page.goto(base + route)
    page.wait_for_load_state("networkidle")
    page.context.set_offline(True)
    try:
        page.get_by_text("You're offline.").wait_for(timeout=5000)
        page.wait_for_timeout(250)
        shoot(page, out, full_page=False)
    finally:
        page.context.set_offline(False)
        page.wait_for_timeout(300)


def cc_focus_visible(page: Page, base: str, route: str, out: Path) -> None:
    """Tab into the shell nav so the 2px pine focus ring is on film."""
    page.goto(base + route)
    page.wait_for_load_state("networkidle")
    for _ in range(3):
        page.keyboard.press("Tab")
        page.wait_for_timeout(120)
    shoot(page, out, full_page=False)


CROSS_CUTTING = {
    "loading-skeletons": cc_loading_skeletons,
    "error-toast": cc_error_toast,
    "offline-banner": cc_offline_banner,
    "focus-visible-tab-through": cc_focus_visible,
}


# ── State dispatch ───────────────────────────────────────────────────────────


def drive_state(page: Page, base: str, route: str, state: dict, key: dict[str, str]) -> None:
    """Push the page into the named state. Extend as screens land."""
    name = state["state"]

    if name == "checkpoint-wrong-answer-feedback":
        return drive_mc_wrong(page, base, state)
    if name == "sort-wrong-drop-feedback":
        return drive_sort_wrong(page, base, state)
    if name == "prediction-locked-revealed":
        return drive_prediction_locked(page, base, state)
    if name.startswith("renderer-") and "stepId" in state:
        return reach_step(page, base, state)
    if name == "section-interstitial":
        return drive_section_interstitial(page)
    if name == "lesson-complete":
        return drive_lesson_complete(page)

    if name == "invalid-credentials":
        page.get_by_label(re.compile("email", re.I)).fill("nobody@crawl.test")
        page.get_by_label(re.compile(r"^password$", re.I)).fill("wrong-pass")
        page.get_by_role("button", name=re.compile("log ?in", re.I)).click()
        page.get_by_text("That email and password don't match.").wait_for(timeout=5000)
        return
    if name == "rate-limited":
        return drive_rate_limited(page, base)
    if name == "validation-errors":
        return drive_register_validation(page)
    if name == "duplicate-email":
        return drive_register_duplicate(page)

    if name == "with-data":
        # /instructor requires INSTRUCTOR_EMAILS to include the fixture; without
        # it the route renders the designed 403 and the shot is a false green.
        # Assert arrival on a screen-unique string so a bad env lands as
        # ok:false in run-log.json instead of a silent wrong-screen capture.
        page.get_by_text("Course overview").wait_for(timeout=5000)
        return

    if name == "scrolled-modules":
        page.evaluate(
            "document.getElementById('trail-heading')"
            "?.scrollIntoView({block: 'start'})"
        )
        page.wait_for_timeout(400)
        return
    if name == "scrolled-tutor-teaser":
        page.evaluate(
            "document.getElementById('ranger-heading')"
            "?.scrollIntoView({block: 'start'})"
        )
        page.wait_for_timeout(400)
        return

    if name == "print-preview":
        # Certificate under print styles (.ts-print-sheet / @media print).
        page.emulate_media(media="print")
        page.wait_for_timeout(300)
        return

    if name == "in-progress":
        return drive_attempt_in_progress(page, key)
    if name == "results-pass":
        return drive_scripted_attempt(page, key, passing=True)
    if name == "results-fail-interstitial":
        become_examinee(page, base)
        page.goto(f"{base}/assessment")
        page.wait_for_load_state("networkidle")
        return drive_scripted_attempt(page, key, passing=False)

    if name == "asking-typing-bubble":
        return drive_typing_bubble(page)
    if name == "long-history-scroll":
        return drive_history_scroll(page)
    if name in TUTOR_TURN_STATES:
        return drive_tutor_turn(page, name)

    if name == "delete-confirm-modal":
        return drive_delete_modal(page)
    # Unknown states without params: screenshot the default render — the
    # reviewer decides whether that satisfies the state or files a gap.


def post_state_cleanup(page: Page, name: str) -> None:
    if name == "asking-typing-bubble":
        cleanup_typing_bubble(page)
    if name == "print-preview":
        page.emulate_media(media="screen")
    if name in TUTOR_TURN_STATES:
        # Never let a pinned provider leak into the next state's header.
        page.unroute("**/api/meta/health")


# ── Main crawl ───────────────────────────────────────────────────────────────


def crawl(base: str, manifest_path: Path, out_root: Path) -> int:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    answer_key = load_answer_key()
    run_dir = out_root / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir.mkdir(parents=True)
    log, shot_count, skips = [], 0, 0

    mobile_routes = {
        r
        for cc in manifest.get("crossCutting", [])
        if cc.get("viewport") == "mobile"
        for r in cc["routes"]
    }
    # Mobile first: fresh@'s first-run states shoot before desktop deep drives
    # write evidence into the fixture (QA-001 fixture discipline).
    viewports = sorted(
        manifest["viewports"], key=lambda v: 0 if v["name"] == "mobile" else 1
    )

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for vp in viewports:
            # Reduced motion is mandatory (DESIGN-004 §Performance): full-page
            # capture never scrolls, so IntersectionObserver reveals would ship
            # as opacity-0. This forces every settled end state.
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                reduced_motion="reduce",
            )
            page = context.new_page()
            current_fixture = None

            def ensure_fixture(email: str) -> None:
                nonlocal current_fixture
                if email != current_fixture:
                    login(page, base, email)
                    current_fixture = email

            for section in ("public", "app"):
                for entry in manifest[section]:
                    route = entry["route"]
                    for state in entry["states"]:
                        sdict = state if isinstance(state, dict) else {"state": state}
                        name = sdict["state"]
                        resolved = resolve_route(route, sdict)
                        if vp["name"] == "mobile" and not (
                            route in mobile_routes or resolved in mobile_routes
                        ):
                            continue
                        try:
                            if section == "app":
                                fixture = manifest["fixtures"][sdict.get("fixture", "mid")]
                                ensure_fixture(fixture["email"])
                            page.goto(base + resolved)
                            page.wait_for_load_state("networkidle")
                            drive_state(page, base, route, sdict, answer_key)
                            fn = f"{vp['name']}--{slug(route) or 'root'}--{slug(name)}.png"
                            shoot(page, run_dir / fn, full_page=name not in VIEWPORT_SHOTS)
                            shot_count += 1
                            log.append({"route": route, "state": name,
                                        "viewport": vp["name"], "file": fn, "ok": True})
                            post_state_cleanup(page, name)
                            if name in RESETS_SESSION:
                                current_fixture = None
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

            # Cross-cutting states (desktop only; mobile-set handled above).
            if vp["name"] == "desktop":
                for cc in manifest.get("crossCutting", []):
                    handler = CROSS_CUTTING.get(cc["state"])
                    if handler is None:
                        continue
                    for route in cc["routes"]:
                        try:
                            if route != "/login":  # app-shell targets need a login
                                ensure_fixture(manifest["fixtures"]["mid"]["email"])
                            fn = (
                                f"{vp['name']}--{slug(route) or 'root'}--"
                                f"{slug(cc['state'])}.png"
                            )
                            handler(page, base, route, run_dir / fn)
                            shot_count += 1
                            log.append({"route": route, "state": cc["state"],
                                        "viewport": vp["name"], "file": fn, "ok": True})
                        except Exception as e:  # noqa: BLE001
                            skips += 1
                            log.append({"route": route, "state": cc["state"],
                                        "viewport": vp["name"], "ok": False,
                                        "error": f"{type(e).__name__}: {e}"})
            context.close()
        browser.close()

    (run_dir / "run-log.json").write_text(json.dumps(log, indent=2))
    print(f"[crawl] {shot_count} screenshots, {skips} skipped/failed -> {run_dir}")
    print("[crawl] NOW OPEN AND REVIEW EVERY PNG (QA-001). The crawl is the")
    print("[crawl] camera; the review is the QA. Log findings in artifacts/crawl/.")
    return 0 if shot_count else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://localhost:4173")
    ap.add_argument("--manifest", default=str(REPO_ROOT / "qa" / "route-manifest.json"))
    ap.add_argument("--out", default=str(REPO_ROOT / "qa" / "crawl-runs"))
    a = ap.parse_args()
    sys.exit(crawl(a.base, Path(a.manifest), Path(a.out)))
