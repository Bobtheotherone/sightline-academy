# Sightline Safety Academy

Sightline Safety Academy is a web-based interactive learning platform for ATV (all-terrain
vehicle) and adjacent road safety. Anyone can create an account and work through a
six-module curriculum of interactive activities — sorting, hotspot exploration,
branching scenarios, matching, prediction-reveals, structured reflection — building a
persistent Field Journal along the way, earning XP and badges, and finishing with a
capstone Ride Plan, a final assessment, and a completion certificate. A curriculum-aware
AI tutor, **Ranger**, answers any ATV- or road-safety question via retrieval-augmented
generation over a local ChromaDB corpus; with no API key configured it still answers in
a fully offline extractive mode. The stack is FastAPI + SQLite + Chroma on the back,
React + Vite + Tailwind on the front, deployed as a single-host Docker Compose pair.

## Repository layout

- `server/` — FastAPI app (uv project, Python 3.12)
- `web/` — Vite + React + TypeScript SPA
- `content/` — curriculum + RAG corpus (data, not docs: seeded/ingested at boot)
- `ops/` — Dockerfiles, nginx config, docker-compose
- `qa/` — the visual-crawl harness and its route×state manifest (QA-001)
- `artifacts/` — the reviewed crawl passes and the final launch gate walk

## Commands

### Configuration (both dev and prod)

The server reads `.env` from the repo root:

```sh
cp .env.example .env
```

Then edit: set a real `SESSION_SECRET` (64 hex chars), your instructor email(s) in
`INSTRUCTOR_EMAILS`, and optionally `ANTHROPIC_API_KEY` (leave empty for the offline
extractive tutor mode). For local development over plain http, set `SECURE_COOKIES=0`.

### Development

One-time setup:

```sh
cd server && uv sync
cd web && npm i
```

Run (two terminals):

```sh
cd server && uv run uvicorn app.main:app --reload   # API on :8000
cd web && npm run dev                               # Vite on :5173, proxies /api -> :8000
```

Database seeding and corpus ingest happen automatically on API boot — there is no
separate ingest command to remember. The first boot downloads the embedding model
(all-MiniLM-L6-v2) into the local cache.

### Production (Docker)

```sh
cp .env.example .env    # then edit — see Configuration above
docker compose -f ops/docker-compose.yml up -d --build
```

The site is served on port **8080** (`http://localhost:8080`); nginx proxies `/api/*`
to the api container. On first boot the api seeds the course from `content/curriculum/`
and ingests `content/corpus/` into Chroma — the embedding model is baked into the image
at build time and `HF_HUB_OFFLINE=1` keeps huggingface_hub from revalidating it against
the Hub at runtime, so the build needs network but first boot does not.

**Content is baked into the api image at build time** (content-as-code, ADR-006):
`content/` is `COPY`ed into the image, not bind-mounted. To change course or corpus
content, edit `content/` and re-run the `up -d --build` command above.

### Verify

```sh
curl localhost:8080/api/meta/health
```

Returns db, chroma, and tutor-provider status as JSON.

### Backup

All persistent state (SQLite database + Chroma index) lives in the single named
volume `sightline-data` (created by compose as `sightline_sightline-data`). To back
it up: stop the api, copy the volume contents, start the api again:

```sh
docker compose -f ops/docker-compose.yml stop api
docker run --rm -v sightline_sightline-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/sightline-data-backup.tgz -C /data .
docker compose -f ops/docker-compose.yml start api
```

To restore, extract the archive back into the volume the same way
(`tar xzf /backup/sightline-data-backup.tgz -C /data`) before starting the api.

## TLS / domain

The compose file publishes plain HTTP on port 8080 and deliberately leaves TLS to the
host. The recommended recipe is host-level [Caddy](https://caddyserver.com): install
Caddy on the host, point your domain's DNS at the machine, and give Caddy a two-line
site block that reverse-proxies to the compose stack — Caddy then obtains and renews
Let's Encrypt certificates automatically, and `SECURE_COOKIES=1` (the default) is
correct because learners always connect over HTTPS. Example `Caddyfile`:

```
academy.example.com {
    reverse_proxy localhost:8080
}
```

## Post-launch (deliberately deferred)

- Password reset
- Email verification
- OAuth sign-in
- Postgres migration path (kept open by the SQLAlchemy layer; not built)
- Session-management UI
- 3D lab stretch activity
- Redis-backed rate limiting at scale

## Design notes

- **No sound.** The product ships silent by deliberate decision (DESIGN-004).
- **One light theme.** A single, fully-specified light theme; no dark mode (DESIGN-001).

## Verification artifacts

The launch bar was verified continuously, not terminally. The records live in
the repo:

- `artifacts/crawl/` — the reviewed screenshot-crawl passes (one `REVIEW.md`
  per pass; pass 5 is the zero-P1/zero-P2 exit pass over the full 92-state
  route×state matrix, and its appendix holds the full-site traversal audit:
  90 page visits, zero dead links, zero console errors).
- `artifacts/launch/` — the final gate walk: `QA-004-checklist.md` (every
  launch-checklist box with its evidence) and `SPEC-001-acceptance.md`
  (every product-requirement AC, how it was verified, and where).
- `web/e2e/` — the three QA-002 user journeys (J1 first session, J2 full
  completion + capstone + assessment fail→pass + certificate, J3 the Ranger
  conversation across all four grounding/triage modes), run
  with Playwright against a fixture-seeded stack (`npm run e2e` in `web/`;
  boot recipe in `web/playwright.config.ts`). The API smoke + four unit
  targets live in `server/tests/` (`uv run pytest`).
