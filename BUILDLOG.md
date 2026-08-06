# BUILDLOG — Sightline Safety Academy

One line per meaningful decision or deviation (AGENT_OPERATIONS §BUILDLOG format).

2026-08-06 W0 [orchestrator] Repo root = D:\Sightline_Saftey_Academy (handoff folder kept in-repo as reference per START_HERE; content/ copies are the live source of truth per ADR-002).
2026-08-06 W0 [orchestrator] Ingest module path: server/app/ingest/ingest.py (STARTER/README + RAG_CORPUS/README say app/ingest; ADR-002 tree draws server/ingest — majority wins, noting the mismatch here).
2026-08-06 W0 [orchestrator] Local dev Python pinned to 3.12 via uv per ADR-001; system 3.13 not used for the server venv.
2026-08-06 W0 [content] Pre-flight parse of content/curriculum: 6 modules, 22 lessons, 59 steps, all 12 renderer types present, all payload JSON valid, every knowledge check exactly one isBest.
2026-08-06 W0 [deviate] SPEC-003 says "every lesson has a checkpoint step" but 8/22 authored lessons have none and SPEC-000 says not every lesson has every section. Content is complete and binding — seed parser will validate "checkpoint, where present, is the last step" instead of requiring one per lesson.
2026-08-06 W0 [deviate] Live crawl manifest is qa/route-manifest.json (QA-001 says copy into repo; kept beside the crawl script rather than a root STARTER/ dir). Fixed two wrong ids vs curriculum: m4-l1-stability/m4-l1-s2 → m4-l2-stability/m4-l2-s2; m6-l4-capstone → m6-l4-ride-plan.
2026-08-06 W0 [server] Email validated with a conservative regex (email-validator dep not added); rate limiter counts failed attempts only, one shared per-IP bucket for login+register, 429 at 8th failure/5min.
2026-08-06 W0 [server] /auth/export excludes password_hash and session rows (ADR-003 "never return hashes" overrides "full dump"); DELETE confirm mismatch → 400 confirm_mismatch; wrong current password → 400 wrong_password.
2026-08-06 W0 [server] health reports chroma docs 0 without importing chromadb until ingest lands; UserOut.level fixed at 1 until SPEC-009 lands; instructor role re-checked (upgrade only) at login per SPEC-005.
2026-08-06 W0 [server] ApiError in app/errors.py (avoids auth↔main circular import); ruff select pinned (E4,E7,E9,F,I,B,UP,RUF; B008 ignored for FastAPI Depends); schemas.py 406 lines — single-file SPEC-004 contract per ADR-002.
2026-08-06 W0 [web] api.ts 417 lines — SPEC-004 contract discipline wants the whole contract in one file; typescript-eslint added so lint actually parses TS (no strict campaign).
2026-08-06 W0 [web] .ts-contour-dark added in app.css (paper-0 strokes 7%) for pine-950 heroes; tokens.css untouched; Tailwind default color/font namespaces wiped in @theme so library defaults can't leak (DESIGN-006).
2026-08-06 W0 [web] Favicon/contour-dark data URIs carry literal palette hex — ADR-008 no-hex rule applied to components; stylesheets/assets are the token layer.
2026-08-06 W0 [web] Until course/progress APIs land: modules 2–6 render designed locked state, dashboard/course/progress show first-run compositions; journal GET 404 renders the DESIGN-005 empty composition.
2026-08-06 W0 [ops] content/ COPYed into api image (ADR-006 content-as-code; edit ⇒ rebuild); image mirrors monorepo layout so ../content resolves as in dev.
2026-08-06 W0 [ops] .env.example comments moved to own lines — compose env parser would have made an inline comment the literal ANTHROPIC_API_KEY value and silently selected the anthropic provider.
2026-08-06 W0 [ops] /api proxy: proxy_buffering off + 75s read timeout so SSE streaming survives nginx; security headers repeated in /assets/ (add_header inheritance reset); compose project name pinned "sightline"; MiniLM pre-downloaded at image build into /opt/hf-cache.
2026-08-06 W0 [qa] visual_crawl.py login locator anchored (^password$) — unanchored regex also matched the PasswordInput "Show password" toggle (Playwright strict mode). Minimal STARTER-copy fix per copy rule.
2026-08-06 W0 [qa] Crawl pass 1: 66 shots, 12 skips (all /learn renderer states — no seed yet). Review in artifacts/crawl/pass-1/REVIEW.md. Wave 0 exit criteria met.
