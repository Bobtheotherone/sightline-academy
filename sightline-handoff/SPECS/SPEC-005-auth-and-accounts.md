# SPEC-005 — Auth & Accounts

Implements ADR-003. UI copy for these flows is in DESIGN-003 §Auth screens.

## Registration
- Fields: display name (2–40 chars), email (validated + lowercased), password
  (≥10 chars; strength hint updates live: length + "not a common password"
  check against a bundled top-1000 list; no composition rules).
- On success: create user, create session, set cookie, redirect to Dashboard
  first-run state. On duplicate email: inline error with login link (R1.1).

## Sessions
- Cookie `ts_session`: 32-byte urlsafe token; server stores SHA-256 of token.
- `HttpOnly; SameSite=Lax; Path=/; Secure` (Secure only when HTTPS — env flag).
- Sliding expiry: 30 days; `last_seen_at` refreshed at most once/hour.
- Logout deletes the session row. Password change revokes all other sessions.

## Password hashing
- argon2id via argon2-cffi defaults; rehash-on-login if parameters changed.

## Rate limiting
- In-process token bucket per IP for `/auth/login` + `/auth/register`:
  8 attempts / 5 min, 10-min lockout → 429. (Single-instance deploy per ADR-009
  makes in-process acceptable; note Redis as the scale-up path in README.)

## Roles
- `INSTRUCTOR_EMAILS` env (comma list). At login/registration, if email matches,
  role := instructor. No UI for role management.

## Account page (R1.5)
- Display-name edit (inline, optimistic). Password change (current + new).
- **Export my data**: streams the JSON from GET /auth/export as a download.
- **Delete account**: modal requiring the user to type their email; hard-deletes
  user + sessions + evidence + completions + xp + badges + journal + tutor
  messages + certificate. Copy per DESIGN-005 (serious, not scary).

## Deferred (document in README "Post-launch", do not build)
- Email verification & password reset (needs mail infra), OAuth providers,
  session management UI ("log out other devices" beyond password-change revoke).
