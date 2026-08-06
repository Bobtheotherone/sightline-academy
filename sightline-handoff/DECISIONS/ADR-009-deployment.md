# ADR-009 — Deployment Model

**Status:** Accepted

## Decision

Single-host Docker Compose (SPEC-012):
- `web`: nginx serving the built SPA; proxies `/api/*` → `api:8000`;
  gzip; long-cache hashed assets; SPA fallback to index.html.
- `api`: uvicorn FastAPI; mounts volume `sightline-data` at `/data`
  (SQLite file + Chroma dir); runs seed + conditional ingest on start.
- Secrets/config via `.env` (`SESSION_SECRET`, `ANTHROPIC_API_KEY` optional,
  `TUTOR_MODEL`, `INSTRUCTOR_EMAILS`). `.env.example` committed.
- Health: `GET /api/meta/health` returns db, chroma, provider status; nginx
  `/healthz` static. Compose healthchecks on both.

TLS/domain is host-level (documented one-paragraph recipe with Caddy or a cloud
LB in SPEC-012) — not part of the compose file.

## Why

"Anyone in the world can log in" needs exactly one reliable box and a domain.
Everything heavier is premature. The volume design means backup = copy one
directory.
