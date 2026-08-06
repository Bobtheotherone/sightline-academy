# QA-004 Launch Checklist — final gate walk

Walked 2026-08-06 (Wave 3, launch-checklist lane) against live stacks:
dev = API :8023 (FIXTURES=1, fresh scratch DATA_DIR, extractive) + vite :5183;
prod = `docker compose -f ops/docker-compose.yml` on :8080 (the cold-boot stack,
`.env` from `.env.example`, no ANTHROPIC_API_KEY). Live drives ran as throwaway
Playwright scripts in the session scratchpad (QA-003: no new repo tests).
Companion AC-by-AC evidence: `artifacts/launch/SPEC-001-acceptance.md`.

## Product

- [x] **All SPEC-001 P0 + P1 ACs verified** — walked individually in
      `artifacts/launch/SPEC-001-acceptance.md`; every P0/P1 AC verified (live
      this session, or cited to a green wave-3 run with the artifact named).
- [x] **All 6 modules playable start→finish; all 12 renderers exercised by real
      curriculum instances** — W2 course-verify played M2–M5 twice end-to-end and
      M6 + capstone with real prefills (BUILDLOG W2), M1 played in W1 and nightly
      by J1; J2 completes m1–m6 through the sanctioned dev helper + real sort +
      capstone; crawl pass 5 has all renderer deep-states on film (92/92, zero
      skips); the 12 renderer types = the 12 directories under `web/src/activities/`.
- [x] **Final assessment + certificate + /verify round-trip** — J3 drives
      fail (<80%) → review interstitial → pass → certificate; live this session:
      `GET /api/verify/1F1AM5KCHM` → `valid:true` / `Grad Crawler`, garbage code →
      designed `valid:false`; traversal audit verified certificate page → public
      verify page renders "This certificate is genuine".
- [x] **Ranger passes the six SPEC-008 acceptance questions on BOTH providers** —
      *extractive verified; anthropic path code-verified, requires
      ANTHROPIC_API_KEY at deploy.* All six run live against :8023 this session:
      Q1 curriculum/2 chips/correct T-CLOC expansion; Q2 labels `mixed` (BUILDLOG
      W1 settled deviation — corpus water-crossings chunk is genuinely relevant),
      risk-aware, no refusal; Q3 curriculum, substantive pavement physics; Q4
      triage decline + why + pivot; Q5 friendly steer, not a refusal wall (in
      extractive mode the designed offline no-match steer stands in for the
      anthropic general-knowledge answer); Q6 playful decline, stays Ranger.
      Anthropic provider (`server/app/tutor/providers.py`: direct Messages API,
      streaming + non-streaming) is code-verified and smoke-covered; no key was
      available in this environment.
- [x] **Field Journal: all six artifacts creatable; capstone prefills work** —
      J1 creates risk_profile through the builder UI; J2 creates the other five
      via honest evidence writes then verifies all 5 "Pulled from your …"
      prefills inside the live Ride Plan builder; traversal audit opened all six
      artifact pages for grad@ plus every "Edit in the lesson" deep link.

## Quality

- [x] **Final crawl pass: zero P1/P2 across full matrix; REVIEW.md archived** —
      pass 5 (run `qa/crawl-runs/20260806-075623`, 92 shots, 0 skips) reviewed
      image-by-image: zero P1, zero P2, zero new P3; second consecutive
      product-clean full pass. Archived at `artifacts/crawl/pass-5/REVIEW.md`.
- [x] **Traversal audit complete; zero dead links; zero console errors** —
      QA-001 §Traversal run against the live FIXTURES stack as public + mid@ +
      grad@: 90 page visits, ~120 link-destination checks, 0 dead links, 0 wrong
      destinations, 0 JS/console errors (the /api/auth/me 401 and /api/certificate
      404 network-log rows are designed status probes — see the REVIEW.md appendix).
- [x] **J1–J3 + smoke green in CI-like run** — wave-3 journeys lane:
      J1–J3 green in 15.8s with zero retries (`web/e2e/journeys.spec.ts`),
      API smoke = 31 table rows incl. SSE frames + 429; pytest re-run at this
      lane's close: 90 passed in 12.5s (tsc 0, eslint 0, ruff clean alongside).
- [x] **Lighthouse ≥85 perf desktop on /dashboard and one lesson; initial JS
      ≤350KB gz** — quality-gates lane (prod build): landing 100, dashboard 100
      (after the SkeletonGroup CLS fix, 0.246 → 0.001), lesson 99; initial JS
      /login 126.07 KB gz, /dashboard 143.78 KB gz vs the 350 KB budget.
