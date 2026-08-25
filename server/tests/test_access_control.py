"""Access-control invariants (SPEC-011 roles, SPEC-012 entitlement, SPEC-005 auth).

These are deliberately unit-level: they exercise the decision functions
directly rather than booting the app, so the rules that matter most run in
milliseconds and can be read as an executable statement of policy.

The headline invariant, in one sentence: **only an account that already holds
funds access can confer it, and Rad's `admin` role can never obtain it.**
"""

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import Settings, verify_production_readiness
from app.db import Base
from app.errors import ApiError
from app.models import Entitlement, User
from app.services import entitlements as ent_svc
from app.services import roles as roles_svc

OWNER_EMAIL = "osama@alaska.edu"
ADMIN_EMAIL = "rad@alaska.edu"
DEV_EMAIL = "student.worker@alaska.edu"
INSTRUCTOR_EMAIL = "faculty@alaska.edu"


def bare_settings(**overrides) -> Settings:
    """Settings built from explicit values only.

    ``_env_file=None`` detaches the repo's local ``.env``. Without it these
    tests would silently read the developer's own secrets and pass or fail
    depending on whose machine they ran on — which is exactly the kind of
    environment bleed a production-readiness check must not have.
    """
    return Settings(_env_file=None, **overrides)



@pytest.fixture()
def db():
    """A throwaway in-memory database with the real schema."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()


def make_user(db, *, role=roles_svc.ROLE_LEARNER, funds=False, email=None) -> User:
    user = User(
        id=uuid.uuid4().hex,
        email=email or f"{uuid.uuid4().hex[:8]}@example.com",
        display_name="Test",
        password_hash="x",
        role=role,
        can_access_funds=funds,
    )
    db.add(user)
    db.commit()
    return user


# ── Who may grant what ───────────────────────────────────────────────────────


def test_owner_may_create_every_non_owner_role():
    grantable = roles_svc.grantable_roles(roles_svc.ROLE_OWNER)
    assert roles_svc.ROLE_INSTRUCTOR in grantable, "Osama must be able to make faculty accounts"
    assert roles_svc.ROLE_ADMIN in grantable
    assert roles_svc.ROLE_DEVELOPER in grantable
    assert roles_svc.ROLE_LEARNER in grantable


def test_admin_may_create_developers_but_not_faculty_or_admins():
    """Rad can onboard student workers; minting faculty stays with Osama."""
    grantable = roles_svc.grantable_roles(roles_svc.ROLE_ADMIN)
    assert roles_svc.ROLE_DEVELOPER in grantable
    assert roles_svc.ROLE_LEARNER in grantable
    assert roles_svc.ROLE_INSTRUCTOR not in grantable
    assert roles_svc.ROLE_ADMIN not in grantable
    assert roles_svc.ROLE_OWNER not in grantable


@pytest.mark.parametrize(
    "role", [roles_svc.ROLE_LEARNER, roles_svc.ROLE_DEVELOPER, roles_svc.ROLE_INSTRUCTOR]
)
def test_non_admin_roles_may_create_nothing(role):
    assert roles_svc.grantable_roles(role) == frozenset()


def test_nobody_can_grant_the_owner_role_through_the_api():
    """Ownership is bootstrapped from configuration, never handed out at runtime."""
    for role in roles_svc.ALL_ROLES:
        assert not roles_svc.may_grant_role(role, roles_svc.ROLE_OWNER)


# ── Funds access: the single-account invariant ───────────────────────────────


def test_only_a_funds_holder_can_grant_funds_access():
    assert roles_svc.may_grant_funds_access(True) is True
    assert roles_svc.may_grant_funds_access(False) is False


def test_admin_role_alone_never_confers_funds_access(db):
    """Rad is a full admin and still cannot reach or pass on the money."""
    rad = make_user(db, role=roles_svc.ROLE_ADMIN, funds=False, email=ADMIN_EMAIL)
    assert rad.can_access_funds is False
    assert roles_svc.may_grant_funds_access(rad.can_access_funds) is False


def test_owner_holds_funds_access_and_can_grant_it(db):
    osama = make_user(db, role=roles_svc.ROLE_OWNER, funds=True, email=OWNER_EMAIL)
    assert roles_svc.may_grant_funds_access(osama.can_access_funds) is True


def test_funds_access_is_independent_of_role(db):
    """The flag is what is checked, so promoting someone does not fund them."""
    promoted = make_user(db, role=roles_svc.ROLE_OWNER, funds=False)
    assert roles_svc.may_grant_funds_access(promoted.can_access_funds) is False


# ── Role assignment from configured allowlists ───────────────────────────────


def _role_for(email: str) -> str:
    return roles_svc.role_from_email(
        email,
        owner_email=OWNER_EMAIL,
        admin_emails={ADMIN_EMAIL},
        instructor_emails={INSTRUCTOR_EMAIL},
        developer_emails={DEV_EMAIL},
    )


def test_allowlists_map_to_expected_roles():
    assert _role_for(OWNER_EMAIL) == roles_svc.ROLE_OWNER
    assert _role_for(ADMIN_EMAIL) == roles_svc.ROLE_ADMIN
    assert _role_for(INSTRUCTOR_EMAIL) == roles_svc.ROLE_INSTRUCTOR
    assert _role_for(DEV_EMAIL) == roles_svc.ROLE_DEVELOPER


def test_unknown_address_is_a_learner():
    assert _role_for("stranger@example.com") == roles_svc.ROLE_LEARNER


def test_allowlist_matching_ignores_case_and_padding():
    assert _role_for(f"  {OWNER_EMAIL.upper()}  ") == roles_svc.ROLE_OWNER


def test_owner_wins_when_an_address_appears_on_several_lists():
    role = roles_svc.role_from_email(
        OWNER_EMAIL,
        owner_email=OWNER_EMAIL,
        admin_emails={OWNER_EMAIL},
        instructor_emails={OWNER_EMAIL},
        developer_emails={OWNER_EMAIL},
    )
    assert role == roles_svc.ROLE_OWNER


# ── Instructor area membership ───────────────────────────────────────────────


def test_developers_cannot_read_learner_records():
    """Contributing code is no reason to see classmates' progress."""
    assert roles_svc.may_view_instructor_area(roles_svc.ROLE_DEVELOPER) is False
    assert roles_svc.may_view_instructor_area(roles_svc.ROLE_LEARNER) is False
    assert roles_svc.may_view_instructor_area(roles_svc.ROLE_INSTRUCTOR) is True
    assert roles_svc.may_view_instructor_area(roles_svc.ROLE_OWNER) is True


