"""Regression guard: 'The short list' must open sealed, numbered and pulsing.

Run against a running stack (the Docker one is fine — no extra server needed):

    python qa/check_shortlist_presentation.py http://localhost:8080

Why this exists
---------------
m1-l1-s3 renders through two presentations. The one it was designed and signed
off around is the REVIEW read: six clay-sealed medallions, each carrying a
numbered blaze, the unopened ones pulsing. The other is a SPOT hunt that paints
the plate bare — no seals, no numbers, no clay — so the learner can look for
the marks unaided.

The hunt is a legitimate mode, but as the *default* it is indistinguishable
from the step having lost its artwork, and it only ever appeared for accounts
with no saved progress. That made it invisible during development (where the
tester always has progress) and glaring right after deleting an account. It is
now opt-in per step via `spotFirst` in the payload.

This registers a genuinely fresh account, walks to the step and asserts the
first impression. Exit code 1 on any failure.
"""

import asyncio
import sys
import time

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
LESSON = "m1-l1-why-riders-crash"
STEP = "m1-l1-s3"
EXPECTED_MARKERS = 6


async def run() -> list[str]:
    failures: list[str] = []
    email = f"qa-shortlist-{int(time.time())}@check.test"

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1600, "height": 1200})
        page = await ctx.new_page()

        # A brand-new account is the whole point: the bug was invisible to any
        # account that already had progress on this step.
        await page.goto(f"{BASE}/register", wait_until="networkidle")
        await page.get_by_label("Display name").fill("QA Rider")
        await page.get_by_label("Email").fill(email)
        await page.get_by_label("Password", exact=True).fill("qa-shortlist-pass-1")
        await page.click('button[type="submit"]')
        try:
            await page.wait_for_url("**/dashboard", timeout=25000)
        except Exception:
            await browser.close()
            return [f"could not register a fresh account (stuck at {page.url})"]

        await page.goto(f"{BASE}/learn/{LESSON}", wait_until="networkidle")
        await page.wait_for_timeout(1800)

        async def step_id() -> str | None:
            return await page.evaluate(
                "()=>{const e=document.querySelector('[data-step-id]');"
                "return e?e.getAttribute('data-step-id'):null}"
            )

        for _ in range(8):
            if await step_id() == STEP:
                break
            cont = page.get_by_role("button", name="Continue", exact=True)
            if await cont.count() == 0:
                break
            if await cont.is_disabled():
                radio = page.get_by_role("radio", name="Mechanical failure")
                if await radio.count():
                    await radio.click()
                    await page.wait_for_timeout(1200)
            await cont.click()
            try:
                await page.locator('[aria-label^="Next section"]').click(timeout=1800)
            except Exception:
                pass
            await page.wait_for_timeout(1400)

        if await step_id() != STEP:
            await browser.close()
            return [f"never reached {STEP}"]

        body = await page.evaluate("() => document.body.innerText")
        markers = await page.locator('button[aria-label^="Waypoint"]').count()
        rings = await page.evaluate(
            """() => {
                const out = [];
                document.querySelectorAll('.ts-hotspot-ring').forEach((n) => {
                    const cs = getComputedStyle(n);
                    out.push({name: cs.animationName, state: cs.animationPlayState});
                });
                return out;
            }"""
        )
        numbers = await page.evaluate(
            """() => {
                const seen = new Set();
                document.querySelectorAll('button[aria-label^="Waypoint"]').forEach((el) => {
                    const t = (el.innerText || '').trim();
                    if (/^[1-6]$/.test(t)) seen.add(t);
                });
                return [...seen].sort();
            }"""
        )

        if "Reveal the rest" in body:
            failures.append("opened on the SPOT hunt — the bare, unsealed plate")
        if markers != EXPECTED_MARKERS:
            failures.append(f"expected {EXPECTED_MARKERS} waypoint markers, found {markers}")
        pulsing = [r for r in rings if r["name"] == "ts-hotspot-pulse" and r["state"] == "running"]
        if len(pulsing) != EXPECTED_MARKERS:
            failures.append(
                f"expected {EXPECTED_MARKERS} pulsing clay rings, found {len(pulsing)} "
                f"(raw: {rings})"
            )
        if len(numbers) != EXPECTED_MARKERS:
            failures.append(f"expected numbers 1-6 on the markers, found {numbers}")

        await browser.close()
    return failures


def main() -> int:
    failures = asyncio.run(run())
    print()
    if failures:
        print("FAIL — 'The short list' first impression has regressed:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a fresh account sees six sealed, numbered, pulsing medallions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
