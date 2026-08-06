"""Seed-parser unit tests (QA-003 target 1): malformed content fails loudly,
good real content round-trips, knowledge-check single-isBest rule."""

from pathlib import Path

import pytest

from app.services.seed import SeedError, parse_course, parse_module_file

REAL_CURRICULUM = Path(__file__).resolve().parents[2] / "content" / "curriculum"

GOOD_MODULE = """---
id: t1-module
order: 1
title: Test Module
tagline: A tagline.
mission: A mission.
estimated_minutes: 10
badge_id: b-mindset
hero_slot: hero-test
objectives:
  - Objective one
---

# Lesson: Test Lesson

```yaml lesson
id: t1-l1
order: 1
summary: A summary.
estimated_minutes: 10
```

Author commentary between blocks is ignored.

## Step: Reading

```yaml step
id: t1-l1-s1
section: learn
renderer: content
minutes: 2
required: true
```

```json payload
{"instructions": "Read.", "blocks": [{"type": "text", "md": "Hello."}]}
```

## Step: Check

```yaml step
id: t1-l1-s2
section: checkpoint
renderer: checkpoint
minutes: 2
required: true
```

```json payload
{"instructions": "Check.", "mode": "multiple_choice", "passCopy": "Good.",
 "reviseCopy": "Again.", "inner": {"prompt": "Pick.", "options": [
 {"id": "a", "text": "A", "isBest": true, "feedback": "Yes."},
 {"id": "b", "text": "B", "isBest": false, "feedback": "No."}]}}
```
"""

EXTRA_STEP_AFTER_CHECKPOINT = """
## Step: Late arrival

```yaml step
id: t1-l1-s3
section: learn
renderer: content
minutes: 1
required: true
```

```json payload
{"instructions": "Too late.", "blocks": [{"type": "text", "md": "Nope."}]}
```
"""


def _write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "module-99-test.md"
    path.write_text(text, encoding="utf-8")
    return path


def test_good_module_parses(tmp_path: Path) -> None:
    module = parse_module_file(_write(tmp_path, GOOD_MODULE))
    assert module.id == "t1-module"
    assert [lesson.id for lesson in module.lessons] == ["t1-l1"]
    steps = module.lessons[0].steps
    assert [s.id for s in steps] == ["t1-l1-s1", "t1-l1-s2"]
    assert steps[0].payload["instructions"] == "Read."
    assert module.lessons[0].sections_present == ["learn", "checkpoint"]


def test_missing_front_matter_key_fails(tmp_path: Path) -> None:
    broken = GOOD_MODULE.replace("badge_id: b-mindset\n", "")
    with pytest.raises(SeedError, match=r"module-99-test\.md.*badge_id"):
        parse_module_file(_write(tmp_path, broken))


def test_two_is_best_fails(tmp_path: Path) -> None:
    broken = GOOD_MODULE.replace('"isBest": false', '"isBest": true')
    with pytest.raises(SeedError, match=r"t1-l1-s2.*exactly one"):
        parse_module_file(_write(tmp_path, broken))


def test_zero_is_best_fails(tmp_path: Path) -> None:
    broken = GOOD_MODULE.replace('"isBest": true,', '"isBest": false,')
    with pytest.raises(SeedError, match=r"t1-l1-s2.*exactly one"):
        parse_module_file(_write(tmp_path, broken))


def test_checkpoint_not_last_fails(tmp_path: Path) -> None:
    broken = GOOD_MODULE + EXTRA_STEP_AFTER_CHECKPOINT
    with pytest.raises(SeedError, match=r"t1-l1-s3 follows the\ncheckpoint|follows the"):
        parse_module_file(_write(tmp_path, broken))


def test_bad_json_payload_fails(tmp_path: Path) -> None:
    broken = GOOD_MODULE.replace('{"instructions": "Read.",', '{"instructions": "Read."')
    with pytest.raises(SeedError, match=r"t1-l1-s1.*not valid JSON"):
        parse_module_file(_write(tmp_path, broken))


def test_real_content_round_trips() -> None:
    course = parse_course(REAL_CURRICULUM)
    assert len(course.modules) == 6
    lessons = [lesson for module in course.modules for lesson in module.lessons]
    steps = [step for lesson in lessons for step in lesson.steps]
    assert len(lessons) == 22
    assert len(steps) == 59
    assert len(course.assessment["questions"]) == 20
    assert len(course.version) == 64  # sha256 of the concatenated content files
    # Deterministic: parsing again yields the same version hash.
    assert parse_course(REAL_CURRICULUM).version == course.version
