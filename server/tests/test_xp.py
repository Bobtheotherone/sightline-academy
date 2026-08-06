"""XP-rules unit tests (QA-003 target 2): rules fire once, forbidden signals
throw, risky choices never award, level boundaries."""

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401  (registers tables on Base)
from app.db import Base
from app.models import XpEvent
from app.services import xp
from app.services.xp import ForbiddenSignalError

USER = "user-1"


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine)() as session:
        yield session


def test_each_rule_fires_once(db: Session) -> None:
    for event, value in xp.XP_RULES.items():
        first = xp.award(db, USER, event, label=f"{event} label", ref=f"{event}:subject")
        assert first is not None and first.xp == value
        db.flush()
        again = xp.award(db, USER, event, label=f"{event} label", ref=f"{event}:subject")
        assert again is None, f"{event} fired twice for one ref"
    rows = db.execute(select(XpEvent).where(XpEvent.user_id == USER)).scalars().all()
    assert len(rows) == len(xp.XP_RULES)
    assert xp.xp_total(db, USER) == sum(xp.XP_RULES.values())


def test_forbidden_event_names_throw(db: Session) -> None:
    for signal in xp.FORBIDDEN_SIGNALS:
        with pytest.raises(ForbiddenSignalError):
            xp.award(db, USER, f"{signal}_bonus", label="never")


def test_forbidden_metadata_throws(db: Session) -> None:
    with pytest.raises(ForbiddenSignalError):
        xp.award(db, USER, "step_complete", label="x", metadata={"time_to_complete": 12})
    with pytest.raises(ForbiddenSignalError):
        xp.award(db, USER, "step_complete", label="x", metadata={"note": "leaderboard"})


def test_unknown_event_rejected(db: Session) -> None:
    with pytest.raises(ValueError, match="unknown XP event"):
        xp.award(db, USER, "participation_trophy", label="x")


SCENARIO = {
    "startNode": "n1",
    "nodes": [
        {
            "id": "n1",
            "choices": [
                {"id": "risky1", "quality": "risky", "next": "n1"},
                {"id": "best1", "quality": "best", "next": "n2"},
            ],
        },
        {
            "id": "n2",
            "choices": [
                {"id": "best2", "quality": "best", "next": None},
                {"id": "okay2", "quality": "okay", "next": None},
            ],
        },
    ],
}


def test_risky_choice_never_awards(db: Session) -> None:
    with pytest.raises(ForbiddenSignalError):
        xp.award(db, USER, "scenario_best_path", label="x", metadata={"quality": "risky"})
    # A risky traversal earns nothing…
    assert not xp.best_path_traversed(SCENARIO, [{"nodeId": "n1", "choiceId": "risky1"}])
    # …an okay ending is not the best path…
    assert not xp.best_path_traversed(
        SCENARIO,
        [{"nodeId": "n1", "choiceId": "best1"}, {"nodeId": "n2", "choiceId": "okay2"}],
    )
    # …but retaking the best line after a risky detour counts (revisits count).
    assert xp.best_path_traversed(
        SCENARIO,
        [
            {"nodeId": "n1", "choiceId": "risky1"},
            {"nodeId": "n1", "choiceId": "best1"},
            {"nodeId": "n2", "choiceId": "best2"},
        ],
    )


def test_level_boundaries() -> None:
    cases = [
        (0, 1, "Trailhead"),
        (99, 1, "Trailhead"),
        (100, 2, "Greenhorn"),
        (249, 2, "Greenhorn"),
        (250, 3, "Pathfinder"),
        (449, 3, "Pathfinder"),
        (450, 4, "Trailhand"),
        (699, 4, "Trailhand"),
        (700, 5, "Ridge Runner"),
        (999, 5, "Ridge Runner"),
        (1000, 6, "Wayfinder"),
        (1399, 6, "Wayfinder"),
        (1400, 7, "Trail Boss"),
        (9999, 7, "Trail Boss"),
    ]
    for total, level, title in cases:
        assert xp.level_for(total) == level, total
        assert xp.level_title(level) == title


def test_level_progress() -> None:
    assert xp.level_progress(0) == 0.0
    assert xp.level_progress(50) == 0.5
    assert xp.level_progress(100) == 0.0  # fresh into Greenhorn
    assert xp.level_progress(175) == 0.5
    assert xp.level_progress(1400) == 1.0
    assert xp.level_progress(2000) == 1.0