# ── Entitlement / paywall ────────────────────────────────────────────────────


@pytest.fixture()
def paid_settings(monkeypatch):
    """Settings with a fully configured Stripe, so the paywall is enforced."""
    from app import config as config_mod

    settings = bare_settings(
        require_subscription=1,
        stripe_secret_key="sk_test_x",
        stripe_webhook_secret="whsec_x",
        stripe_price_id_standard="price_standard",
        stripe_price_id_launch="price_launch",
    )
    monkeypatch.setattr(config_mod, "get_settings", lambda: settings)
    monkeypatch.setattr(ent_svc, "get_settings", lambda: settings)
    return settings


def test_paywall_blocks_a_learner_with_no_subscription(db, paid_settings):
    learner = make_user(db)
    access = ent_svc.evaluate(db, learner)
    assert access.allowed is False
    with pytest.raises(ApiError) as exc:
        ent_svc.require_course_access(db, learner)
    assert exc.value.status_code == 402


@pytest.mark.parametrize(
    "role",
    [
        roles_svc.ROLE_DEVELOPER,
        roles_svc.ROLE_INSTRUCTOR,
        roles_svc.ROLE_ADMIN,
        roles_svc.ROLE_OWNER,
    ],
)
def test_staff_never_pay(db, paid_settings, role):
    """'Admins must not have to pay', generalised to everyone who works on it."""
    staff = make_user(db, role=role)
    access = ent_svc.evaluate(db, staff)
    assert access.allowed is True
    assert access.reason == "role"


def test_active_subscription_opens_the_course(db, paid_settings):
    learner = make_user(db)
    ent_svc.upsert(db, learner.id, status=ent_svc.STATUS_ACTIVE, source="stripe")
    assert ent_svc.evaluate(db, learner).allowed is True


