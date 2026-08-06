# BUILDLOG — Sightline Safety Academy

One line per meaningful decision or deviation (AGENT_OPERATIONS §BUILDLOG format).

2026-08-06 W0 [orchestrator] Repo root = D:\Sightline_Saftey_Academy (handoff folder kept in-repo as reference per START_HERE; content/ copies are the live source of truth per ADR-002).
2026-08-06 W0 [orchestrator] Ingest module path: server/app/ingest/ingest.py (STARTER/README + RAG_CORPUS/README say app/ingest; ADR-002 tree draws server/ingest — majority wins, noting the mismatch here).
2026-08-06 W0 [orchestrator] Local dev Python pinned to 3.12 via uv per ADR-001; system 3.13 not used for the server venv.
2026-08-06 W0 [content] Pre-flight parse of content/curriculum: 6 modules, 22 lessons, 59 steps, all 12 renderer types present, all payload JSON valid, every knowledge check exactly one isBest.
2026-08-06 W0 [deviate] SPEC-003 says "every lesson has a checkpoint step" but 8/22 authored lessons have none and SPEC-000 says not every lesson has every section. Content is complete and binding — seed parser will validate "checkpoint, where present, is the last step" instead of requiring one per lesson.
2026-08-06 W0 [deviate] Live crawl manifest is qa/route-manifest.json (QA-001 says copy into repo; kept beside the crawl script rather than a root STARTER/ dir). Fixed two wrong ids vs curriculum: m4-l1-stability/m4-l1-s2 → m4-l2-stability/m4-l2-s2; m6-l4-capstone → m6-l4-ride-plan.