- [x] **Keyboard-only pass + reduced motion** — quality-gates lane: full
      register → dashboard → M1 L1 content+prediction → Ranger slide-over →
      ask → close journey on keys alone, visible focus on all 57 stops (slide-over
      close now returns focus to its trigger); reduced-motion walk showed every
      animation at 0.01ms across sort, interstitial, and a genuine 700-XP level-up.

## Ops

- [x] **Clean-machine cold boot per SPEC-012 in ≤10 min, extractive keyless** —
      the cold-boot compose stack from the documented steps is live on :8080 and
      the SPEC-012 acceptance flow passed against it this session: register →
      Module 1 lesson renders → tutor answers T-CLOC in extractive mode with the
      offline badge, all keyless. Timing evidence: image layers built 12:14–12:16,
      containers up 12:18, api healthy ≈12:19 local (embedding model baked at
      image build; base-image pulls were cached on this machine). One defect
      found and fixed: the web container sat "unhealthy" because busybox wget
      resolves `localhost` → `::1` while our nginx listened IPv4-only —
      `listen [::]:80;` added to `ops/nginx.conf`; both containers now report
      healthy.
- [x] **/api/meta/health accurate in both provider modes** — extractive verified
      live on :8023 and :8080 (`status ok / db ok / chroma.docs 33 /
      provider extractive / version = content hash`); anthropic mode
      code-verified: `provider` flips on key presence (`config.Settings.provider`),
      and the smoke covers health shape; `status degraded` when chroma is empty
      (BUILDLOG W1). No key available here to boot the anthropic mode live.
- [x] **.env.example complete; README documents dev, prod, backup, TLS recipe,
      deferred list** — `.env.example` matches SPEC-012 §Configuration line for
      line; README covers dev, prod compose, verify, backup/restore, the Caddy
      TLS recipe, and the post-launch deferred list (password reset, email
      verification, Postgres path, 3D lab stretch, and three more); a
      "Verification artifacts" section was added this session.
- [x] **Secrets absent from repo/logs; cookies Secure in prod mode; security
      headers present** — repo-wide grep: no `sk-ant-*`, no hard-coded API keys;
      `.env` is gitignored and its SESSION_SECRET appears in no server log
      (dev, crawl, and container logs grepped). Cookies: with SECURE_COOKIES=1
      the session cookie is `HttpOnly; SameSite=lax; Secure` (verified live
      against a prod-mode boot); the compose stack currently runs
      SECURE_COOKIES=0 only because it serves plain http://localhost:8080 —
      the README documents 1 as the default behind TLS. Headers via
      `curl -I localhost:8080`: `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, CSP with
      `frame-ancestors 'none'`, `server_tokens off`.
- [x] **BUILDLOG.md reflects all deviations; SPEC files updated where contracts
      changed** — deviations logged one line each through all four waves;
      SPEC-004 updated twice in-repo under the contract-discipline rule (flat
      per-user module fields; `sourceRefs` on `TutorMessageOut`). The orchestrator
      wrote the wave-3 close-out entries this lane was blocked on: pass-5 exit
      verdict + traversal audit, the quality-gates fixes (CLS skeleton,
      slide-over focus return, preview proxy), the torch CPU-wheel pin, this
      lane's nginx dual-stack fix, cold-boot acceptance, and the final
      Definition-of-Done line.

## Post-walk: adversarial verification round

After this walk, four independent skeptics were run against the done-claims with
instructions to falsify rather than confirm. Budget/NON-GOALS compliance and
content fidelity came back CONFIRMED; the keyless and learner-journey claims came
back PARTIAL. Seven defects were found and all seven fixed and re-observed
(BUILDLOG 2026-08-06 W3 [fix] entries): the Dashboard Continue card pointing
backwards at a completed step; the keyless tutor's zero-chunk refusal shape
(ADR-005); the api container's inability to boot without network; the
lesson-not-found illustration; the inert authored `passPct`; the lesson-complete
XP heading over-claiming; and the smoke fixture's leaked scratch dirs. Crawl
pass 6 (artifacts/crawl/pass-6/REVIEW.md) reconfirms zero P1/P2 across the full
92-state matrix afterwards, with J1–J3, pytest 90, and all four gates green.

## Fixes made during this walk

1. `ops/nginx.conf` — added `listen [::]:80;` (dual-stack): the web container's
   healthcheck (`wget http://localhost/healthz`) resolved to `::1`, got
   connection refused, and marked the container permanently unhealthy even
   though serving was fine on IPv4. Verified healthy after rebuild.
2. `README.md` — added the "Verification artifacts" section (below); no other
   README gaps found — dev/prod/backup/TLS/deferred/design notes were already
   accurate against SPEC-012.
