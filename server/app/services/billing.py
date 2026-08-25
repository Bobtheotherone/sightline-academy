"""Stripe subscription billing (SPEC-012).

Design choices, and why:

* **Stripe-hosted Checkout, not a card form of our own.** No card number, CVC or
  expiry ever touches this server, this database, or these logs. That keeps the
  deployment out of PCI-DSS scope beyond the smallest self-assessment tier, and
  it is the single most important reason UAA IT can look at this and say yes.
  We never see a PAN, so we can never leak one.

* **The webhook is the source of truth, not the browser redirect.** A learner
  who closes the tab after paying must still get access; a learner who hand-
  crafts a request to the success URL must not. Access is written when Stripe
  tells us server-to-server, with a verified signature.

* **Every write is idempotent.** Stripe retries deliveries and does not promise
  exactly-once. Replaying a stale `subscription.deleted` after a fresh
  `subscription.created` would revoke a live subscription, so each event id is
  applied at most once (``ProcessedWebhook``).

* **Where the money lands is an account fact, not a code fact.** Funds go to
  whichever Stripe account these keys belong to. Keeping that account and its
  keys under Osama's sole control is what makes "only Osama has access to the
  funds" true at the money layer; ``can_access_funds`` enforces it in the app.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..errors import ApiError
from ..models import Entitlement, ProcessedWebhook, User, utc_now_iso
from . import entitlements as ent_svc

logger = logging.getLogger("sightline.billing")

try:  # pragma: no cover - import shape depends on the deploy image
    import stripe  # type: ignore
except ImportError:  # the app must still boot and teach without Stripe installed
    stripe = None  # type: ignore[assignment]


UNAVAILABLE = (
    "Payments aren't switched on right now. Nothing was charged — "
    "please try again shortly."
)


def stripe_ready() -> bool:
    return stripe is not None and get_settings().billing_configured


def _client():
    """Return the configured stripe module, or raise a clean 503."""
    settings = get_settings()
    if stripe is None:
        logger.error("billing: the `stripe` package is not installed in this image")
        raise ApiError(503, "billing_unavailable", UNAVAILABLE)
    if not settings.billing_configured:
        logger.error(
            "billing: Stripe is not fully configured "
            "(secret_key=%s webhook_secret=%s price_id=%s)",
            bool(settings.stripe_secret_key),
            bool(settings.stripe_webhook_secret),
            bool(settings.active_price_id),
        )
        raise ApiError(503, "billing_unavailable", UNAVAILABLE)
    stripe.api_key = settings.stripe_secret_key
    # Identifies this integration in Stripe's logs — useful when reconciling a
    # disputed charge months later.
    stripe.set_app_info("Sightline ATV Safety Academy", version="1.0.0")
    return stripe


def _iso_from_unix(value: int | None) -> str | None:
    if not value:
        return None
    return datetime.fromtimestamp(int(value), tz=UTC).isoformat()


# ── Checkout ─────────────────────────────────────────────────────────────────


def create_checkout_session(db: Session, user: User) -> str:
    """Start a subscription checkout and return the Stripe-hosted URL."""
    client = _client()
    settings = get_settings()

    row = ent_svc.get_entitlement(db, user.id)
    customer_id = row.stripe_customer_id if row else None

    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": settings.active_price_id, "quantity": 1}],
        "success_url": f"{settings.public_base_url}/account?checkout=success",
        "cancel_url": f"{settings.public_base_url}/account?checkout=cancelled",
        # Two independent ways to map the payment back to this account, because
        # losing that mapping means a learner who paid cannot be granted access.
        "client_reference_id": user.id,
        "subscription_data": {"metadata": {"user_id": user.id, "email": user.email}},
        "metadata": {"user_id": user.id},
        "allow_promotion_codes": True,
    }
    if customer_id:
        params["customer"] = customer_id
    else:
        # Prefill only; Stripe still lets the learner change it.
        params["customer_email"] = user.email

    try:
        session = client.checkout.Session.create(**params)
    except Exception as exc:  # pragma: no cover - network path
        logger.exception("billing: checkout session creation failed")
        raise ApiError(502, "billing_error", UNAVAILABLE) from exc

    logger.info("billing: checkout session %s created for user %s", session.id, user.id)
    return session.url


def create_portal_session(db: Session, user: User) -> str:
    """Stripe-hosted billing portal: update card, view invoices, cancel."""
    client = _client()
    settings = get_settings()

    row = ent_svc.get_entitlement(db, user.id)
    if row is None or not row.stripe_customer_id:
        raise ApiError(
            400,
            "no_subscription",
            "There's no subscription on this account yet.",
        )
    try:
        session = client.billing_portal.Session.create(
            customer=row.stripe_customer_id,
            return_url=f"{settings.public_base_url}/account",
        )
    except Exception as exc:  # pragma: no cover - network path
        logger.exception("billing: portal session creation failed")
        raise ApiError(502, "billing_error", UNAVAILABLE) from exc
    return session.url


# ── Webhook ──────────────────────────────────────────────────────────────────


def verify_webhook(payload: bytes, signature: str | None):
    """Verify the Stripe signature and return the event.

    An unverified webhook body is attacker-controlled input that grants course
    access, so this must never be skipped — not even in development.
    """
    client = _client()
    settings = get_settings()
    if not signature:
        raise ApiError(400, "invalid_signature", "Missing signature.")
    try:
        return client.Webhook.construct_event(
            payload, signature, settings.stripe_webhook_secret
        )
    except Exception as exc:
        logger.warning("billing: rejected webhook with a bad signature")
        raise ApiError(400, "invalid_signature", "Signature verification failed.") from exc


def _resolve_user(db: Session, *, user_id: str | None, customer_id: str | None) -> User | None:
    if user_id:
        user = db.get(User, user_id)
        if user is not None:
            return user
    if customer_id:
        row = db.execute(
            select(Entitlement).where(Entitlement.stripe_customer_id == customer_id)
        ).scalar_one_or_none()
        if row is not None:
            return db.get(User, row.user_id)
    return None


def _apply_subscription(db: Session, sub: dict) -> None:
    """Write one subscription object through to the entitlement row."""
    metadata = sub.get("metadata") or {}
    customer_id = sub.get("customer")
    user = _resolve_user(db, user_id=metadata.get("user_id"), customer_id=customer_id)
    if user is None:
        logger.error(
            "billing: subscription %s has no resolvable user "
            "(customer=%s) — access NOT granted; reconcile by hand",
            sub.get("id"),
            customer_id,
        )
        return

    stripe_status = sub.get("status")
    # Stripe's vocabulary is wider than ours; collapse it deliberately.
    if stripe_status in ("active", "trialing"):
        status = ent_svc.STATUS_ACTIVE
    elif stripe_status in ("past_due", "unpaid"):
        status = ent_svc.STATUS_PAST_DUE
    else:  # canceled, incomplete, incomplete_expired, paused
        status = ent_svc.STATUS_CANCELED

    items = (sub.get("items") or {}).get("data") or []
    price_id = items[0]["price"]["id"] if items else None

    ent_svc.upsert(
        db,
        user.id,
        status=status,
        source="stripe",
        stripe_customer_id=customer_id,
        stripe_subscription_id=sub.get("id"),
        current_period_end=_iso_from_unix(sub.get("current_period_end")),
        cancel_at_period_end=bool(sub.get("cancel_at_period_end")),
        price_id=price_id,
    )
    logger.info(
        "billing: user %s entitlement -> %s (stripe status %s)",
        user.id,
        status,
        stripe_status,
    )


def handle_event(db: Session, event) -> str:
    """Apply one verified Stripe event exactly once. Returns a short outcome."""
    event_id = event.get("id") if isinstance(event, dict) else event.id
    event_type = event.get("type") if isinstance(event, dict) else event.type

    if db.get(ProcessedWebhook, event_id) is not None:
        return "duplicate"

    data = (event.get("data") or {}).get("object") or {}

    if event_type == "checkout.session.completed":
        # Grant immediately so a learner who paid is not left waiting on the
        # subscription event, which can arrive seconds later.
        user = _resolve_user(
            db,
            user_id=(data.get("metadata") or {}).get("user_id")
            or data.get("client_reference_id"),
            customer_id=data.get("customer"),
        )
        if user is not None:
            ent_svc.upsert(
                db,
                user.id,
                status=ent_svc.STATUS_ACTIVE,
                source="stripe",
                stripe_customer_id=data.get("customer"),
                stripe_subscription_id=data.get("subscription"),
            )
            logger.info("billing: checkout completed for user %s", user.id)
        else:
            logger.error(
                "billing: checkout.session.completed %s has no resolvable user",
                data.get("id"),
            )

    elif event_type in (
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        _apply_subscription(db, data)

    elif event_type == "invoice.payment_failed":
        user = _resolve_user(db, user_id=None, customer_id=data.get("customer"))
        if user is not None:
            row = ent_svc.get_entitlement(db, user.id)
            if row is not None and row.status == ent_svc.STATUS_ACTIVE:
                ent_svc.upsert(
                    db, user.id, status=ent_svc.STATUS_PAST_DUE, source="stripe"
                )
            logger.warning("billing: payment failed for user %s", user.id)

    db.add(ProcessedWebhook(event_id=event_id, event_type=event_type))
    db.commit()
    return "applied"


# ── Revenue summary (owner only) ─────────────────────────────────────────────


def revenue_summary(db: Session) -> dict:
    """Subscriber counts from our own records, plus the Stripe dashboard link.

    Deliberately does NOT proxy balances or payouts. Money movement is read in
    Stripe itself, by whoever holds the Stripe login — which keeps this
    endpoint from becoming a second, weaker door to the same information.
    """
    settings = get_settings()
    rows = list(db.execute(select(Entitlement)).scalars())
    by_status: dict[str, int] = {}
    for row in rows:
        by_status[row.status] = by_status.get(row.status, 0) + 1

    paying = sum(
        1 for r in rows if r.source == "stripe" and r.status in ent_svc.OPEN_STATUSES
    )
    price_cents = settings.active_price_cents
    return {
        "paying_subscribers": paying,
        "comped": sum(1 for r in rows if r.source == "comp"),
        "by_status": by_status,
        "active_price_cents": price_cents,
        "launch_sale_active": settings.launch_price_in_effect,
        "estimated_mrr_cents": paying * price_cents,
        "stripe_dashboard_url": "https://dashboard.stripe.com/subscriptions",
        "note": (
            "Counts come from this application's records. Actual balances, "
            "payouts and disputes live in the Stripe dashboard."
        ),
        "generated_at": utc_now_iso(),
    }
