"""End-to-end HTTP tests for the paywall, roles and admin surface.

These boot the real app (middleware, routers, dependency graph) rather than
calling the decision functions directly, so they catch the things unit tests
structurally cannot: a gate wired to the wrong dependency, a route registered
without its guard, a response shape the client cannot read.

Kept in its own module because it needs a different environment from the smoke
suite — Stripe configured (so the paywall is actually enforced) and an owner
address set.
"""

import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event

OWNER_EMAIL = "owner@paywall.test"
ADMIN_EMAIL = "admin@paywall.test"
DEV_EMAIL = "dev@paywall.test"
PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="module")
def ctx():
    from app import db as db_mod
    from app.config import get_settings

    data_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        ".pytest_cache",
        f"paywall-{uuid.uuid4().hex[:8]}",
    )
    saved = {
        k: os.environ.get(k)
        for k in (
            "DATA_DIR", "FIXTURES", "ANTHROPIC_API_KEY", "INSTRUCTOR_EMAILS",
            "OWNER_EMAIL", "ADMIN_EMAILS", "DEVELOPER_EMAILS",
            "REQUIRE_SUBSCRIPTION", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
            "STRIPE_PRICE_ID_STANDARD", "STRIPE_PRICE_ID_LAUNCH", "PUBLIC_BASE_URL",
        )
    }
    os.environ.update(
        {
            "DATA_DIR": data_dir,
            "FIXTURES": "0",
            "ANTHROPIC_API_KEY": "",
            "INSTRUCTOR_EMAILS": "",
            "OWNER_EMAIL": OWNER_EMAIL,
            "ADMIN_EMAILS": ADMIN_EMAIL,
            "DEVELOPER_EMAILS": DEV_EMAIL,
            # Stripe "configured" so the paywall is genuinely enforced. No call
            # is ever made to Stripe here: every test stops before checkout.
            "REQUIRE_SUBSCRIPTION": "1",
            "STRIPE_SECRET_KEY": "sk_test_dummy",
            "STRIPE_WEBHOOK_SECRET": "whsec_dummy",
            "STRIPE_PRICE_ID_STANDARD": "price_standard_dummy",
            "STRIPE_PRICE_ID_LAUNCH": "price_launch_dummy",
            "PUBLIC_BASE_URL": "http://testserver",
        }
    )
    get_settings.cache_clear()

    settings = get_settings()
    engine = create_engine(
        settings.sqlalchemy_url, connect_args={"check_same_thread": False}
    )
    event.listens_for(engine, "connect")(db_mod._set_sqlite_pragmas)
    old_engine, old_settings = db_mod.engine, db_mod.settings
    db_mod.engine = engine
    db_mod.settings = settings
    db_mod.SessionLocal.configure(bind=engine)

    from app.main import app as fastapi_app

    with TestClient(fastapi_app):
        yield {"app": fastapi_app}

    db_mod.engine, db_mod.settings = old_engine, old_settings
    db_mod.SessionLocal.configure(bind=old_engine)
    for k, v in saved.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
    get_settings.cache_clear()


def client_for(ctx, ip: str = "10.9.9.9") -> TestClient:
    return TestClient(ctx["app"], headers={"x-forwarded-for": ip})


def register(c: TestClient, email: str) -> dict:
    res = c.post(
        "/api/auth/register",
        json={"email": email, "password": PASSWORD, "displayName": "Tester"},
    )
    assert res.status_code == 201, res.text
    return res.json()["user"]


@pytest.fixture(scope="module")
def owner(ctx):
    c = client_for(ctx, "10.9.9.1")
    user = register(c, OWNER_EMAIL)
    return c, user


@pytest.fixture(scope="module")
def admin(ctx):
    c = client_for(ctx, "10.9.9.2")
    user = register(c, ADMIN_EMAIL)
    return c, user


@pytest.fixture(scope="module")
def learner(ctx):
    c = client_for(ctx, "10.9.9.3")
    user = register(c, f"learner-{uuid.uuid4().hex[:8]}@paywall.test")
    return c, user


# ── Role bootstrap ───────────────────────────────────────────────────────────


def test_owner_email_registers_as_owner_with_funds_access(owner):
    _, user = owner
    assert user["role"] == "owner"
    assert user["canAccessFunds"] is True


def test_admin_email_registers_as_admin_without_funds_access(admin):
    _, user = admin
    assert user["role"] == "admin"
    assert user["canAccessFunds"] is False, "Rad must never hold funds access"


def test_ordinary_signup_is_a_learner(learner):
    _, user = learner
    assert user["role"] == "learner"
    assert user["canAccessFunds"] is False
    assert user["isStaff"] is False


# ── Paywall ──────────────────────────────────────────────────────────────────