def test_past_due_keeps_access_while_stripe_retries(db, paid_settings):
    """A failed renewal is a billing problem, not grounds for eviction mid-course."""
    learner = make_user(db)
    ent_svc.upsert(db, learner.id, status=ent_svc.STATUS_PAST_DUE, source="stripe")
    assert ent_svc.evaluate(db, learner).allowed is True


def test_cancelled_subscription_keeps_the_period_already_paid_for(db, paid_settings):
    from datetime import UTC, datetime, timedelta

    learner = make_user(db)
    future = (datetime.now(UTC) + timedelta(days=10)).isoformat()
    ent_svc.upsert(
        db,
        learner.id,
        status=ent_svc.STATUS_CANCELED,
        source="stripe",
        current_period_end=future,
        cancel_at_period_end=True,
    )
    assert ent_svc.evaluate(db, learner).allowed is True


def test_cancelled_subscription_closes_once_the_period_lapses(db, paid_settings):
    from datetime import UTC, datetime, timedelta

    learner = make_user(db)
    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    ent_svc.upsert(
        db,
        learner.id,
        status=ent_svc.STATUS_CANCELED,
        source="stripe",
        current_period_end=past,
    )
    access = ent_svc.evaluate(db, learner)
    assert access.allowed is False
    assert access.reason == "expired"


def test_comped_account_reads_free(db, paid_settings):
    learner = make_user(db)
    ent_svc.upsert(
        db, learner.id, status=ent_svc.STATUS_ACTIVE, source="comp", note="pilot cohort"
    )
    access = ent_svc.evaluate(db, learner)
    assert access.allowed is True
    assert access.reason == "comp"


def test_paywall_fails_open_when_stripe_is_not_configured(db, monkeypatch):
    """Never lock out paying learners because our own billing config broke."""
    from app import config as config_mod

    settings = bare_settings(require_subscription=1)  # no Stripe keys
    monkeypatch.setattr(config_mod, "get_settings", lambda: settings)
    monkeypatch.setattr(ent_svc, "get_settings", lambda: settings)

    assert settings.billing_configured is False
    assert settings.paywall_enforced is False
    access = ent_svc.evaluate(db, make_user(db))
    assert access.allowed is True
    assert access.reason == "paywall_disabled"


def test_upsert_does_not_blank_stripe_ids_on_a_partial_update(db):
    learner = make_user(db)
    ent_svc.upsert(
        db,
        learner.id,
        status=ent_svc.STATUS_ACTIVE,
        source="stripe",
        stripe_customer_id="cus_1",
        stripe_subscription_id="sub_1",
    )
    ent_svc.upsert(db, learner.id, status=ent_svc.STATUS_PAST_DUE, source="stripe")
    row = db.get(Entitlement, learner.id)
    assert row.stripe_customer_id == "cus_1"
    assert row.stripe_subscription_id == "sub_1"


# ── Pricing configuration ────────────────────────────────────────────────────


def test_launch_sale_selects_the_discounted_price():
    s = bare_settings(
        launch_sale_active=1,
        stripe_price_id_standard="price_standard",
        stripe_price_id_launch="price_launch",
        price_standard_cents=1000,
        price_launch_cents=500,
    )
    assert s.active_price_id == "price_launch"
    assert s.active_price_cents == 500


def test_price_reverts_to_standard_when_the_sale_ends():
    s = bare_settings(
        launch_sale_active=0,
        stripe_price_id_standard="price_standard",
        stripe_price_id_launch="price_launch",
        price_standard_cents=1000,
        price_launch_cents=500,
    )
    assert s.active_price_id == "price_standard"
    assert s.active_price_cents == 1000


# ── Production readiness gate ────────────────────────────────────────────────


def test_development_defaults_are_not_flagged():
    assert verify_production_readiness(bare_settings(app_env="development")) == []


def test_production_refuses_dev_secret_and_plain_cookies():
    problems = verify_production_readiness(bare_settings(app_env="production"))
    joined = " ".join(problems)
    assert "SESSION_SECRET" in joined
    assert "SECURE_COOKIES" in joined
    assert "DATABASE_URL" in joined
    assert "OWNER_EMAIL" in joined


def test_production_refuses_test_fixture_accounts():
    problems = verify_production_readiness(bare_settings(app_env="production", fixtures=1))
    assert any("FIXTURES" in p for p in problems)


