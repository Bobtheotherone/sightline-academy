# BUILDLOG — Sightline Safety Academy

One line per meaningful decision or deviation (AGENT_OPERATIONS §BUILDLOG format).

2026-08-06 W0 [orchestrator] Repo root = D:\Sightline_Saftey_Academy (handoff folder kept in-repo as reference per START_HERE; content/ copies are the live source of truth per ADR-002).
2026-08-06 W0 [orchestrator] Ingest module path: server/app/ingest/ingest.py (STARTER/README + RAG_CORPUS/README say app/ingest; ADR-002 tree draws server/ingest — majority wins, noting the mismatch here).
2026-08-06 W0 [orchestrator] Local dev Python pinned to 3.12 via uv per ADR-001; system 3.13 not used for the server venv.