def test_learner_without_a_subscription_is_locked_out_of_lessons(learner):
    c, _ = learner
    res = c.get("/api/lessons/m1-l1-why-riders-crash")
    assert res.status_code == 402, res.text
    assert res.json()["error"]["code"] == "subscription_required"


def test_learner_cannot_write_progress_without_access(learner):
    c, _ = learner
    res = c.put(
        "/api/steps/m1-l1-s1/evidence",
        json={"kind": "read", "value": {"acknowledged": True}, "complete": True},
    )
    assert res.status_code == 402


def test_learner_cannot_use_the_tutor_without_access(learner):
    """The tutor spends real money per question — it must be behind the gate."""
    c, _ = learner
    res = c.post("/api/tutor/ask", json={"message": "How do I corner safely?"})
    assert res.status_code == 402


def test_the_course_map_stays_visible_so_there_is_something_to_buy(learner):
    c, _ = learner
    assert c.get("/api/course").status_code == 200


def test_staff_read_the_course_without_paying(owner, admin):
    for c, _ in (owner, admin):
        assert c.get("/api/lessons/m1-l1-why-riders-crash").status_code == 200


def test_me_reports_why_access_was_granted(owner, learner):
    oc, _ = owner
    assert oc.get("/api/auth/me").json()["user"]["access"]["reason"] == "role"
    lc, _ = learner
    assert lc.get("/api/auth/me").json()["user"]["access"]["allowed"] is False


# ── Admin permissions ────────────────────────────────────────────────────────


def test_learner_cannot_reach_the_admin_area(learner):
    c, _ = learner
    assert c.get("/api/admin/accounts").status_code == 403


def test_permissions_endpoint_reflects_the_real_rules(owner, admin):
    oc, _ = owner
    o = oc.get("/api/admin/me/permissions").json()
    assert o["canAccessFunds"] is True
    assert "instructor" in o["grantableRoles"]
    assert o["mayGrantFundsAccess"] is True

    ac, _ = admin
    a = ac.get("/api/admin/me/permissions").json()
    assert a["canAccessFunds"] is False
    assert set(a["grantableRoles"]) == {"developer", "learner"}
    assert a["mayGrantFundsAccess"] is False


