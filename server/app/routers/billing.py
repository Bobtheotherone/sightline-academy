"""Subscription routes (SPEC-012).

Only four things are exposed, deliberately:

* ``GET  /billing/plan``     — public price copy, so the marketing page never
                               hardcodes a number that can drift from Stripe.
* ``POST /billing/checkout`` — start a Stripe-hosted checkout.
* ``POST /billing/portal``   — manage or cancel, on Stripe's own pages.
* ``POST /billing/webhook``  — the only writer of paid access.

No card data reaches this server. There is no endpoint that sets entitlement
from a browser request; access is written only by a signature-verified webhook.
"""

import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..config import get_settings
from ..db import get_db
from ..models import User
from ..schemas import BillingStatusOut, CheckoutOut, PlanOut, PortalOut
from ..services import billing as billing_svc
from ..services import entitlements as ent_svc

logger = logging.getLogger("sightline.billing")

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plan", response_model=PlanOut)
def get_plan() -> PlanOut:
    """Price and availability, for pricing copy. Unauthenticated on purpose."""
    settings = get_settings()
    return PlanOut.model_validate({
        "currency": "usd",
        "interval": "month",
        "standard_cents": settings.price_standard_cents,
        "launch_cents": settings.price_launch_cents,
        "active_cents": settings.active_price_cents,
        "launch_sale_active": settings.launch_price_in_effect,
        "billing_available": billing_svc.stripe_ready(),
        "paywall_enforced": settings.paywall_enforced,
    })


@router.get("/status", response_model=BillingStatusOut)
def get_status(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> BillingStatusOut:
    access = ent_svc.evaluate(db, user)
    row = ent_svc.get_entitlement(db, user.id)
    return BillingStatusOut.model_validate({
        "access": ent_svc.access_payload(access),
        "has_stripe_customer": bool(row and row.stripe_customer_id),
        "source": row.source if row else "none",
        "billing_available": billing_svc.stripe_ready(),
    })


@router.post("/checkout", response_model=CheckoutOut)
def start_checkout(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> CheckoutOut:
    """Return a Stripe-hosted Checkout URL for the caller to redirect to."""
    access = ent_svc.evaluate(db, user)
    if access.allowed and access.reason in ("role", "comp"):
        # Staff and comped accounts already have access; charging them would be
        # a bug that costs someone real money.
        return CheckoutOut(url=None, already_entitled=True, reason=access.reason)
    url = billing_svc.create_checkout_session(db, user)
    return CheckoutOut(url=url, already_entitled=False)


@router.post("/portal", response_model=PortalOut)
def open_portal(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> PortalOut:
    return PortalOut(url=billing_svc.create_portal_session(db, user))


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """Apply a Stripe event. The signature is the authentication.

    Reads the raw body — a re-serialised body would not match the signature.
    """
    payload = await request.body()
    event = billing_svc.verify_webhook(payload, request.headers.get("stripe-signature"))
    outcome = billing_svc.handle_event(db, event)
    return {"received": True, "outcome": outcome}
