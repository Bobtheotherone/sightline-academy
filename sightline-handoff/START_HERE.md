# START HERE — Sightline Safety Academy General-Audience Build

You are the build agent (or orchestrator of build agents) for **Sightline Safety Academy**, a
polished, world-facing online ATV & road safety learning platform with an
integrated RAG-based AI tutor. This folder is a complete, pre-thought handoff.
**Everything you need to build the product from an empty repo is in these files.**
Nothing here is aspirational filler — every document is load-bearing and was written
so that you do not have to make foundational decisions mid-build.

## The one-paragraph mission

Build a production-quality web application where anyone in the world can register,
work through a six-module interactive ATV & road safety curriculum (rich activities,
scenarios, a field journal, knowledge checks, a capstone, and a completion
certificate), and converse with a curriculum-aware AI tutor backed by a ChromaDB
vector store. The UI must look and feel like a finished commercial product —
not a scaffold, not a demo, not "vibe-coded." Visual quality is verified by
*screenshotting and reviewing every route in every state, repeatedly*, per
`QA/QA-001-visual-review-protocol.md`.

## Reading order (do this before writing any code)

Read in this exact order. Total ≈ 30 minutes of reading that will save you days:

1. `PROJECT_BRIEF.md` — what we are building and for whom.
2. `NON_GOALS.md` — what we are explicitly NOT doing. **Binding.**
3. `AGENT_OPERATIONS.md` — how to orchestrate the build (waves, lanes, budgets).
4. `DECISIONS/` — all nine ADRs. These decisions are **made**. Do not relitigate them.
5. `SPECS/SPEC-001-product-requirements.md` — the requirement set with acceptance criteria.
6. `SPECS/SPEC-002-architecture.md` → `SPEC-003` → `SPEC-004` — how the system fits together.
7. `SPECS/SPEC-006-learning-engine.md` and `SPEC-007-activity-renderers.md` — the heart of the product.
8. `SPECS/SPEC-008-rag-tutor.md` — the tutor. Read `STARTER/tutor_system_prompt.md` alongside it.
9. `DESIGN/` — all six documents. The design system is decided; implement it.
10. `QA/` — the verification protocol and, critically, the verification **budget**.
11. `CURRICULUM/` — the full authored curriculum. This is your content database source.
12. `RAG_CORPUS/` — the tutor's knowledge base, pre-chunked and ready to ingest.
13. `STARTER/` — reference implementations for the tricky parts. Adapt, don't worship.
14. `LEGACY_NOTES.md` — what v1 taught us; what to keep and what to never repeat.

## Ground rules (compressed; details in AGENT_OPERATIONS.md)

- **Specs are the contract.** If a spec answers a question, that is the answer. If a
  spec is silent, make the smallest reasonable choice consistent with the ADRs, note
  it in `BUILDLOG.md`, and keep moving. Do not stop to ask; do not build a
  decision-review process.
- **Content is provided.** Do not invent curriculum. `CURRICULUM/` and `RAG_CORPUS/`
  are complete. Your job is to load them faithfully into the data model
  (`SPEC-003`) and render them beautifully.
- **Visual verification is continuous, not terminal.** After every UI milestone,
  run the screenshot crawl (`STARTER/visual_crawl.py`, manifest in
  `STARTER/route-manifest.json`), *look at the images*, and fix what looks
  unfinished. The definition of done for every screen is in
  `DESIGN/DESIGN-006-anti-generic-checklist.md`.
- **Verification budget is capped.** Smoke tests + user-journey tests + the visual
  crawl. No unit-test pyramids, no type-nitpick sweeps, no process-about-process.
  `QA/QA-003-verification-budget.md` is binding.
- **Keep a `BUILDLOG.md`** at repo root: one line per meaningful decision or
  deviation. That is the entire governance apparatus. There is no other one.

## Definition of "done" for the whole project

All acceptance criteria in `SPEC-001` pass, the full-route visual crawl produces
screenshots you would proudly put in a portfolio, the three E2E journeys in
`QA/QA-002` pass, `docker compose up` boots the whole stack from scratch
(including corpus ingestion), and `QA/QA-004-launch-checklist.md` is fully checked.

Now read `PROJECT_BRIEF.md`.
