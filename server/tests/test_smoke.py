"""API smoke (QA-002 §API smoke) — the ONE allowed smoke file.

Table-driven: every SPEC-004 endpoint hit once happy-path against a seeded
test app (FastAPI TestClient over the real startup sequence: seed -> ingest ->
warm -> FIXTURES), plus the four auth failure rows (401 / 403 / 422 / 429).

Isolation notes:
- The app boots against a FRESH throwaway DATA_DIR (SQLite + Chroma both live
  there), created under the gitignored .pytest_cache and removed afterwards.
  app/db.py binds its engine at import time, so the module fixture rebinds the
  shared sessionmaker + module globals before startup runs. Teardown disposes
  the engine AND stops Chroma first (see _dispose_chroma) — Windows refuses to
  delete open files, so skipping that orphans the whole scratch dir; if one
  ever survives anyway the fixture warns instead of leaving it unmentioned.
- Ranger runs on the extractive provider (no ANTHROPIC_API_KEY) so the tutor
  rows are deterministic and offline.
- The auth rate limiter is per-IP and process-global; every persona sends its
  own X-Forwarded-For, and the 429 row hammers a dedicated IP so the lockout
  can't poison any other row.
"""

from __future__ import annotations

import os
import shutil
import uuid
import warnings
from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event

import app.db as db_mod
from app.config import get_settings
from app.ingest import ingest as ingest_mod
from app.main import app as fastapi_app
from app.models import CourseMeta
from app.services.seed import COURSE_ID

SERVER_DIR = Path(__file__).resolve().parents[1]
GRAD_EMAIL = "grad@crawl.test"
FIXTURE_PASSWORD = "crawl-pass"
INSTRUCTOR_EMAIL = "ranger.hq@smoke.test"
SMOKE_PASSWORD = "smoke-trail-mix-99"

Ctx = dict[str, object]


# ── App boot against a fresh scratch DATA_DIR ────────────────────────────────


def _dispose_chroma() -> None:
    """Close Chroma's handles on the scratch DATA_DIR before it is removed.

    Chroma keeps one System per persist path in a process-global registry and
    holds that path's sqlite file + hnsw segment files open. Dropping the
    registry entry alone only makes the release depend on garbage collection,
    so stop the System explicitly, then clear both the registry and
    app.ingest's cached client (a later get_collection() builds a fresh one).
    chromadb is imported here, not at module scope, for the same reason
    app/ingest defers it: import time.
    """
    from chromadb.api.client import SharedSystemClient

    ingest_mod._client()._system.stop()
    SharedSystemClient.clear_system_cache()
    ingest_mod._client.cache_clear()


@pytest.fixture(scope="module")
def ctx() -> Ctx:  # type: ignore[misc]
    data_dir = SERVER_DIR / ".pytest_cache" / f"smoke-data-{uuid.uuid4().hex[:8]}"
    saved_env = {
        key: os.environ.get(key)
        for key in ("DATA_DIR", "FIXTURES", "ANTHROPIC_API_KEY", "INSTRUCTOR_EMAILS")
    }
    os.environ["DATA_DIR"] = str(data_dir)
    os.environ["FIXTURES"] = "1"  # crawl fixtures give the graduate-state rows for free
    os.environ["ANTHROPIC_API_KEY"] = ""  # extractive tutor — deterministic, offline
    os.environ["INSTRUCTOR_EMAILS"] = INSTRUCTOR_EMAIL
    get_settings.cache_clear()

    # app/db.py created its engine at import time (default DATA_DIR); repoint
    # the module globals + the shared sessionmaker at the scratch database
    # before the startup sequence runs. configure() mutates the sessionmaker
    # in place, so every `from .db import SessionLocal` sees the new bind.
    settings = get_settings()
    # `database_url` is now the DATABASE_URL env field (empty here); the resolved
    # connection string lives on `sqlalchemy_url`, which falls back to SQLite.
    engine = create_engine(settings.sqlalchemy_url, connect_args={"check_same_thread": False})
    event.listens_for(engine, "connect")(db_mod._set_sqlite_pragmas)
    old_engine, old_settings = db_mod.engine, db_mod.settings
    db_mod.engine = engine
    db_mod.settings = settings
    db_mod.SessionLocal.configure(bind=engine)

    def client_for(ip: str) -> TestClient:
        """A cookie-jar-per-persona client with its own rate-limit identity."""
        return TestClient(fastapi_app, headers={"x-forwarded-for": ip})

    # Entering the context manager runs the lifespan: config -> create_all ->
    # seed -> ingest -> warm -> fixtures (SPEC-002 startup order).
    with TestClient(fastapi_app):
        context: Ctx = {"client_for": client_for}
        _build_personas(context, client_for)
        yield context

    # Let go of the scratch dir's files while DATA_DIR still names it, so a
    # rebuilt client can never land on the real data dir.
    _dispose_chroma()
    engine.dispose()

    db_mod.engine = old_engine
    db_mod.settings = old_settings
    db_mod.SessionLocal.configure(bind=old_engine)
    for key, value in saved_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    get_settings.cache_clear()
    shutil.rmtree(data_dir, ignore_errors=True)
    if data_dir.exists():
        warnings.warn(
            f"smoke: scratch DATA_DIR survived cleanup, delete it by hand: {data_dir}",
            stacklevel=1,
        )