def test_a_fully_configured_production_passes():
    problems = verify_production_readiness(
        bare_settings(
            app_env="production",
            session_secret="a" * 64,
            secure_cookies=1,
            database_url="postgresql://user:pw@host/db",
            public_base_url="https://atv.example.edu",
            owner_email=OWNER_EMAIL,
            require_subscription=1,
            stripe_secret_key="sk_live_x",
            stripe_webhook_secret="whsec_x",
            stripe_price_id_standard="price_x",
            launch_sale_active=0,
        )
    )
    assert problems == []


# ── Database URL normalisation ───────────────────────────────────────────────


def test_postgres_scheme_is_normalised_for_sqlalchemy():
    """Managed hosts hand out `postgres://`, which SQLAlchemy 2 refuses."""
    s = bare_settings(database_url="postgres://u:p@host:5432/db")
    assert s.sqlalchemy_url.startswith("postgresql+psycopg://")
    assert s.uses_sqlite is False


def test_empty_database_url_falls_back_to_local_sqlite():
    s = bare_settings(database_url="")
    assert s.uses_sqlite is True
    assert s.sqlalchemy_url.startswith("sqlite:///")


# ── Tutor degradation reporting ──────────────────────────────────────────────


def test_missing_key_is_reported_rather_than_silently_downgraded():
    s = bare_settings(anthropic_api_key="")
    assert s.provider == "extractive"
    assert s.tutor_degraded_reason is not None


def test_malformed_key_is_caught_before_it_looks_connected():
    """A truthy-but-wrong key used to show as online while every answer failed."""
    s = bare_settings(anthropic_api_key="not-a-real-key")
    assert s.tutor_degraded_reason is not None


def test_valid_key_reports_no_degradation():
    s = bare_settings(anthropic_api_key="sk-ant-" + "x" * 60)
    assert s.provider == "anthropic"
    assert s.tutor_degraded_reason is None


# ── Forwarded-header spoofing (the brute-force bypass) ───────────────────────
#
# The original limiter keyed on the LEFTMOST X-Forwarded-For entry, which the
# caller writes. Every proxy appends rather than replaces, so an attacker who
# varied that header got a fresh failure bucket per request and the lockout
# never fired. These tests pin the fix: the identity must come from the right
# of the chain, counting only hops we actually operate.


def _request(peer: str, xff: str | None = None):
    """Minimal Starlette request with a chosen socket peer and XFF header."""
    from starlette.requests import Request

    headers = []
    if xff is not None:
        headers.append((b"x-forwarded-for", xff.encode()))
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": headers,
            "client": (peer, 12345),
            "scheme": "http",
            "server": ("test", 80),
            "query_string": b"",
        }
    )


@pytest.fixture()
def one_proxy(monkeypatch):
    """The shipped topology: exactly one reverse proxy (nginx) in front."""
    from app import auth as auth_mod

    settings = bare_settings(trusted_proxy_hops=1)
    monkeypatch.setattr(auth_mod, "get_settings", lambda: settings)
    return settings


def test_spoofed_forwarded_entries_cannot_change_the_identity(one_proxy):
    """The attack: vary the header per request to dodge the lockout.

    nginx appends the real peer, so the chain the app sees is
    ``<spoofed...>, <real client>`` with the nginx address as the socket peer.
    Whatever the attacker puts on the left, the resolved identity must not move.
    """
    from app.auth import client_ip

    real = "203.0.113.9"
    nginx = "172.18.0.5"

    baseline = client_ip(_request(nginx, f"{real}"))
    assert baseline == real

    for spoof in ("1.1.1.1", "evil", "9.9.9.9, 8.8.8.8", "127.0.0.1"):
        # What nginx actually forwards: the client's claim, then the real peer.
        resolved = client_ip(_request(nginx, f"{spoof}, {real}"))
        assert resolved == real, f"identity moved to {resolved!r} for spoof {spoof!r}"


def test_a_long_fabricated_chain_still_resolves_to_the_real_client(one_proxy):
    from app.auth import client_ip

    real = "203.0.113.9"
    chain = "1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, " + real
    assert client_ip(_request("172.18.0.5", chain)) == real


