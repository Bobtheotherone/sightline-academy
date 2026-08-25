"""Environment settings (pydantic-settings) per ADR-001 / SPEC-002.

Reads a `.env` at the repo root when present. All values overridable via
environment variables of the same (upper-case) name.

Deployment note (ADR-008): in production NOTHING here should come from a
`.env` file on disk. Every secret below is read from the process environment,
which is what a managed host's secret store injects. The `.env` file is a
local-development convenience only, and is gitignored.
"""

import logging
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_DIR = Path(__file__).resolve().parents[1]  # .../server
REPO_ROOT = SERVER_DIR.parent

logger = logging.getLogger("sightline.config")

# Secrets that must never be left at their development defaults once
# APP_ENV=production. Checked by `verify_production_readiness()` at startup.
_DEV_SESSION_SECRET = "dev-only-not-a-secret-change-in-prod"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Environment ──────────────────────────────────────────────────────────
    app_env: str = "development"  # 'development' | 'production'
    # Public origin of the deployed site, e.g. https://atv.sightline.academy.
    # Stripe redirects and absolute links are built from this.
    public_base_url: str = "http://localhost:8080"

    # ── Sessions / auth (SPEC-005) ───────────────────────────────────────────
    session_secret: str = _DEV_SESSION_SECRET
    secure_cookies: int = 0  # 1 => set Secure on the session cookie (HTTPS deploys)
    # Number of reverse proxies we operate in front of this app. Used to find
    # the real client address in X-Forwarded-For by counting from the RIGHT;
    # everything further left is caller-supplied and never trusted. 1 matches
    # ops/docker-compose.yml (nginx -> uvicorn). Raise it to 2 if a CDN is
    # added; set 0 if uvicorn is ever exposed directly. Over-counting
    # re-opens header spoofing, so change it only alongside the topology.
    trusted_proxy_hops: int = 1

    # ── Roles (SPEC-011) ─────────────────────────────────────────────────────
    # Role is assigned at registration by matching the email against these
    # lists, and can afterwards be changed only through the admin API by
    # someone who is permitted to grant that role.
    #
    #   owner_email      Osama. Exactly one address. The ONLY account that is
    #                    ever granted `can_access_funds`, and the only one that
    #                    can grant it to anyone else.
    #   admin_emails     Rad and any other non-faculty maintainer. Full
    #                    operational admin, deliberately NO funds access.
    #   instructor_emails  UAA faculty who teach the course.
    #   developer_emails   Student-worker contributors: free access, no admin.
    owner_email: str = ""
    admin_emails: str = ""
    instructor_emails: str = ""
    developer_emails: str = ""

    # ── Billing (SPEC-012) ───────────────────────────────────────────────────
    # The Stripe ACCOUNT these keys belong to is what actually receives money.
    # Keeping that account, and therefore these keys, under Osama's sole
    # control is what makes "only Osama has access to the funds" true at the
    # money layer; `can_access_funds` enforces it at the application layer.
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_standard: str = ""  # $10/mo recurring price
    stripe_price_id_launch: str = ""  # $5/mo launch-sale recurring price
    launch_sale_active: int = 1  # 1 => offer the launch price to new subscribers
    price_standard_cents: int = 1000  # display only; Stripe Price is authoritative
    price_launch_cents: int = 500
    # 0 => course access is not gated on payment (local dev, and the escape
    # hatch if Stripe is ever misconfigured in production so learners are not
    # locked out of a course they paid for).
    require_subscription: int = 1

    # ── LLM provider (ADR-001) ───────────────────────────────────────────────
    anthropic_api_key: str = ""
    tutor_model: str = "claude-sonnet-4-6"
    # Per-user tutor budget. The API key is personal and metered, so an
    # unbounded public endpoint is a direct financial risk, not just a load one.
    tutor_messages_per_hour: int = 30
    tutor_messages_per_day: int = 150

    # ── Boot behavior ────────────────────────────────────────────────────────
    seed_force: int = 0  # 1 => re-run the seed pipeline even if course tables are populated
    fixtures: int = 0  # 1 => create the QA-001 crawl fixture accounts (dev only)

    # ── Storage ──────────────────────────────────────────────────────────────
    # DATABASE_URL is the standard variable managed hosts inject. When it is
    # set (e.g. a managed Postgres URL) it wins; otherwise we fall back to the
    # local SQLite file. This is the single switch that takes the database off
    # any one person's computer.
    database_url: str = ""
    data_dir: str = "../data"
    content_dir: str = "../content"

    def _resolve(self, raw: str) -> Path:
        p = Path(raw)
        if not p.is_absolute():
            p = (SERVER_DIR / p).resolve()
        return p

    @property
    def data_path(self) -> Path:
        return self._resolve(self.data_dir)

    @property
    def content_path(self) -> Path:
        return self._resolve(self.content_dir)

    @property
    def curriculum_path(self) -> Path:
        return self.content_path / "curriculum"

    @property
    def corpus_path(self) -> Path:
        return self.content_path / "corpus"

    @property
    def sqlite_path(self) -> Path:
        return self.data_path / "sightline.db"

    @property
    def chroma_path(self) -> Path:
        return self.data_path / "chroma"

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def sqlalchemy_url(self) -> str:
        """Managed Postgres when DATABASE_URL is set, else the local SQLite file."""
        raw = self.database_url.strip()
        if not raw:
            return f"sqlite:///{self.sqlite_path.as_posix()}"
        # Heroku/Render historically hand out `postgres://`, which SQLAlchemy 2
        # no longer registers. Normalise, and pin the psycopg 3 driver.
        if raw.startswith("postgres://"):
            raw = "postgresql://" + raw[len("postgres://") :]
        if raw.startswith("postgresql://"):
            raw = "postgresql+psycopg://" + raw[len("postgresql://") :]
        return raw

    @property
    def uses_sqlite(self) -> bool:
        return self.sqlalchemy_url.startswith("sqlite")

    # ── Role list helpers ────────────────────────────────────────────────────

    @staticmethod
    def _email_set(raw: str) -> set[str]:
        return {e.strip().lower() for e in raw.split(",") if e.strip()}

    @property
    def owner_email_normalised(self) -> str:
        return self.owner_email.strip().lower()

    @property
    def admin_email_set(self) -> set[str]:
        return self._email_set(self.admin_emails)

    @property
    def instructor_email_set(self) -> set[str]:
        return self._email_set(self.instructor_emails)

    @property
    def developer_email_set(self) -> set[str]:
        return self._email_set(self.developer_emails)

    # ── Derived capability flags ─────────────────────────────────────────────

    @property
    def billing_configured(self) -> bool:
        """True only when Stripe can actually complete a checkout end to end."""
        return bool(
            self.stripe_secret_key
            and self.stripe_webhook_secret
            and self.active_price_id
        )

    @property
    def active_price_id(self) -> str:
        if self.launch_sale_active and self.stripe_price_id_launch:
            return self.stripe_price_id_launch
        return self.stripe_price_id_standard


    @property
    def active_price_cents(self) -> int:
        if self.launch_price_in_effect:
            return self.price_launch_cents
        return self.price_standard_cents

    @property
    def launch_price_in_effect(self) -> bool:
        """Whether the launch price is what a new subscriber actually pays.

        Distinct from the LAUNCH_SALE_ACTIVE flag on purpose: wanting a sale
        and having a Stripe Price to charge it with are different things.
        Reporting the flag alone would let the pricing page advertise "$5
        launch price" while checkout charged $10 — the kind of mismatch that
        becomes a chargeback rather than a bug report.
        """
        return bool(self.launch_sale_active and self.stripe_price_id_launch)

    @property
    def paywall_enforced(self) -> bool:
        """Gate the course only when we can also sell access to it.

        Enforcing a paywall with no working Stripe configuration would lock out
        paying learners with no way to buy their way back in — strictly worse
        than serving the course, so the gate stays closed only when billing is
        genuinely live.
        """
        return bool(self.require_subscription) and self.billing_configured

    @property
    def provider(self) -> str:
        return "anthropic" if self.anthropic_api_key else "extractive"

    @property
    def tutor_degraded_reason(self) -> str | None:
        """Why Ranger is not on the live model, or None when he is.

        An empty key used to fall through to `extractive` silently, which is
        exactly why the tutor kept appearing offline with nothing in the logs.
        Every caller that reports tutor status reads this.
        """
        if not self.anthropic_api_key:
            return "ANTHROPIC_API_KEY is not set — Ranger is answering from the corpus only."
        if not self.anthropic_api_key.startswith("sk-ant-"):
            return "ANTHROPIC_API_KEY does not look like an Anthropic key (expected sk-ant-…)."
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


