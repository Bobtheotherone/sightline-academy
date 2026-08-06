# ADR-001 — Technology Stack

**Status:** Accepted (final for this build)

## Decision

- **Backend:** Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.x ORM over **SQLite**
  (file: `data/sightline.db`), Pydantic v2 schemas, `argon2-cffi` password
  hashing, `itsdangerous`-signed session cookies.
- **Vector store:** **ChromaDB** (persistent client, `data/chroma/`), embeddings
  via `sentence-transformers` **all-MiniLM-L6-v2** running locally (no API key
  required for retrieval).
- **LLM:** provider adapter with two implementations:
  1. `anthropic` — Anthropic Messages API, model from `TUTOR_MODEL`
     (default `claude-sonnet-4-6`), used when `ANTHROPIC_API_KEY` is set.
  2. `extractive` — offline fallback that composes an answer from retrieved
     chunks with template framing (STARTER/tutor_pipeline.py shows how). The app
     must be fully demo-able with zero API keys.
- **Frontend:** React 18 + TypeScript, Vite, **Tailwind CSS v4** with the token
  sheet from DESIGN-001, React Router v6, Radix UI *primitives only* (unstyled —
  dialog, popover, tabs, toast) for accessibility; all visual styling is ours.
  State: TanStack Query for server state; React context for session; no Redux.
- **E2E/visual tooling:** Playwright (also drives the screenshot crawl).
- **Ops:** Docker Compose — `api` (uvicorn) + `web` (nginx serving the Vite
  build, proxying `/api` to api) + named volume `sightline-data`.

## Why

- FastAPI+Chroma+sentence-transformers is the shortest reliable path to a real
  RAG system with no external dependencies; Python is where the RAG ecosystem is.
- SQLite keeps ops to one volume; the SQLAlchemy layer gives a clean Postgres
  upgrade path if the platform later needs multi-instance scale (documented,
  not built).
- Local embeddings mean ingestion and retrieval work in CI, in demos, offline.
- React+Vite+Tailwind is the fastest route to the DESIGN/ system with full
  control (no component-library look — see DESIGN-006).

## Consequences

- One repo, two runtimes (see ADR-002). The API contract (SPEC-004) is the seam.
- The model name and provider are env-config only; no hardcoding.
