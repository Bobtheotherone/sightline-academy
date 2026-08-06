# SPEC-002 — System Architecture

## Topology

```
Browser (React SPA)
   │  HTTPS
   ▼
nginx (web container) ── static SPA assets (hashed, long-cache)
   │  /api/* proxy
   ▼
FastAPI (api container)
   ├── SQLite  /data/sightline.db      (users, sessions, course, progress, journal, tutor logs)
   ├── Chroma  /data/chroma/            (corpus embeddings)
   ├── sentence-transformers (in-proc)  (query + ingest embeddings)
   └── LLM provider adapter ──► Anthropic API (optional) / extractive fallback
```

## Startup sequence (api container)

1. Load config (env). 2. `create_all` tables. 3. If course tables empty or
`SEED_FORCE=1`: run seed pipeline over `content/curriculum/` (fail-loud on parse
errors). 4. If Chroma collection count ≠ corpus file count: run ingest.
5. Warm the embedding model with one dummy encode. 6. Serve.

## Request-path principles

- All API responses are typed by `schemas.py`, matching SPEC-004 exactly.
- Auth dependency resolves the session cookie → `current_user`; routers declare
  `learner` or `instructor` requirements.
- Progress writes are idempotent upserts keyed by (user, step) — the client can
  safely retry.
- Tutor requests are synchronous by default; streaming via SSE when provider
  streams (R5.6). Timeout 30s → designed error state.

## Frontend architecture

- `web/src/lib/api.ts`: one typed client mirroring SPEC-004 (hand-written
  types; no codegen dependency).
- TanStack Query keys: `['me']`, `['course']`, `['module', id]`,
  `['lesson', id]`, `['progress']`, `['journal']`, `['tutor', 'history']`.
  Mutations invalidate precisely; optimistic updates for step evidence.
- Route-level lazy imports; the activity renderers ship in the lesson chunk.
- App shell (nav, tutor slide-over trigger, toasts) is one layout component;
  public pages use a separate minimal shell.

## Error strategy

- Server: exception handlers map domain errors → `{error: {code, message}}`
  with correct status; unexpected errors → 500 with incident id, logged.
- Client: query/mutation errors surface through one `useApiError` hook →
  DESIGN-005 patterns. Network-down banner with auto-retry.

## Performance notes

- Embedding model loads once (module-level singleton).
- Course content is served from memory after seed (small, read-mostly) — an
  in-process cache keyed by content version is fine.
- SQLite: WAL mode, busy_timeout 5000ms; single-writer discipline is adequate.