def verify_production_readiness(settings: Settings | None = None) -> list[str]:
    """Return the list of production problems; refuse to boot on any of them.

    Deliberately fail-closed and loud: every item here is a way the site could
    come up looking healthy while being unsafe or unsellable.
    """
    s = settings or get_settings()
    problems: list[str] = []

    if not s.is_production:
        return problems

    if s.session_secret == _DEV_SESSION_SECRET or len(s.session_secret) < 32:
        problems.append(
            "SESSION_SECRET is the development default or too short "
            "(need >= 32 random chars). Every session cookie is forgeable until fixed."
        )
    if not s.secure_cookies:
        problems.append(
            "SECURE_COOKIES=0 in production: the session cookie would be sent over "
            "plain HTTP and is interceptable."
        )
    if not s.database_url.strip():
        problems.append(
            "DATABASE_URL is unset: the deploy would run on a container-local SQLite "
            "file and lose every learner's progress on the next restart."
        )
    if not s.public_base_url.startswith("https://"):
        problems.append("PUBLIC_BASE_URL must be an https:// origin in production.")
    if s.fixtures:
        problems.append("FIXTURES=1 in production would create known-password test accounts.")
    if s.require_subscription and not s.billing_configured:
        problems.append(
            "REQUIRE_SUBSCRIPTION=1 but Stripe is not fully configured "
            "(need STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and a price id). "
            "Learners could not buy access."
        )
    if not s.owner_email.strip():
        problems.append(
            "OWNER_EMAIL is unset: no account would hold funds access or be able to "
            "grant faculty roles."
        )
    return problems
