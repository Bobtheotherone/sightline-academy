# QA-004 — Launch Checklist (final gate; every box checked before "done")

## Product
- [ ] All SPEC-001 P0 + P1 ACs verified (walk the list; mark each).
- [ ] All 6 modules playable start→finish with provided content; all 12
      renderers exercised by real curriculum instances.
- [ ] Final assessment + certificate + /verify round-trip.
- [ ] Ranger passes the six SPEC-008 acceptance questions on BOTH providers
      (anthropic with key; extractive without).
- [ ] Field Journal: all six artifacts creatable; capstone prefills work.

## Quality
- [ ] Final crawl pass: zero P1/P2 across full matrix; REVIEW.md archived.
- [ ] Traversal audit complete; zero dead links; zero console errors on any
      route.
- [ ] J1–J3 + smoke green in CI-like run.
- [ ] Lighthouse ≥85 perf desktop on /dashboard and one lesson; initial JS
      ≤350KB gz (R9.2).
- [ ] Keyboard-only pass: register→lesson→activity→tutor completable; focus
      always visible; reduced-motion verified.

## Ops
- [ ] Clean-machine cold boot per SPEC-012 in ≤10 min, extractive mode works
      keyless.
- [ ] /api/meta/health accurate in both provider modes.
- [ ] .env.example complete; README documents dev, prod, backup, TLS recipe,
      post-launch deferred list (password reset, email verification, Postgres
      path, 3D lab stretch).
- [ ] Secrets absent from repo/logs; cookies Secure in prod mode; security
      headers present (curl -I check).
- [ ] BUILDLOG.md reflects all deviations; SPEC files updated where contracts
      changed.