def test_admin_can_create_a_developer_account(admin):
    """Rad onboarding another student worker — the case this exists for."""
    c, _ = admin
    res = c.post(
        "/api/admin/accounts",
        json={
            "email": f"worker-{uuid.uuid4().hex[:6]}@paywall.test",
            "displayName": "Student Worker",
            "role": "developer",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["account"]["role"] == "developer"
    assert body["account"]["canAccessFunds"] is False
    assert body["oneTimePassword"], "a generated password must be returned once"


def test_admin_cannot_create_an_instructor(admin):
    """Minting UAA faculty is Osama's call alone."""
    c, _ = admin
    res = c.post(
        "/api/admin/accounts",
        json={
            "email": f"faculty-{uuid.uuid4().hex[:6]}@paywall.test",
            "displayName": "Faculty",
            "role": "instructor",
        },
    )
    assert res.status_code == 403


def test_admin_cannot_create_another_admin(admin):
    c, _ = admin
    res = c.post(
        "/api/admin/accounts",
        json={
            "email": f"admin2-{uuid.uuid4().hex[:6]}@paywall.test",
            "displayName": "Admin Two",
            "role": "admin",
        },
    )
    assert res.status_code == 403


def test_owner_can_create_an_instructor(owner):
    c, _ = owner
    res = c.post(
        "/api/admin/accounts",
        json={
            "email": f"faculty-{uuid.uuid4().hex[:6]}@paywall.test",
            "displayName": "Faculty",
            "role": "instructor",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["account"]["role"] == "instructor"


def test_admin_cannot_grant_funds_access_when_creating_an_account(admin):
    c, _ = admin
    res = c.post(
        "/api/admin/accounts",
        json={
            "email": f"rich-{uuid.uuid4().hex[:6]}@paywall.test",
            "displayName": "Nope",
            "role": "developer",
            "grantFundsAccess": True,
        },
    )
    assert res.status_code == 403


# ── Funds access ─────────────────────────────────────────────────────────────


def test_admin_is_refused_the_revenue_endpoint(admin):
    c, _ = admin
    res = c.get("/api/admin/revenue")
    assert res.status_code == 403


def test_owner_reads_revenue(owner):
    c, _ = owner
    res = c.get("/api/admin/revenue")
    assert res.status_code == 200, res.text
    assert "payingSubscribers" in res.json()


def test_admin_cannot_grant_funds_access_to_anyone(admin, learner):
    c, _ = admin
    _, target = learner
    res = c.post(
        f"/api/admin/accounts/{target['id']}/funds-access",
        json={"granted": True, "reason": "trying it on"},
    )
    assert res.status_code == 403


def test_admin_cannot_grant_funds_access_to_themselves(admin):
    c, me = admin
    res = c.post(
        f"/api/admin/accounts/{me['id']}/funds-access",
        json={"granted": True, "reason": "self-promotion"},
    )
    assert res.status_code == 403


def test_owner_cannot_drop_their_own_funds_access(owner):
    """Otherwise nobody could ever grant it back."""
    c, me = owner
    res = c.post(
        f"/api/admin/accounts/{me['id']}/funds-access",
        json={"granted": False, "reason": "oops"},
    )
    assert res.status_code == 403


# ── Comps ────────────────────────────────────────────────────────────────────


def test_comping_an_account_opens_the_course(ctx, owner):
    c, _ = owner
    lc = client_for(ctx, "10.9.9.7")
    target = register(lc, f"comped-{uuid.uuid4().hex[:6]}@paywall.test")

    assert lc.get("/api/lessons/m1-l1-why-riders-crash").status_code == 402
    res = c.post(
        f"/api/admin/accounts/{target['id']}/comp",
        json={"reason": "pilot cohort"},
    )
    assert res.status_code == 200, res.text
    assert lc.get("/api/lessons/m1-l1-why-riders-crash").status_code == 200


def test_checkout_is_refused_for_an_account_that_already_has_access(owner):
    """Charging staff for something they already have would cost real money."""
    c, _ = owner
    res = c.post("/api/billing/checkout")
    assert res.status_code == 200
    body = res.json()
    assert body["alreadyEntitled"] is True
    assert body["url"] is None


# ── Audit trail ──────────────────────────────────────────────────────────────


def test_privileged_actions_are_recorded(owner):
    c, _ = owner
    entries = c.get("/api/admin/audit").json()["entries"]
    actions = {e["action"] for e in entries}
    assert "account.created" in actions
    assert "entitlement.comped" in actions
    assert "funds.viewed" in actions, "reads of revenue must be logged too"


# ── Webhook ──────────────────────────────────────────────────────────────────


def test_webhook_rejects_an_unsigned_body(ctx):
    """The signature is the only authentication on this endpoint."""
    c = client_for(ctx)
    res = c.post("/api/billing/webhook", content=b'{"id":"evt_1","type":"x"}')
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "invalid_signature"


def test_webhook_rejects_a_forged_signature(ctx):
    c = client_for(ctx)
    res = c.post(
        "/api/billing/webhook",
        content=b'{"id":"evt_1","type":"checkout.session.completed"}',
        headers={"stripe-signature": "t=1,v1=deadbeef"},
    )
    assert res.status_code == 400


# ── Cross-origin protection ──────────────────────────────────────────────────


def test_state_changing_request_from_a_foreign_origin_is_blocked(ctx):
    c = client_for(ctx)
    res = c.post(
        "/api/auth/login",
        json={"email": OWNER_EMAIL, "password": PASSWORD},
        headers={"origin": "https://evil.example"},
    )
    assert res.status_code == 403


def test_same_origin_request_is_allowed(ctx):
    c = client_for(ctx)
    res = c.post(
        "/api/auth/login",
        json={"email": OWNER_EMAIL, "password": PASSWORD},
        headers={"origin": "http://testserver"},
    )
    assert res.status_code == 200, res.text


def test_requests_without_an_origin_header_still_work(ctx):
    """Server-to-server callers send none; rejecting them breaks the webhook."""
    c = client_for(ctx)
    res = c.post("/api/auth/login", json={"email": OWNER_EMAIL, "password": PASSWORD})
    assert res.status_code == 200


# ── Security headers on the API itself ───────────────────────────────────────


def test_api_responses_carry_hardening_headers(ctx):
    c = client_for(ctx)
    res = c.get("/api/meta/health")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert "default-src 'none'" in res.headers["content-security-policy"]


# ── Account deletion ─────────────────────────────────────────────────────────
#
# The bug this pins: these models declare ForeignKey columns but no
# relationship(), so the unit of work had no dependency graph and emitted
# `DELETE FROM users` before the rows referencing it. SQLite rejected it, the
# transaction rolled back, and the caller got a 500 with all their data intact
# — an account that could never be deleted.


def _fk_children(engine):
    """Every (table, column) with a foreign key onto users.

    Derived from the live schema rather than hardcoded, so a table added later
    is covered by this test automatically instead of silently reopening the bug.
    """
    from sqlalchemy import inspect

    insp = inspect(engine)
    out = []
    for table in insp.get_table_names():
        for fk in insp.get_foreign_keys(table):
            if fk.get("referred_table") == "users":
                out.append((table, fk["constrained_columns"][0]))
    return out


def test_every_user_referencing_table_is_covered_by_the_delete(ctx):
    """The delete list must not fall behind the schema."""
    from app.db import engine
    from app.routers.auth import _DELETE_ONLY_TABLES, _EXPORT_TABLES

    covered = {m.__tablename__ for _, m in _EXPORT_TABLES}
    covered |= {m.__tablename__ for m in _DELETE_ONLY_TABLES}
    covered.add("sessions")  # handled explicitly in delete_me

    referencing = {t for t, _ in _fk_children(engine)}
    missing = referencing - covered
    assert not missing, (
        f"these tables reference users.id but are not deleted with the account: {missing}"
    )


def test_deleting_an_account_removes_it_and_every_row_it_owns(ctx):
    from sqlalchemy import text

    from app.db import SessionLocal, engine

    email = f"deleteme-{uuid.uuid4().hex[:8]}@paywall.test"
    c = client_for(ctx, "10.9.9.20")
    user = register(c, email)
    uid = user["id"]

    # Give the account a row in every table that references users, so the test
    # exercises the real constraint rather than the empty-account happy path.
    with SessionLocal() as db:
        from app.models import (
            AssessmentAttempt,
            BadgeAward,
            Certificate,
            Entitlement,
            JournalArtifact,
            LearnerState,
            LessonCompletion,
            ModuleCompletion,
            StepEvidence,
            TutorMessage,
            TutorUsage,
            XpEvent,
        )

        db.add_all([
            StepEvidence(id=f"{uid}::s", user_id=uid, step_id="s", lesson_id="l",
                         module_id="m", kind="read", value={}, complete=True),
            LessonCompletion(id=f"{uid}::l", user_id=uid, lesson_id="l", module_id="m"),
            ModuleCompletion(id=f"{uid}::m", user_id=uid, module_id="m"),
            LearnerState(user_id=uid, last_lesson_id="l", last_step_id="s"),
            XpEvent(id=uuid.uuid4().hex, user_id=uid, event="e", xp=10, label="x"),
            BadgeAward(id=f"{uid}::b", user_id=uid, badge_id="b"),
            JournalArtifact(id=f"{uid}::a", user_id=uid, artifact_type="ride_plan",
                            title="t", fields={}, module_id="m"),
            AssessmentAttempt(id=uuid.uuid4().hex, user_id=uid, score_pct=90.0,
                              passed=True, answers={}),
            Certificate(code=uuid.uuid4().hex[:10].upper(), user_id=uid, name_on_cert="T"),
            TutorMessage(id=uuid.uuid4().hex, user_id=uid, role="user", content="hi",
                         grounding="none", sources=[]),
            TutorUsage(id=uuid.uuid4().hex, user_id=uid, provider="extractive"),
            Entitlement(user_id=uid, status="active", source="comp"),
        ])
        db.commit()

    # A failed login first, so a lockout row exists on the email too.
    c.post("/api/auth/login", json={"email": email, "password": "wrong-password-here"})

    res = c.request("DELETE", "/api/auth/me", json={"confirmEmail": email})
    assert res.status_code == 204, res.text

    with engine.connect() as conn:
        gone = conn.execute(
            text("SELECT COUNT(*) FROM users WHERE id=:u"), {"u": uid}
        ).scalar_one()
        assert gone == 0, "the user row survived"

        for table, col in _fk_children(engine):
            n = conn.execute(
                text(f"SELECT COUNT(*) FROM {table} WHERE {col}=:u"), {"u": uid}
            ).scalar_one()
            assert n == 0, f"{table}.{col} still has {n} row(s) after deletion"

        # The lockout counter is keyed on email, not id — it must go too, or it
        # would follow the next person who registers that address.
        n = conn.execute(
            text("SELECT COUNT(*) FROM login_attempts WHERE email=:e"), {"e": email}
        ).scalar_one()
        assert n == 0, "a lockout row outlived the account"


def test_a_deleted_account_cannot_log_back_in(ctx):
    email = f"deleteme2-{uuid.uuid4().hex[:8]}@paywall.test"
    c = client_for(ctx, "10.9.9.21")
    register(c, email)

    assert c.request("DELETE", "/api/auth/me", json={"confirmEmail": email}).status_code == 204
    # The session is dead...
    assert c.get("/api/auth/me").status_code == 401
    # ...and the credentials no longer work.
    fresh = client_for(ctx, "10.9.9.22")
    res = fresh.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert res.status_code == 401


def test_delete_refuses_when_the_confirmation_email_does_not_match(ctx):
    email = f"keepme-{uuid.uuid4().hex[:8]}@paywall.test"
    c = client_for(ctx, "10.9.9.23")
    register(c, email)

    res = c.request("DELETE", "/api/auth/me", json={"confirmEmail": "someone.else@x.test"})
    assert res.status_code == 400
    assert c.get("/api/auth/me").status_code == 200, "the account must survive a mismatch"
