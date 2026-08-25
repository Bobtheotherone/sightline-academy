"""Per-learner tutor quota.

Ranger runs on a personal, metered Anthropic key. An authenticated endpoint
with no ceiling is therefore a direct financial exposure, not just a load one:
one determined account (or one runaway client retry loop) can spend real money
until the key's limit is hit, at which point Ranger is down for the whole class.

Counting lives in the database rather than in process memory on purpose — an
in-memory counter resets on every deploy and does not hold across replicas,
which is exactly when a spend cap matters most.

The limits are per user, generous enough that nobody studying normally will
ever meet one, and answered with a friendly 429 rather than a hard error.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..errors import ApiError
from ..models import TutorUsage, User


def _count_since(db: Session, user_id: str, since: datetime) -> int:
    return int(
        db.execute(
            select(func.count())
            .select_from(TutorUsage)
            .where(TutorUsage.user_id == user_id, TutorUsage.created_at >= since.isoformat())
        ).scalar_one()
    )


def check_tutor_quota(db: Session, user: User) -> None:
    """Raise 429 when this learner has used up their hour or day allowance."""
    settings = get_settings()
    now = datetime.now(UTC)

    hourly_cap = settings.tutor_messages_per_hour
    daily_cap = settings.tutor_messages_per_day
    if hourly_cap <= 0 and daily_cap <= 0:
        return

    if hourly_cap > 0:
        used = _count_since(db, user.id, now - timedelta(hours=1))
        if used >= hourly_cap:
            raise ApiError(
                429,
                "tutor_quota",
                "You've asked Ranger a lot of questions this hour — give it a "
                "little while and he'll be right back.",
            )

    if daily_cap > 0:
        used = _count_since(db, user.id, now - timedelta(days=1))
        if used >= daily_cap:
            raise ApiError(
                429,
                "tutor_quota",
                "That's Ranger's limit for today. Your progress is saved — "
                "come back tomorrow and he'll pick up where you left off.",
            )


def record_tutor_use(db: Session, user: User) -> None:
    """Log one tutor question against the quota.

    Recorded before the upstream call, so a request that fails or times out
    still counts. Charging for attempts rather than successes is the safe
    direction: the money is spent at the point the request is made.
    """
    import uuid

    db.add(
        TutorUsage(
            id=uuid.uuid4().hex,
            user_id=user.id,
            provider=get_settings().provider,
        )
    )
    db.commit()


def usage_snapshot(db: Session, user: User) -> dict:
    settings = get_settings()
    now = datetime.now(UTC)
    return {
        "used_this_hour": _count_since(db, user.id, now - timedelta(hours=1)),
        "hourly_limit": settings.tutor_messages_per_hour,
        "used_today": _count_since(db, user.id, now - timedelta(days=1)),
        "daily_limit": settings.tutor_messages_per_day,
    }
