# SPEC-012 — Deployment & Ops

Implements ADR-009.

## docker-compose (ops/docker-compose.yml)
- `api`: build ops/Dockerfile.api (python:3.12-slim; install server + torch-cpu
  wheels for sentence-transformers; pre-download the embedding model at build
  time so first boot is fast/offline). Cmd: uvicorn. Env from `.env`.
  Volume `sightline-data:/data`. Healthcheck: curl /api/meta/health.
- `web`: build ops/Dockerfile.web (node:22 build stage → nginx:alpine).
  nginx.conf: gzip on; `location /api { proxy_pass http://api:8000; }`;
  hashed assets `Cache-Control: max-age=31536000, immutable`; SPA fallback;
  security headers (X-Content-Type-Options, frame-ancestors 'none',
  Referrer-Policy strict-origin-when-cross-origin, and a CSP allowing only
  self + inline styles Tailwind needs).
- Ports: web 8080:80 (host chooses public mapping/TLS).

## Configuration (.env.example — commit it)
```
SESSION_SECRET=change-me-64-hex
ANTHROPIC_API_KEY=            # optional; empty → extractive mode
TUTOR_MODEL=claude-sonnet-4-6
INSTRUCTOR_EMAILS=professor@example.edu
SECURE_COOKIES=1              # 0 for local http
SEED_FORCE=0
```

## Commands the README must document (and that must work)
- Dev: `cd server && uv run uvicorn app.main:app --reload` + `cd web && npm run dev`
  (vite proxy /api→8000). One-time: `uv sync`, `npm i`, ingest happens on boot.
- Prod: `cp .env.example .env` (edit) → `docker compose -f ops/docker-compose.yml up -d --build`.
- Verify: `curl localhost:8080/api/meta/health`.
- Backup: stop api → copy the `sightline-data` volume dir → start.

## TLS/domain (documented, not built)
Recommended: host-level Caddy with `reverse_proxy localhost:8080` — automatic
HTTPS. One paragraph + example Caddyfile in README.

## Cold-boot acceptance (Journey QA, wave 3)
From clean checkout on a fresh machine with Docker: the documented prod steps
produce a working site (register→module 1 start→tutor answer in extractive
mode) in ≤10 minutes, no undocumented steps.