def test_forwarded_headers_are_ignored_when_the_peer_is_public(one_proxy):
    """If uvicorn is ever exposed directly, trust nothing but the socket."""
    from app.auth import client_ip

    # A genuinely globally-routable peer. Documentation ranges such as
    # 198.51.100.0/24 are NOT usable here: Python's ipaddress treats them as
    # non-global, so they would exercise the internal-peer path instead.
    public_peer = "8.8.8.8"
    assert client_ip(_request(public_peer, "1.2.3.4, 5.6.7.8")) == public_peer


def test_zero_hops_ignores_the_header_entirely(monkeypatch):
    from app import auth as auth_mod
    from app.auth import client_ip

    monkeypatch.setattr(auth_mod, "get_settings", lambda: bare_settings(trusted_proxy_hops=0))
    assert client_ip(_request("172.18.0.5", "1.2.3.4")) == "172.18.0.5"


def test_missing_header_falls_back_to_the_socket_peer(one_proxy):
    from app.auth import client_ip

    assert client_ip(_request("172.18.0.5")) == "172.18.0.5"


def test_short_chain_falls_back_rather_than_trusting_the_left_entry(one_proxy):
    """Fewer entries than configured hops means the request skipped the proxy."""
    from app.auth import client_ip

    # Direct hit on the API from inside the network, with a forged header.
    assert client_ip(_request("172.18.0.5", "")) == "172.18.0.5"


# ── Per-account lockout (immune to any network-identity trick) ───────────────


def test_account_lockout_fires_after_repeated_failures(db):
    from app import auth as auth_mod

    email = "victim@example.com"
    for _ in range(auth_mod.ACCOUNT_MAX_FAILURES - 1):
        auth_mod.record_account_failure(db, email)
    auth_mod.check_account_lock(db, email)  # still under the limit

    auth_mod.record_account_failure(db, email)
    with pytest.raises(ApiError) as exc:
        auth_mod.check_account_lock(db, email)
    assert exc.value.status_code == 429


def test_account_lockout_is_keyed_on_the_account_not_the_caller(db):
    """This is what survives header spoofing: the target cannot be rotated."""
    from app import auth as auth_mod

    email = "victim@example.com"
    for _ in range(auth_mod.ACCOUNT_MAX_FAILURES):
        auth_mod.record_account_failure(db, email)

    # A different source address changes nothing — the counter is on the email.
    with pytest.raises(ApiError):
        auth_mod.check_account_lock(db, email)
    # An untouched account is unaffected.
    auth_mod.check_account_lock(db, "someone.else@example.com")


def test_successful_login_clears_the_account_counter(db):
    from app import auth as auth_mod

    email = "learner@example.com"
    auth_mod.record_account_failure(db, email)
    auth_mod.clear_account_failures(db, email)
    auth_mod.check_account_lock(db, email)  # no raise


def test_case_and_padding_cannot_split_the_account_counter(db):
    """`Victim@x.com ` and `victim@x.com` must share one bucket."""
    from app import auth as auth_mod

    for _ in range(auth_mod.ACCOUNT_MAX_FAILURES):
        auth_mod.record_account_failure(db, "  VICTIM@example.com ")
    with pytest.raises(ApiError):
        auth_mod.check_account_lock(db, "victim@example.com")


def test_in_memory_ip_buckets_are_bounded(monkeypatch):
    """Attacker-chosen keys must not grow the process without limit."""
    from app.auth import MAX_TRACKED_IPS, AuthRateLimiter

    limiter = AuthRateLimiter()
    for i in range(MAX_TRACKED_IPS + 500):
        limiter.record_failure(f"10.0.{i // 256}.{i % 256}")
    assert len(limiter._failures) <= MAX_TRACKED_IPS


def test_launch_sale_is_only_advertised_when_it_can_be_charged():
    """Advertising $5 while checkout charges $10 is a chargeback, not a bug."""
    s = bare_settings(
        launch_sale_active=1,
        stripe_price_id_standard="price_standard",
        stripe_price_id_launch="",  # flag on, but no price to charge
        price_standard_cents=1000,
        price_launch_cents=500,
    )
    assert s.launch_price_in_effect is False
    assert s.active_price_cents == 1000
    assert s.active_price_id == "price_standard"
