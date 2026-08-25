"""Course access: who may open the course, and why (SPEC-012).

Access is decided **on the server, on every request**. Hiding a lesson in the
UI is presentation, not enforcement — the API is the paywall.

Three ways to hold access:

* ``role``   — staff (developer / instructor / admin / owner) never pay.
* ``stripe`` — an active or grace-period subscription.
* ``comp``   — manually granted by an admin, with a recorded reason.
"""

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from ..config import get_settings
from ..errors import ApiError
from ..models import Entitlement, User, utc_now_iso
from . import roles as roles_svc

STATUS_ACTIVE = "active"
STATUS_PAST_DUE = "past_due"
STATUS_CANCELED = "canceled"
STATUS_NONE = "none"

#: Statuses that still open the course. `past_due` is included deliberately:
#: a card that failed renewal is a billing problem, and locking someone out of
#: a course they are mid-way through is a disproportionate response to it.
#: Stripe retries for days; `current_period_end` is what actually bounds this.
OPEN_STATUSES = frozenset({STATUS_ACTIVE, STATUS_PAST_DUE})


@dataclass(frozen=True)
class Access:
    allowed: bool
    reason: str  # 'role' | 'stripe' | 'comp' | 'paywall_disabled' | 'none' | 'expired'
    status: str
    current_period_end: str | None = None
    cancel_at_period_end: bool = False

    @property
    def is_staff_grant(self) -> bool:
        return self.reason == "role"


def get_entitlement(db: Session, user_id: str) -> Entitlement | None:
    return db.get(Entitlement, user_id)


def _period_still_open(row: Entitlement) -> bool:
    """True when a paid period has not yet elapsed.

    A canceled subscription keeps access until the period the learner already
    paid for runs out — cancelling should stop the next charge, not confiscate
    the month already bought.
    """
    if not row.current_period_end:
        return False
    try:
        end = datetime.fromisoformat(row.current_period_end)
    except ValueError:
        return False
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    return end > datetime.now(UTC)


def evaluate(db: Session, user: User) -> Access:
    """Decide access for one user. The single source of truth for the paywall."""
    settings = get_settings()

    # Staff first: this must not depend on billing being configured, or a
    # Stripe outage would lock instructors out of their own course.
    if roles_svc.is_staff(user.role):
        return Access(True, "role", STATUS_ACTIVE)

    if not settings.paywall_enforced:
        # Either the operator turned the gate off, or Stripe is not fully
        # configured. Serving the course beats locking out paying learners
        # with no way to buy their way back in.
        return Access(True, "paywall_disabled", STATUS_NONE)

    row = get_entitlement(db, user.id)
    if row is None:
        return Access(False, "none", STATUS_NONE)

    if row.source == "comp" and row.status == STATUS_ACTIVE:
        return Access(True, "comp", STATUS_ACTIVE, row.current_period_end)

    if row.status in OPEN_STATUSES:
        return Access(
            True,
            "stripe",
            row.status,
            row.current_period_end,
            bool(row.cancel_at_period_end),
        )

    # Canceled but inside a period already paid for.
    if row.status == STATUS_CANCELED and _period_still_open(row):
        return Access(True, "stripe", STATUS_CANCELED, row.current_period_end, True)

    return Access(
        False,
        "expired" if row.status == STATUS_CANCELED else "none",
        row.status,
        row.current_period_end,
    )


def require_course_access(db: Session, user: User) -> Access:
    """Dependency-style guard: raise 402 unless the user may open the course."""
    access = evaluate(db, user)
    if not access.allowed:
        raise ApiError(
            402,
            "subscription_required",
            "This course needs an active subscription. "
            "Head to your account to start one — you keep every bit of progress.",
        )
    return access


def upsert(
    db: Session,
    user_id: str,
    *,
    status: str,
    source: str,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    current_period_end: str | None = None,
    cancel_at_period_end: bool = False,
    price_id: str | None = None,
    note: str | None = None,
) -> Entitlement:
    """Create or update one user's entitlement row.

    ``None`` for an id/period argument leaves the stored value alone rather
    than clearing it, so a partial webhook payload can never blank out the
    Stripe ids we need to reconcile later.
    """
    row = db.get(Entitlement, user_id)
    if row is None:
        row = Entitlement(user_id=user_id)
        db.add(row)
    row.status = status
    row.source = source
    if stripe_customer_id is not None:
        row.stripe_customer_id = stripe_customer_id
    if stripe_subscription_id is not None:
        row.stripe_subscription_id = stripe_subscription_id
    if current_period_end is not None:
        row.current_period_end = current_period_end
    if price_id is not None:
        row.price_id = price_id
    if note is not None:
        row.note = note
    row.cancel_at_period_end = bool(cancel_at_period_end)
    row.updated_at = utc_now_iso()
    db.commit()
    return row


def access_payload(access: Access) -> dict:
    """Shape handed to the frontend so it can render state without deciding it."""
    return {
        "allowed": access.allowed,
        "reason": access.reason,
        "status": access.status,
        "current_period_end": access.current_period_end,
        "cancel_at_period_end": access.cancel_at_period_end,
    }
