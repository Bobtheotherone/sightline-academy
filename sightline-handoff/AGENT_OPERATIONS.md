# AGENT OPERATIONS — Orchestration Playbook

This project is designed to be built by one orchestrator coordinating focused
work lanes (sub-agents, parallel sessions, or sequential focused passes — the
method adapts to your harness). We are *emulating* what works about
BMAD-style multi-agent development and Kiro-style spec-driven development without
any of their tooling: the specs are pre-written, the roles are pre-defined, the
handoffs are files in this repo, and the governance is one build log.

## Roles (personas a lane adopts; one agent may wear several hats sequentially)

| Role | Owns | Primary inputs |
| --- | --- | --- |
| **Orchestrator** | Wave sequencing, integration, BUILDLOG.md, final assembly | START_HERE, this file |
| **Platform** | Repo scaffold, docker-compose, server skeleton, DB, auth | ADR-001..003, SPEC-002..005 |
| **Content Loader** | Curriculum → data model transform, seed pipeline, corpus ingest | SPEC-003, SPEC-006, CURRICULUM/, RAG_CORPUS/, STARTER/ingest.py |
| **Learning UX** | All learner-facing screens & activity renderers | SPEC-006, SPEC-007, SPEC-010, DESIGN/* |
| **Tutor** | RAG pipeline, safety triage, tutor UI | SPEC-008, STARTER/tutor_* , STARTER/safety_policy.json |
| **Design QA** | Visual crawl, polish passes, anti-generic rubric enforcement | QA-001, DESIGN-006, STARTER/visual_crawl.py |
| **Journey QA** | E2E journeys, API smoke, launch checklist | QA-002, QA-004 |

## Build waves

Waves are integration checkpoints, not bureaucracy. Inside a wave, lanes run in
parallel wherever their file surfaces don't collide (the monorepo layout in
ADR-002 was chosen to make collisions rare: `/server`, `/web`, `/content`, `/ops`
are independent surfaces).

### Wave 0 — Foundation (Platform lane, solo)
- Scaffold monorepo per ADR-002. Working `docker compose up` with hello-world
  API + built frontend served.
- Server: FastAPI app, SQLAlchemy models per SPEC-003, Alembic-free simple
  `create_all` + seed hook, session-cookie auth per SPEC-005.
- Web: Vite + React + TS + Tailwind v4 configured with `DESIGN-001` tokens,
  router with all routes from SPEC-010 registered as *designed placeholder
  shells* (real layout chrome, real empty states — never default browser text).
- **Exit criteria:** register→login→logout works via API; every route in the
  manifest renders inside the real app shell; first visual crawl runs and
  produces a gallery.

### Wave 1 — Content pipeline + Learning core (Content Loader ∥ Learning UX ∥ Tutor start)
- Content Loader: transform `CURRICULUM/*.md` (front-matter + structured blocks,
  format defined in CURRICULUM-000 §Authoring format) into seed JSON, load into
  DB on boot when empty. Ingest `RAG_CORPUS/corpus/*.md` into Chroma
  (STARTER/ingest.py is the reference).
- Learning UX: Dashboard, course map, module overview, lesson player frame,
  the first six renderers (content, multiple_choice, prediction_reveal,
  sort_categorize, match, reflection) fully polished.
- Tutor: server pipeline (retrieve → compose → generate → shape response),
  offline extractive fallback, `/api/tutor/ask` live.
- **Exit criteria:** Module 1 playable start-to-finish with real content;
  tutor answers the three canonical test questions in SPEC-008 §Acceptance;
  visual crawl pass #2 reviewed with fixes applied.

### Wave 2 — Full course + rich renderers (Learning UX ∥ Tutor UI ∥ Content Loader)
- Remaining renderers: hotspot_list, branching_decision, structured_response,
  journal_builder, checkpoint, lab_objective (see SPEC-007 for all specs).
- All six modules playable; Field Journal; XP/badges; capstone (Ride Plan
  builder); final assessment; certificate.
- Tutor UI: full chat surface with source chips, curriculum-aware context,
  suggested prompts, streaming if the provider supports it.
- **Exit criteria:** full course completable; certificate renders; crawl pass #3.

### Wave 3 — Polish & verification (Design QA leads ∥ Journey QA)
- Design QA runs the FULL protocol in QA-001: every route × every state,
  desktop + mobile widths, *including deep states* (mid-activity, wrong-answer
  feedback, journal with 3 artifacts, chat with long history, empty search).
  Iterate: crawl → review → fix → crawl. Minimum two full iterations; continue
  until a pass produces zero P1/P2 findings (defined in QA-001).
- Journey QA: the three E2E journeys, API smoke, `docker compose` cold-boot test,
  QA-004 checklist.
- **Exit criteria:** the Definition of Done in START_HERE.md.

## Parallelization rules

1. Lanes communicate only through committed files and `BUILDLOG.md`. No lane
   blocks on another lane's opinion.
2. Interface-first: `/server` and `/web` meet at SPEC-004's API contract. Both
   sides build against the contract, not against each other's code. If the
   contract must change, the change is one BUILDLOG line + updating the spec file
   in-repo, then both sides conform.
3. A lane that finishes early picks up the next unclaimed item in its wave;
   it does not "improve" another lane's finished work unannounced.

## The anti-stall directives (read twice)

- **Bias to build.** When uncertain between two reasonable implementations,
  pick the one that ships learner-visible value sooner.
- **Placeholder = defect.** "TODO", lorem ipsum, default-styled HTML, unstyled
  error text, or an unlinked button anywhere in the app is a P1 defect at every
  wave exit, not just at the end.
- **Never mark done without traversal.** A screen is not done because it
  compiled. It is done when you have *navigated to it in a browser context,
  interacted with it, and screenshotted it* — including the states you reach by
  clicking through, not just the states reachable by URL.
- **Fix forward.** When the crawl reveals ugliness, fix it in the component
  system (tokens, shared components) so the fix propagates, not with one-off
  page CSS.
- **Budget alarm.** If you have spent more than ~15% of any wave on testing
  infrastructure, typing debates, or refactors invisible to users, you are in a
  governance spiral. Re-read NON_GOALS.md §1 and return to the wave's exit
  criteria.

## BUILDLOG.md format (the entire governance system)

```
2026-08-06 W1 [content] Chose to store activity payloads as JSON column, per SPEC-003 §activities.
2026-08-06 W1 [deviate] SPEC-004 /api/modules returned lessons inline; added ?include=lessons instead. Spec updated.
```
One line per decision or deviation. That's it.