def _build_personas(context: Ctx, client_for: Callable[[str], TestClient]) -> None:
    """Register/login the personas the table rows act as."""
    learner = client_for("10.1.1.1")
    res = learner.post(
        "/api/auth/register",
        json={
            "email": "learner@smoke.test",
            "password": SMOKE_PASSWORD,
            "displayName": "Smoke Learner",
        },
    )
    assert res.status_code == 201, res.text

    grad = client_for("10.1.1.2")
    res = grad.post(
        "/api/auth/login", json={"email": GRAD_EMAIL, "password": FIXTURE_PASSWORD}
    )
    assert res.status_code == 200, res.text

    instructor = client_for("10.1.1.3")
    res = instructor.post(
        "/api/auth/register",
        json={
            "email": INSTRUCTOR_EMAIL,
            "password": SMOKE_PASSWORD,
            "displayName": "Smoke Instructor",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["user"]["role"] == "instructor"

    # "doomed" walks the destructive auth rows: password -> export -> logout ->
    # login -> delete, so nothing else depends on its session.
    doomed = client_for("10.1.1.4")
    res = doomed.post(
        "/api/auth/register",
        json={
            "email": "doomed@smoke.test",
            "password": SMOKE_PASSWORD,
            "displayName": "Smoke Doomed",
        },
    )
    assert res.status_code == 201, res.text

    context.update(
        {"public": client_for("10.1.1.9"), "learner": learner, "grad": grad,
         "instructor": instructor, "doomed": doomed}
    )


def _client(context: Ctx, persona: str) -> TestClient:
    return context[persona]  # type: ignore[return-value]


def _passing_answers() -> dict[str, str]:
    """questionId -> correct optionId, straight from the seeded bank."""
    with db_mod.SessionLocal() as session:
        bank = session.get(CourseMeta, COURSE_ID).assessment_bank
    return {
        q["id"]: next(o["id"] for o in q["options"] if o.get("correct") is True)
        for q in bank["questions"]
    }


# ── The table: every SPEC-004 endpoint once, happy-path ──────────────────────


def row_health(context: Ctx) -> None:
    res = _client(context, "public").get("/api/meta/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok" and body["db"] == "ok"
    assert body["chroma"]["docs"] > 0
    assert body["provider"] == "extractive"


def row_register(context: Ctx) -> None:
    # Personas already exercised POST /auth/register 201 + cookie; this row
    # re-asserts the endpoint shape with one more fresh account.
    client = _client(context, "public")
    res = client.post(
        "/api/auth/register",
        json={
            "email": "register-row@smoke.test",
            "password": SMOKE_PASSWORD,
            "displayName": "Register Row",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["user"]["email"] == "register-row@smoke.test"
    assert "ts_session" in res.cookies
    client.cookies.clear()  # keep the public persona unauthenticated


def row_login(context: Ctx) -> None:
    res = _client(context, "grad").post(
        "/api/auth/login", json={"email": GRAD_EMAIL, "password": FIXTURE_PASSWORD}
    )
    assert res.status_code == 200
    user = res.json()["user"]
    assert user["email"] == GRAD_EMAIL and user["xpTotal"] > 0


def row_me(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/auth/me")
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "learner@smoke.test"
    assert set(body["state"]) == {"lastLessonId", "lastStepId"}


def row_patch_me(context: Ctx) -> None:
    res = _client(context, "learner").patch(
        "/api/auth/me", json={"displayName": "Smoke Learner Renamed"}
    )
    assert res.status_code == 200
    assert res.json()["user"]["displayName"] == "Smoke Learner Renamed"


def row_course(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/course")
    assert res.status_code == 200
    modules = res.json()["modules"]
    assert len(modules) == 6
    assert modules[0]["locked"] is False and modules[1]["locked"] is True


def row_module(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/modules/m1-riders-mindset")
    assert res.status_code == 200
    body = res.json()
    assert body["module"]["id"] == "m1-riders-mindset"
    assert len(body["lessons"]) == 3


def row_lesson(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/lessons/m1-l1-why-riders-crash")
    assert res.status_code == 200
    body = res.json()
    assert [s["id"] for s in body["steps"]] == [
        "m1-l1-s1", "m1-l1-s2", "m1-l1-s3", "m1-l1-s4"
    ]
    assert body["steps"][0]["payload"]["blocks"]  # payload passed verbatim
    assert body["evidence"] == {}


def row_put_evidence(context: Ctx) -> None:
    res = _client(context, "learner").put(
        "/api/steps/m1-l1-s1/evidence",
        json={"kind": "acknowledgement", "value": {"seen": True}, "complete": True},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["evidence"]["complete"] is True
    assert any(e["event"] == "step_complete" for e in body["xpAwarded"])


def row_progress(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/progress")
    assert res.status_code == 200
    body = res.json()
    assert len(body["modules"]) == 6
    assert body["xpTotal"] >= 5 and body["level"] >= 1
    assert body["recentXp"], "the evidence PUT should have landed in recent XP"


def row_get_assessment(context: Ctx) -> None:
    # Not a SPEC-004 table row, but the attempt UI's read path — sanitized.
    res = _client(context, "grad").get("/api/assessment/final")
    assert res.status_code == 200
    questions = res.json()["questions"]
    assert len(questions) == 20
    assert all("correct" not in o for q in questions for o in q["options"])


def row_submit_assessment(context: Ctx) -> None:
    res = _client(context, "grad").post(
        "/api/assessment/final", json={"answers": _passing_answers()}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["passed"] is True and body["scorePct"] == 100.0
    assert len(body["perQuestion"]) == 20 and all(p["feedback"] for p in body["perQuestion"])
    assert body["certificateCode"]
    context["cert_code"] = body["certificateCode"]


def row_certificate(context: Ctx) -> None:
    res = _client(context, "grad").get("/api/certificate")
    assert res.status_code == 200
    body = res.json()
    assert body["code"] == context["cert_code"]
    assert body["nameOnCert"] == "Grad Crawler"


def row_verify(context: Ctx) -> None:
    res = _client(context, "public").get(f"/api/verify/{context['cert_code']}")
    assert res.status_code == 200
    body = res.json()
    assert body["valid"] is True and body["nameOnCert"] == "Grad Crawler"
    assert "email" not in body  # no other PII (SPEC-004)


def row_journal_get(context: Ctx) -> None:
    res = _client(context, "grad").get("/api/journal")
    assert res.status_code == 200
    artifacts = res.json()["artifacts"]
    assert len(artifacts) == 6
    assert {a["status"] for a in artifacts} == {"complete"}


def row_journal_put(context: Ctx) -> None:
    res = _client(context, "learner").put(
        "/api/journal/risk_profile",
        json={
            "fields": {"experience": "Brand new — haven't ridden yet or just starting"},
            "status": "draft",
        },
    )
    assert res.status_code == 200, res.text
    artifact = res.json()["artifact"]
    assert artifact["artifactType"] == "risk_profile" and artifact["status"] == "draft"


def row_tutor_ask(context: Ctx) -> None:
    res = _client(context, "learner").post(
        "/api/tutor/ask", json={"message": "What does T-CLOC stand for?"}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["answerMarkdown"].strip()
    assert body["grounding"] in ("curriculum", "mixed", "general")
    assert isinstance(body["sources"], list) and body["suggestions"]


def row_tutor_ask_stream(context: Ctx) -> None:
    with _client(context, "learner").stream(
        "POST", "/api/tutor/ask/stream", json={"message": "Why does tire pressure matter?"}
    ) as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        events = [line for line in res.iter_lines() if line.startswith("event: ")]
    assert "event: token" in events
    assert events[-1] == "event: meta"


def row_tutor_history(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/tutor/history")
    assert res.status_code == 200
    messages = res.json()["messages"]
    assert len(messages) >= 4  # two asks -> two user+assistant pairs
    assert messages[0]["role"] == "user"
    assert all("sourceRefs" in m for m in messages)


def row_tutor_suggested(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/tutor/suggested")
    assert res.status_code == 200
    prompts = res.json()["prompts"]
    assert prompts and all(isinstance(p, str) for p in prompts)


def row_tutor_clear(context: Ctx) -> None:
    client = _client(context, "learner")
    assert client.delete("/api/tutor/history").status_code == 204
    assert client.get("/api/tutor/history").json()["messages"] == []


def row_instructor_overview(context: Ctx) -> None:
    res = _client(context, "instructor").get("/api/instructor/overview")
    assert res.status_code == 200
    body = res.json()
    assert body["learners"] >= 1
    assert len(body["moduleFunnel"]) == 6
    assert {"knowledgeCheckStats", "tutorThemes", "activeLast7d"} <= set(body)


def row_instructor_export(context: Ctx) -> None:
    res = _client(context, "instructor").get("/api/instructor/export.csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment" in res.headers["content-disposition"]
    assert res.text.strip()


def row_password_change(context: Ctx) -> None:
    res = _client(context, "doomed").post(
        "/api/auth/password",
        json={"current": SMOKE_PASSWORD, "next": "smoke-new-trail-100"},
    )
    assert res.status_code == 204


def row_export(context: Ctx) -> None:
    res = _client(context, "doomed").get("/api/auth/export")
    assert res.status_code == 200
    assert "attachment" in res.headers["content-disposition"]
    body = res.json()
    assert body["user"]["email"] == "doomed@smoke.test"
    assert "password_hash" not in body["user"]


def row_logout(context: Ctx) -> None:
    client = _client(context, "doomed")
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401  # session revoked


def row_delete_me(context: Ctx) -> None:
    client = _client(context, "doomed")
    res = client.post(
        "/api/auth/login",
        json={"email": "doomed@smoke.test", "password": "smoke-new-trail-100"},
    )
    assert res.status_code == 200  # new password took
    res = client.request(
        "DELETE", "/api/auth/me", json={"confirmEmail": "doomed@smoke.test"}
    )
    assert res.status_code == 204
    res = client.post(
        "/api/auth/login",
        json={"email": "doomed@smoke.test", "password": "smoke-new-trail-100"},
    )
    assert res.status_code == 401  # hard-deleted


# ── Auth failure rows (QA-002: 401 / 403 / 422 / 429) ────────────────────────


def row_401_unauthenticated(context: Ctx) -> None:
    res = _client(context, "public").get("/api/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"


def row_403_non_instructor(context: Ctx) -> None:
    res = _client(context, "learner").get("/api/instructor/overview")
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "forbidden"


def row_422_bad_register(context: Ctx) -> None:
    res = _client(context, "public").post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "short", "displayName": "X"},
    )
    assert res.status_code == 422
    error = res.json()["error"]
    assert error["code"] == "validation_error" and error["message"]


def row_429_login_hammer(context: Ctx) -> None:
    # Dedicated IP so the lockout can't leak into any other row.
    client_for: Callable[[str], TestClient] = context["client_for"]  # type: ignore[assignment]
    hammer = client_for("10.66.6.6")
    for _ in range(8):
        res = hammer.post(
            "/api/auth/login", json={"email": GRAD_EMAIL, "password": "wrong-pass"}
        )
        assert res.status_code == 401
    res = hammer.post(
        "/api/auth/login", json={"email": GRAD_EMAIL, "password": FIXTURE_PASSWORD}
    )
    assert res.status_code == 429
    assert res.json()["error"]["code"] == "rate_limited"


SMOKE_TABLE: list[Callable[[Ctx], None]] = [
    row_health,
    row_register,
    row_login,
    row_me,
    row_patch_me,
    row_course,
    row_module,
    row_lesson,
    row_put_evidence,
    row_progress,
    row_get_assessment,
    row_submit_assessment,
    row_certificate,
    row_verify,
    row_journal_get,
    row_journal_put,
    row_tutor_ask,
    row_tutor_ask_stream,
    row_tutor_history,
    row_tutor_suggested,
    row_tutor_clear,
    row_instructor_overview,
    row_instructor_export,
    row_password_change,
    row_export,
    row_logout,
    row_delete_me,
    row_401_unauthenticated,
    row_403_non_instructor,
    row_422_bad_register,
    row_429_login_hammer,
]


@pytest.mark.parametrize("row", SMOKE_TABLE, ids=lambda row: row.__name__.removeprefix("row_"))
def test_smoke(row: Callable[[Ctx], None], ctx: Ctx) -> None:
    row(ctx)
