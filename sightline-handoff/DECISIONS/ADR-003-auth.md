# ADR-003 — Authentication & Accounts

**Status:** Accepted

## Decision

Email + password accounts with open worldwide registration. Server-side sessions:
opaque token in an `HttpOnly; Secure; SameSite=Lax` cookie, session rows in
SQLite with 30-day sliding expiry. Passwords hashed with argon2id. No OAuth, no
email verification, no magic links in this build (deferred list in SPEC-005).

Roles: `learner` (default) and `instructor` (granted by a bootstrap env var
listing instructor emails — no admin UI for role management).

## Why

- Lowest-friction path to "anyone in the world can log in" with credible
  security. Session cookies avoid token-storage pitfalls in the SPA and keep the
  server able to revoke.
- Email verification requires deliverability infrastructure that adds days and
  external accounts for near-zero launch value. Documented as first post-launch
  item.

## Hard requirements

- Rate-limit login and register (per-IP token bucket, in-process is fine).
- Never store or log plaintext passwords; never return password hashes.
- Account page offers data export (JSON of progress+journal) and account
  deletion (hard delete of user rows) — cheap now, painful later. See SPEC-005.
