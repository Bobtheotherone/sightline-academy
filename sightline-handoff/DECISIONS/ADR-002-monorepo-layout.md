# ADR-002 — Monorepo Layout

**Status:** Accepted

## Decision

```
sightline/
├── server/                 # FastAPI app
│   ├── app/
│   │   ├── main.py         # app factory, routers, startup seed hook
│   │   ├── config.py       # env settings (pydantic-settings)
│   │   ├── db.py           # engine, session, create_all
│   │   ├── models.py       # SQLAlchemy models (SPEC-003)
│   │   ├── schemas.py      # Pydantic request/response (SPEC-004)
│   │   ├── auth.py         # session cookie auth (SPEC-005)
│   │   ├── routers/        # auth, course, progress, journal, tutor, meta, instructor
│   │   ├── services/       # progress.py, xp.py, certificate.py, seed.py
│   │   └── tutor/          # pipeline.py, retrieval.py, safety.py, providers.py, prompts.py
│   ├── ingest/ingest.py    # corpus → Chroma (adapted from STARTER/ingest.py)
│   ├── tests/              # smoke + the four allowed unit targets (QA-003)
│   └── pyproject.toml
├── web/                    # Vite + React + TS
│   ├── src/
│   │   ├── app/            # router, providers, layout shells
│   │   ├── pages/          # one folder per route in SPEC-010
│   │   ├── activities/     # one component per renderer type (SPEC-007)
│   │   ├── components/     # design-system components (DESIGN-002)
│   │   ├── lib/            # api client (typed against SPEC-004), hooks
│   │   └── styles/         # tokens.css (from STARTER/design-tokens.css)
│   └── e2e/                # Playwright journeys + visual crawl
├── content/                # COPIED VERBATIM from handoff CURRICULUM/ + RAG_CORPUS/
│   ├── curriculum/
│   └── corpus/
├── ops/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── nginx.conf
├── BUILDLOG.md
└── README.md               # setup, run, ingest, test commands
```

## Rules

- `content/` is data, not docs: the seed pipeline reads it at boot; the ingest
  script reads it at ingest time. Editing course content = editing these files.
- The handoff folder itself is reference material; copy `CURRICULUM/` →
  `content/curriculum/` and `RAG_CORPUS/corpus/` → `content/corpus/` unmodified,
  then treat the copies as the live source of truth.
- No file over ~400 lines without a stated reason in BUILDLOG (split instead).
