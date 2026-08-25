"""Session-cookie auth per SPEC-005 / ADR-003.

- Cookie ``ts_session`` carries a 32-byte urlsafe token; the DB stores its SHA-256.
- 30-day sliding expiry; ``last_seen_at`` refreshed at most once per hour.
- argon2id hashing with rehash-on-login.
- Brute-force defence in **two independent layers** (see below).

Why two layers, and why the client IP is computed the way it is
---------------------------------------------------------------
The original per-IP limiter keyed on the *leftmost* ``X-Forwarded-For`` entry.
That entry is written by the client, and every reverse proxy in front of this
app (nginx here, any CDN in production) *appends* rather than replaces — so an
attacker who sends a different XFF value per request gets a fresh bucket every
time and the lockout never fires. Unlimited password guessing, against every
account, with a single header. The project's own test suite relied on that
behaviour to isolate personas, which is the same trick from the other side.

Both halves are fixed here:

1. ``client_ip`` now walks the forwarded chain from the **right** and skips a
   configured number of trusted proxy hops. Everything to the left of the hops
   we actually operate is attacker-controlled and is never read.
2. A per-**account** counter (``LoginAttempt``, in the database) sits alongside
   it. An attacker can rotate network identity but cannot rotate the account
   they are trying to break into, so this layer always finds them — and because
   it is in the database it survives restarts and holds across replicas, which
   an in-process dict does not.
"""

import hashlib
import secrets
import time
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .errors import ApiError
from .models import LoginAttempt, SessionRow, User, utc_now_iso
from .services import roles as roles_svc

COOKIE_NAME = "ts_session"
SESSION_DAYS = 30
LAST_SEEN_REFRESH_SECONDS = 3600

password_hasher = PasswordHasher()  # argon2id with library defaults


# ── Password hashing ─────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        password_hasher.verify(password_hash, password)
        return True
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return password_hasher.check_needs_rehash(password_hash)


