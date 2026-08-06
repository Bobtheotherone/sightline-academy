"""Session-cookie auth per SPEC-005 / ADR-003.

- Cookie ``ts_session`` carries a 32-byte urlsafe token; the DB stores its SHA-256.
- 30-day sliding expiry; ``last_seen_at`` refreshed at most once per hour.
- argon2id hashing with rehash-on-login.
- In-process per-IP token bucket for login/register: 8 failures / 5 min, then a
  10-minute lockout answered with 429 {"error": {"code": "rate_limited", ...}}.
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
from .models import SessionRow, User, utc_now_iso

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
    if user.role != "instructor":
        raise ApiError(403, "forbidden", "That area is for instructors only.")
    return user


# ── Rate limiting (SPEC-005 §Rate limiting, R1.3) ────────────────────────────

RATE_LIMIT_MAX_FAILURES = 8
RATE_LIMIT_WINDOW_SECONDS = 5 * 60
RATE_LIMIT_LOCKOUT_SECONDS = 10 * 60


class AuthRateLimiter:
    """Per-IP failure bucket shared by /auth/login and /auth/register."""

    def __init__(self) -> None:
        self._failures: dict[str, list[float]] = {}
        self._locked_until: dict[str, float] = {}

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
        window = [t for t in self._failures.get(ip, []) if now - t < RATE_LIMIT_WINDOW_SECONDS]
        window.append(now)
        self._failures[ip] = window
        if len(window) >= RATE_LIMIT_MAX_FAILURES:
            self._locked_until[ip] = now + RATE_LIMIT_LOCKOUT_SECONDS

    def reset(self, ip: str) -> None:
        self._failures.pop(ip, None)
        self._locked_until.pop(ip, None)


auth_rate_limiter = AuthRateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def compute_xp_and_level(db: Session, user_id: str) -> tuple[int, int]:
    """XP total from xp_events; level 1 baseline until SPEC-009 lands (Wave 2)."""
    from sqlalchemy import func, select

    from .models import XpEvent

    total = db.execute(
        select(func.coalesce(func.sum(XpEvent.xp), 0)).where(XpEvent.user_id == user_id)
    ).scalar_one()
    return int(total), 1


def user_out_payload(db: Session, user: User) -> dict:
    xp_total, level = compute_xp_and_level(db, user.id)
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "created_at": user.created_at,
        "xp_total": xp_total,
        "level": level,
    }


__all__ = [
    "COOKIE_NAME",
    "auth_rate_limiter",
    "clear_session_cookie",
    "client_ip",
    "compute_xp_and_level",
    "create_session",
    "current_session",
    "current_user",
    "hash_password",
    "needs_rehash",
    "require_instructor",
    "set_session_cookie",
    "user_out_payload",
    "utc_now_iso",
    "verify_password",
]
