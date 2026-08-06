# SPEC-001 acceptance walk — R1..R9, every P0 + P1 AC

Walked 2026-08-06 (launch-checklist lane). "Live" = driven this session by a
throwaway Playwright/curl harness in the session scratchpad (QA-003 forbids new
repo tests) against dev (vite :5183 → API :8023, FIXTURES=1, fresh scratch
DATA_DIR, extractive) and/or prod (compose stack, :8080). "Cited" = verified by
a named wave-3 artifact or green automated run. P2 rows included for
completeness; only P0/P1 gate launch.

| REQ | Pri | AC (compressed) | Status | Evidence |
|---|---|---|---|---|
| R1.1 | P0 | Register → session → Dashboard w/ name; duplicate email inline error + login link; weak password hint | VERIFIED (live, prod :8080) | Registered `coldboot-*@launch.test`; dashboard greets display name. Duplicate → inline "already has an account" + log-in link. 6-char password → inline ≥10 hint, stays on /register. |
| R1.2 | P0 | Second browser login restores exact position; Continue deep-links to exact step | VERIFIED (live) | Two separate Chromium instances as mid@: both Continue cards → `/learn/m3-l2-head-to-toe?step=m3-l2-s1`; click lands with `data-step-id="m3-l2-s1"` on stage. |
| R1.3 | P0 | 8 failed logins/IP per 5 min → 429 for 10 min, friendly UI copy | VERIFIED (live API) | 9 bad logins from spoofed X-Forwarded-For 203.0.113.77: attempts 1–8 → 401, attempt 9 → 429 `rate_limited`. UI copy on film in crawl pass 5 (rate-limit state); smoke covers 429 row. |
| R1.4 | P0 | Unauthed → authed route redirects to Login preserving destination | VERIFIED (live, prod) | Logged-out `/progress` → `/login`; after login, landed back on `/progress`. |
| R1.5 | P0 | Account page: name edit, password change, JSON export, delete w/ typed confirm | VERIFIED (live) | Export → 200 JSON containing the account email. Delete: typed-email confirm ("Type your email to confirm" → "Delete forever") → logged out; re-login rejected with designed inline error. Name/password edit forms exercised by smoke (auth rows) + crawl account states. |
| R2.1 | P0 | Course map: 6 modules, progress, locked/unlocked, est. minutes; N+1 unlock; designed locked state | VERIFIED (cited + live) | Traversal audit: locked m4–m6 cards not dead links; direct visit to locked module → designed locked page pointing at the correct unlock target ("Go to Gear Up"). Crawl pass 5 course-map states for both fixtures. J2 proves module-order unlocking through the real completion machinery. |
| R2.2 | P0 | Lesson arc Briefing→…→Checkpoint, progress rail, step-level resume | VERIFIED (cited + live) | J1 plays the full arc of M1 incl. checkpoint; live: mid@ frontier lesson opens at `m3-l2-s1` with rail; R1.2/R2.3 prove step-granular resume. |
| R2.3 | P0 | Evidence persists immediately; hard-refresh mid-lesson → same step, prior inputs | VERIFIED (live) | Mid-lesson hard reload on `/learn/m3-l2-head-to-toe` returns to the same step (`m3-l2-s1` → `m3-l2-s1`); journal builder reopened via `?edit=1` shows prior content in fields (grad@ gear_card); J1 waits on the real evidence PUT. |
| R2.4 | P0 | Lesson complete → XP events + next action | VERIFIED (cited) | J1 asserts "Lesson complete" + itemized "XP earned" + "+N XP this lesson" + next-action links (next lesson / journal / checkpoint) for three M1 lessons. |
| R2.5 | P0 | Review mode: reopen completed lessons, prior answers visible, re-attemptable, completion kept | VERIFIED (live) | grad@ deep-linked into completed sort step: all 7 cards shown placed, "All sorted". Re-attempt via journal `?edit=1` edit (field edited and saved); `/api/course` completion fields byte-identical before/after. Solved knowledge checks lock by design (retry-until-best found). |
| R2.6 | P1 | Module-complete moment worth a screenshot | VERIFIED (cited) | J2 hits the module moment on M6; crawl pass 5 module-complete-badge state on film; W2 course-verify branched the M6 copy. |
| R3.1 | P0 | All 12 SPEC-007 renderers, exact contracts, no console errors, completable | VERIFIED (cited) | 12 renderer dirs in `web/src/activities/`; crawl pass 5 has every renderer deep-state on film with zero P1/P2; traversal audit: 0 console errors across 90 page visits; W2 course-verify completed every activity instance in M1–M6 by hand. |
| R3.2 | P0 | Knowledge-check authored feedback, retry until best, first-attempt recorded | VERIFIED (cited + live) | J1 takes a wrong answer, sees authored feedback, retries to best; `firstAttemptOptionId` rides on evidence (renderer + instructor "common wrong answers" reflect it — W2 instructor verify; mid@ fixture keeps one non-first-try checkpoint for those stats). |
| R3.3 | P0 | Activities keyboard-operable; function at 375px; tap-to-assign for sort/match | VERIFIED (live + cited) | Live: fresh account at 375px w/ touch — tap-to-assign sort (m6-l2-s2) works incl. wrong-drop teaching feedback; no horizontal scroll. Keyboard: quality-gates 57-stop keyboard-only journey; crawl mobile matrix at 375px clean. |
| R4.1 | P0 | Journal step opens pre-scaffolded builder; drafts save continuously | VERIFIED (cited + live) | J1 fills the risk_profile builder and waits on the debounced PUT; live edit session re-saved gear_card fields (autosave observed via completion-stable API state). |
| R4.2 | P0 | Journal page: designed artifact cards + empty state | VERIFIED (cited) | Traversal: mid@ 3 cards, grad@ 6 cards, every card + "Edit in the lesson" link followed; crawl pass 5 journal states incl. ruled-paper empty state (fresh@). |
| R4.3 | P0 | M6 capstone surfaces prior artifacts in Ride Plan builder | VERIFIED (cited) | J2 asserts all five "Pulled from your …" prefill sources inside the live builder. |
| R5.1 | P0 | Tutor reachable everywhere: dedicated route + lesson slide-over, history per user | VERIFIED (live) | Lesson-page "Ask Ranger" opens the slide-over dialog with chat input; /tutor route in every shell (traversal); J3 proves per-user history persistence across reload. |
| R5.2 | P0 | SPEC-008 pipeline: markdown, grounding label, source chips deep-link, 2–3 suggestions | VERIFIED (live) | Q1 live: grounding=curriculum, 2 sources, 3 suggestions; traversal clicked a source chip → correct module route; markdown + labels on film in crawl tutor states. |
| R5.3 | P0 | General questions answered — never the v1 refusal wall | VERIFIED (live, extractive semantics) | Q2 (snorkel) answered risk-aware, grounding=mixed (BUILDLOG-settled deviation), no refusal; Q5 off-topic gets the friendly designed steer. True `general`-grounded free answers are the anthropic provider's; extractive honestly labels and never walls. |
| R5.4 | P0 | Safety triage before generation; authored templates | VERIFIED (live) | "teach me to do a wheelie" → grounding=triage, decline + why (failure modes) + constructive pivot; injection attempt stays Ranger. |
| R5.5 | P0 | Keyless → extractive fallback + "offline mode" note in header | VERIFIED (live, both stacks) | "Ranger is in offline mode" badge on /tutor on :5183 and :8080; extractive answers rendered. |
| R5.6 | P1 | Streaming with typing affordance where supported | VERIFIED (cited) | SSE `/tutor/ask/stream` smoke rows (extractive 10-word chunks, one meta event); W2 exit "SSE streaming frame-verified"; anthropic delta path code-verified. |
| R6.1 | P1 | XP/levels/badges per SPEC-009 on Dashboard + Progress; no forbidden signals | VERIFIED (cited) | J2 asserts earned/unearned badge states; quality-gates walked a genuine 700-XP level-up toast; crawl progress/dashboard states on film; XP events are legal-rule table driven (server tests cover the four unit targets incl. XP). |
| R6.2 | P1 | ≥80% assessment → certificate page (name, date, code, disclaimer, print CSS) + public /verify | VERIFIED (cited + live) | J3 fail→pass→certificate; crawl pass 5 includes a genuine `media: print` capture distinct from issued; live `GET /api/verify/1F1AM5KCHM` → valid:true / name / date, bad code → designed invalid. |
| R7.1 | P0 | Honest landing; only public surfaces are landing, login, register, /verify | VERIFIED (cited) | Traversal public-shell checklist: `/`, `/login`, `/register`, `/verify/:code` (valid + invalid) all designed; every other route redirects (R1.4). Crawl landing shots reviewed against DESIGN-003. |
| R8.1 | P2 | Instructor route: aggregates, no PII, CSV | BUILT & VERIFIED (cited) | Not launch-gating (P2). Traversal: grad@ (INSTRUCTOR_EMAILS) sees dashboard, CSV export 200; mid@ → designed 403. W2 verified stats reflect live journey data. |
| R9.1 | P0 | Designed loading/empty/error states on every route | VERIFIED (cited) | Crawl pass 5 full matrix: skeletons mirror real layout, designed 403/404, offline banner, rate-limit voice, empty states — zero browser-default surfaces (DESIGN-006 gallery check). |
| R9.2 | P0 | Initial JS ≤350KB gz; route splitting; Lighthouse ≥85 desktop | VERIFIED (cited) | Quality-gates on the prod build: /login 126.07 KB gz, /dashboard 143.78 KB gz; Lighthouse desktop landing 100 / dashboard 100 / lesson 99 (CLS fix landed). |
| R9.3 | P0 | Focus visible, landmarks, alt text, contrast, reduced motion | VERIFIED (cited) | Quality-gates: visible focus on all 57 keyboard stops, single banner/main + named navs on 14 routes, 26/26 SlotArt alts, zero unlabeled fields, reduced-motion walk at 0.01ms; crawl focus-visible states on film. |
| R9.4 | P0 | API errors → designed toasts/inline, human copy, never raw JSON | VERIFIED (live) | 500 envelope on a mutation → designed toast "Something broke on our side." + mono incident code; genuine route-abort on /api/progress → designed inline "The connection dropped before your miles arrived." state. |

## Notes

- Anthropic-provider rows (R5.x "with key") are code-verified + smoke-covered;
  no ANTHROPIC_API_KEY exists in this environment. First keyed deploy should
  re-run the six SPEC-008 acceptance questions manually (10 minutes).
- The two settled label deviations (Q2 `mixed`, `/verify` says "genuine") are
  BUILDLOG-recorded W1/W2 decisions, not open items.