# ── Session tokens ───────────────────────────────────────────────────────────


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user_id: str) -> str:
    """Create a session row and return the raw token for the cookie."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    db.add(
        SessionRow(
            token_hash=_hash_token(token),
            user_id=user_id,
            created_at=now.isoformat(),
            expires_at=(now + timedelta(days=SESSION_DAYS)).isoformat(),
            last_seen_at=now.isoformat(),
        )
    )
    db.commit()
    return token


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,
        samesite="lax",
        path="/",
        secure=bool(get_settings().secure_cookies),
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def resolve_session(db: Session, request: Request) -> tuple[User, SessionRow] | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    row = db.get(SessionRow, _hash_token(token))
    if row is None:
        return None
    now = datetime.now(UTC)
    if datetime.fromisoformat(row.expires_at) <= now:
        db.delete(row)
        db.commit()
        return None
    # Sliding expiry: refresh at most once per hour.
    last_seen = datetime.fromisoformat(row.last_seen_at)
    if (now - last_seen).total_seconds() >= LAST_SEEN_REFRESH_SECONDS:
        row.last_seen_at = now.isoformat()
        row.expires_at = (now + timedelta(days=SESSION_DAYS)).isoformat()
        db.commit()
    user = db.get(User, row.user_id)
    if user is None:
        db.delete(row)
        db.commit()
        return None
    return user, row


# ── Dependencies ─────────────────────────────────────────────────────────────


def current_session(request: Request, db: Session = Depends(get_db)) -> tuple[User, SessionRow]:
    resolved = resolve_session(db, request)
    if resolved is None:
        raise ApiError(401, "unauthorized", "You need to be logged in to do that.")
    return resolved


def current_user(auth: tuple[User, SessionRow] = Depends(current_session)) -> User:
    return auth[0]


def require_instructor(user: User = Depends(current_user)) -> User:
    """Instructor dashboard and learner exports.

    Admins and the owner are included because locking the people responsible
    for the deployment out of its own reporting has no security value. Student
    -worker developers are NOT included: contributing UI code is no reason to
    read classmates' progress records.
    """
    if not roles_svc.may_view_instructor_area(user.role):
        raise ApiError(403, "forbidden", "That area is for instructors only.")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if not roles_svc.may_use_admin_area(user.role):
        raise ApiError(403, "forbidden", "That area is for administrators only.")
    return user


def require_funds_access(user: User = Depends(current_user)) -> User:
    """Revenue and payout surfaces.

    Gated on the ``can_access_funds`` flag rather than on any role, so the
    answer stays "exactly one account" however many admins exist.
    """
    if not user.can_access_funds:
        raise ApiError(
            403,
            "forbidden",
            "Financial information is restricted to the account that owns the "
            "payment configuration.",
        )
    return user


# ── Client identity behind a proxy ───────────────────────────────────────────


def _is_private_peer(peer: str) -> bool:
    """True when the socket peer is *not* a globally reachable address.

    The question being asked is "did this connection come from our own
    infrastructure, or straight off the internet?" — so the test is
    reachability, not the ``is_private`` flag. Those are not the same:
    ``is_private`` is true for documentation ranges too, and on Python 3.13 it
    covers several other non-routable blocks, which would wrongly classify a
    direct internet peer as internal. ``is_global`` asks the question we
    actually mean.

    ``testclient`` (Starlette's TestClient peer) counts as internal so the test
    suite can keep partitioning personas by header without that being a
    real-world bypass.
    """
    if peer in ("testclient", "unknown"):
        return True
    try:
        import ipaddress

        addr = ipaddress.ip_address(peer)
    except ValueError:
        # Not an address at all — a hostname or garbage. Never treat an
        # unparseable peer as trusted infrastructure.
        return False
    return not addr.is_global


def client_ip(request: Request) -> str:
    """Best available client address, ignoring attacker-controllable hops.

    ``X-Forwarded-For`` grows left-to-right as a request passes through
    proxies: ``client, proxy1, proxy2``. Each proxy appends the address it
    *saw*, so only the rightmost entries — the ones our own infrastructure
    wrote — can be trusted. Anything further left was supplied by the caller
    and may be fabricated.

    We therefore start from the socket peer (``request.client.host``, which
    cannot be forged) and step left once per proxy we actually run.
    ``TRUSTED_PROXY_HOPS`` must match the deployment: 1 for the bundled nginx,
    2 if a CDN sits in front of it, 0 when uvicorn is exposed directly.
    Over-counting would re-introduce the bypass, so the default is the
    conservative 1 that matches ops/docker-compose.yml.
    """
    peer = request.client.host if request.client else "unknown"
    hops = get_settings().trusted_proxy_hops
    if hops <= 0:
        return peer

    # Belt and braces: only honour forwarded headers when the connection
    # actually came from our own infrastructure. If uvicorn is ever exposed
    # to the internet directly, the peer is a public address, hop-counting
    # would be counting proxies that are not there, and the leftmost
    # (spoofable) entry would win again. Refusing to read the header at all in
    # that case fails closed instead.
    if not _is_private_peer(peer):
        return peer

    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return peer

    # Full observed chain, oldest-claimed first, with the unforgeable peer last.
    chain = [part.strip() for part in forwarded.split(",") if part.strip()]
    chain.append(peer)

    index = len(chain) - 1 - hops
    if index < 0:
        # Fewer entries than configured hops: the request did not come through
        # the expected proxy chain. Fall back to the peer rather than trusting
        # the leftmost value, which is exactly the spoofable one.
        return peer
    return chain[index]


# ── Rate limiting (SPEC-005 §Rate limiting, R1.3) ────────────────────────────

RATE_LIMIT_MAX_FAILURES = 8
RATE_LIMIT_WINDOW_SECONDS = 5 * 60
RATE_LIMIT_LOCKOUT_SECONDS = 10 * 60

# Per-account lockout: slightly more permissive than the per-IP one so that a
# learner fat-fingering their own password is inconvenienced, not locked out.
ACCOUNT_MAX_FAILURES = 10
ACCOUNT_WINDOW_SECONDS = 15 * 60
ACCOUNT_LOCKOUT_SECONDS = 15 * 60

# Hard ceiling on tracked buckets. Keys are now trustworthy, but an unbounded
# dict in a public request path is a memory-growth primitive regardless.
MAX_TRACKED_IPS = 10_000


class AuthRateLimiter:
    """Per-IP failure bucket shared by /auth/login and /auth/register."""

    def __init__(self) -> None:
        self._failures: dict[str, list[float]] = {}
        self._locked_until: dict[str, float] = {}

    def _evict_if_needed(self, now: float) -> None:
        """Drop expired buckets, then oldest-first if still over the cap."""
        if len(self._failures) < MAX_TRACKED_IPS:
            return
        stale = [
            ip
            for ip, times in self._failures.items()
            if not times or now - times[-1] > RATE_LIMIT_WINDOW_SECONDS
            if self._locked_until.get(ip, 0) < now
        ]
        for ip in stale:
            self._failures.pop(ip, None)
            self._locked_until.pop(ip, None)
        if len(self._failures) >= MAX_TRACKED_IPS:
            # Still full: shed the least-recently-active buckets. Losing an
            # entry only forgives past failures; it never grants access.
            ordered = sorted(self._failures.items(), key=lambda kv: kv[1][-1] if kv[1] else 0)
            for ip, _ in ordered[: MAX_TRACKED_IPS // 10]:
                self._failures.pop(ip, None)
                self._locked_until.pop(ip, None)

    def check(self, ip: str) -> None:
        """Raise 429 while the IP is locked out."""
        now = time.monotonic()
        locked_until = self._locked_until.get(ip)
        if locked_until is not None:
            if now < locked_until:
                raise ApiError(
                    429,
                    "rate_limited",
                    "Too many attempts. Take a breather and try again in a few minutes.",
                )
            del self._locked_until[ip]
            self._failures.pop(ip, None)

    def record_failure(self, ip: str) -> None:
        now = time.monotonic()
        self._evict_if_needed(now)
        window = [t for t in self._failures.get(ip, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
        window.append(now)
        self._failures[ip] = window
        if len(window) >= RATE_LIMIT_MAX_FAILURES:
            self._locked_until[ip] = now + RATE_LIMIT_LOCKOUT_SECONDS

    def reset(self, ip: str) -> None:
        self._failures.pop(ip, None)
        self._locked_until.pop(ip, None)


auth_rate_limiter = AuthRateLimiter()


# ── Per-account lockout (survives restarts; immune to header spoofing) ───────


def _now() -> datetime:
    return datetime.now(UTC)


def _parse(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        parsed = datetime.fromisoformat(ts)
    except ValueError:
        return None
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


def check_account_lock(db: Session, email: str) -> None:
    """Raise 429 while this account is locked, regardless of source IP."""
    row = db.get(LoginAttempt, email.strip().lower())
    if row is None:
        return
    locked_until = _parse(row.locked_until)
    if locked_until and locked_until > _now():
        raise ApiError(
            429,
            "rate_limited",
            "Too many sign-in attempts for this account. "
            "Try again in a few minutes.",
        )


def record_account_failure(db: Session, email: str) -> None:
    key = email.strip().lower()
    now = _now()
    row = db.get(LoginAttempt, key)
    if row is None:
        row = LoginAttempt(email=key, failures=0, first_failure_at=now.isoformat())
        db.add(row)

    first = _parse(row.first_failure_at) or now
    locked_until = _parse(row.locked_until)
    if locked_until and locked_until <= now:
        # A previous lockout has elapsed — start a clean window.
        row.failures = 0
        row.locked_until = None
        first = now
    elif (now - first).total_seconds() > ACCOUNT_WINDOW_SECONDS:
        row.failures = 0
        first = now

    row.first_failure_at = first.isoformat()
    row.failures = (row.failures or 0) + 1
    if row.failures >= ACCOUNT_MAX_FAILURES:
        row.locked_until = (now + timedelta(seconds=ACCOUNT_LOCKOUT_SECONDS)).isoformat()
    db.commit()


def clear_account_failures(db: Session, email: str) -> None:
    row = db.get(LoginAttempt, email.strip().lower())
    if row is not None:
        db.delete(row)
        db.commit()


# ── Payloads ─────────────────────────────────────────────────────────────────


def compute_xp_and_level(db: Session, user_id: str) -> tuple[int, int]:
    """XP total from xp_events + SPEC-009 level thresholds (services/xp.py)."""
    from .services import xp

    total = xp.xp_total(db, user_id)
    return total, xp.level_for(total)


def user_out_payload(db: Session, user: User) -> dict:
    from .services import entitlements as ent_svc

    xp_total, level = compute_xp_and_level(db, user.id)
    access = ent_svc.evaluate(db, user)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "can_access_funds": bool(user.can_access_funds),
        "is_staff": roles_svc.is_staff(user.role),
        "created_at": user.created_at,
        "xp_total": xp_total,
        "level": level,
        "access": ent_svc.access_payload(access),
    }


__all__ = [
    "COOKIE_NAME",
    "auth_rate_limiter",
    "check_account_lock",
    "clear_account_failures",
    "clear_session_cookie",
    "client_ip",
    "compute_xp_and_level",
    "create_session",
    "current_session",
    "current_user",
    "hash_password",
    "needs_rehash",
    "record_account_failure",
    "require_admin",
    "require_funds_access",
    "require_instructor",
    "set_session_cookie",
    "user_out_payload",
    "utc_now_iso",
    "verify_password",
]
