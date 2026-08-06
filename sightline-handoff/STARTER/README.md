# STARTER — Files That Ship Into the Repo

Everything in this folder is either copied into the codebase verbatim or used
as a binding reference implementation. Nothing here is illustrative.

| File | Destination | Status |
| --- | --- | --- |
| `design-tokens.css` | `web/src/styles/tokens.css` | Copy verbatim. The machine-readable half of DESIGN-001; components use only these variables (ADR-008). Includes the contour-motif and blaze-marker signature classes. |
| `route-manifest.json` | stays at `STARTER/route-manifest.json`, read by the crawl | Machine mirror of SPEC-010. Add a route → update SPEC-010 and this file in the same commit. Step/lesson ids in it are real ids from `CURRICULUM/`. |
| `safety_policy.json` | `server/app/tutor/safety_policy.json` | Copy verbatim. Triage categories, patterns, and authored response templates (SPEC-008). Every category carries `testMatch`/`testNearMiss` lists — these ARE the safety-triage unit fixtures (ADR-007 target #2); wire them into pytest directly. |
| `tutor_system_prompt.md` | prompt text → `server/app/tutor/prompts.py` | The fenced block is `SYSTEM_PROMPT`; the placeholders and their fill rules are specified in the file. This prompt is the implementation of ADR-005 — do not soften it. |
| `ingest.py` | `server/app/ingest/ingest.py` | Reference implementation; adapt config imports only. Pins: one file = one chunk, id from front-matter, MiniLM embeddings, idempotent boot behavior, fail-loud parsing. |
| `tutor_pipeline.py` | `server/app/tutor/pipeline.py` | Reference implementation of the seven-stage pipeline. Pins: triage before retrieval, soft-floor shaping (6→floor→topic-dedupe→4), grounding label thresholds, keyless extractive provider, in-band suggestion stripping. Helper stubs at the bottom are the Tutor agent's to implement. |
| `visual_crawl.py` | `qa/visual_crawl.py` | Playwright harness that walks route-manifest.json and screenshots every route×state×viewport into a run folder. The crawl is the camera; QA-001's review protocol is the QA. |

Copy rule (ADR-006): content and config are code. If a STARTER file needs a
change during the build, change it in the repo copy, note it in BUILDLOG, and
keep the change minimal — these files encode decisions that the SPECS/DECISIONS
docs depend on.
