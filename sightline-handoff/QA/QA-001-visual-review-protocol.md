# QA-001 — Visual Review Protocol (the primary quality instrument)

The crawl exists because "the login page looks fine" has fooled every rushed
project ever. We verify EVERY route, in EVERY meaningful state, at TWO widths,
REPEATEDLY, and we LOOK at the pictures.

## The crawl

Tooling: `web/e2e/visual-crawl.spec.ts` (adapt `STARTER/visual_crawl.py`'s
logic to Playwright TS, or run the Python script directly — either is fine;
manifest-driven either way). Inputs: `STARTER/route-manifest.json` copied into
the repo and kept current with SPEC-010.

Per manifest entry the crawl:
1. Seeds/uses the right fixture account (see §Fixtures).
2. Navigates, waits for network-idle + no skeletons.
3. Performs the entry's `interactions` script (clicks/typing to reach deep
   states — e.g., answer MC wrong to capture not-best feedback).
4. Screenshots desktop 1440×900 and mobile 375×812, full page, into
   `artifacts/crawl/<pass-N>/<route-id>--<state>--<width>.png`.
5. Also captures one `:focus-visible` tab-through shot per shell (nav focus
   states) and the toast/error states by triggering them (kill-API flag).

## Fixtures (created by a seed script `server/app/services/fixtures.py`)
- `fresh@crawl.test` — brand-new account (first-run states).
- `mid@crawl.test` — Modules 1–2 complete, mid-Module-3, 2 journal drafts,
  340 XP, a 12-message tutor history covering all grounding types + one triage.
- `grad@crawl.test` — everything complete, certificate issued.
- Fixture creation is a dev-only endpoint/flag, excluded in prod builds.

## The review (the part that cannot be skipped)
After each crawl pass, the Design QA lane **opens and inspects every image**
against DESIGN-006, and records findings in `artifacts/crawl/<pass-N>/REVIEW.md`:

```
## dashboard--midcourse--desktop
- P1: Continue card art missing (slot label showing)
- P2: XP list rows misaligned to grid (icons 18px, spec 20px)
- P3: greeting comma spacing
```

Severity: **P1** = breaks the finished-product illusion (blank/unstyled/broken/
placeholder/default UI/data leak); **P2** = polish miss (spacing, wrong token,
inconsistent icon, weak state); **P3** = nit. Fix P1+P2 before the next pass;
batch P3s.

## Cadence & exit
- Wave 0 exit: pass 1 (shells) — expect many findings; that's the point.
- Wave 1 exit: pass 2 (module 1 deep states + tutor).
- Wave 2 exit: pass 3 (full matrix).
- Wave 3: iterate passes until one FULL pass yields **zero P1 and zero P2**.
  Two-pass minimum in wave 3 even if pass 1 looks clean (it won't).
- Fixes go into the component system first (AGENT_OPERATIONS §fix-forward).

## Traversal audit (monthly-drift killer, run in wave 3)
Beyond screenshots: click every nav item, every card, every chip, every source
chip, every footer link on every page in the manifest; any dead link, wrong
destination, or console error is a P1. Record as a checklist appendix in the
final REVIEW.md.
