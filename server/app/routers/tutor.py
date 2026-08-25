"""Tutor routes (SPEC-004 §Tutor): Ranger's ask/history/suggested surface.

POST /ask runs the full SPEC-008 pipeline (tutor/pipeline.py) and returns the
shaped answer; provider timeouts raise TutorTimeoutError (an ApiError carrying
the DESIGN-005 copy), which main.py's handler maps to the envelope untouched.
POST /ask/stream (R5.6) runs the same pipeline but emits SSE: `token` events
carrying the display text, then ONE `meta` event with the non-text fields.
An ApiError after streaming starts becomes an envelope-shaped `error` event
(headers are already on the wire, so the JSON handlers can't run).
"""

import json
from functools import lru_cache

from fastapi import APIRouter, Depends, Response
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import auth as auth_svc
from ..config import get_settings
from ..db import get_db
from ..errors import ApiError
from ..ingest import ingest
from ..models import (
    Certificate,
    LearnerState,
    Lesson,
    Module,
    ModuleCompletion,
    TutorMessage,
    User,
)
from ..schemas import (
    TutorAskIn,
    TutorAskOut,
    TutorHistoryOut,
    TutorStreamMeta,
    TutorSuggestedOut,
)
from ..services import entitlements as ent_svc
from ..services import quota as quota_svc
from ..tutor import pipeline

router = APIRouter(prefix="/tutor", tags=["tutor"])

HISTORY_LIMIT = 50


@lru_cache
def chunk_meta() -> dict[str, tuple[str, str, str]]:
    """chunk id -> (title, first module ref, topic); parsed once from corpus
    front matter. Also the instructor router's chunk->topic resolver."""
    meta: dict[str, tuple[str, str, str]] = {}
    for path in sorted(get_settings().corpus_path.glob("*.md")):
        chunk_id, _, fm = ingest.parse_chunk(path)
        refs = [ref for ref in fm["module_refs"].split(",") if ref]
        meta[chunk_id] = (fm["title"], refs[0] if refs else "", fm["topic"])
    return meta


def _source_refs(chunk_ids: list) -> list[dict]:
    """Resolve stored chunk ids to SourceChip data; unknown ids are dropped."""
    refs = []
    for chunk_id in chunk_ids:
        found = chunk_meta().get(chunk_id)
        if found:
            refs.append({"chunk_id": chunk_id, "title": found[0], "module_ref": found[1]})
    return refs


@router.post("/ask", response_model=TutorAskOut)
def ask(
    body: TutorAskIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> TutorAskOut:
    if not body.message.strip():
        raise ApiError(
            422, "validation_error", "Type a question first — Ranger can't answer a blank message."
        )
    # Ranger costs real money per question and runs on a personal key, so both
    # gates are checked before any upstream call: the learner must be entitled
    # to the course at all, and must be inside their own usage allowance.
    ent_svc.require_course_access(db, user)
    quota_svc.check_tutor_quota(db, user)
    quota_svc.record_tutor_use(db, user)
    reply = pipeline.answer(db, user, body.message, body.lesson_id)
    return TutorAskOut.model_validate(
        {
            "id": reply.extra["message_id"],
            "answer_markdown": reply.text,
            "grounding": reply.grounding,
            "sources": [
                {"chunk_id": s["id"], "title": s["title"], "module_ref": s["module_ref"]}
                for s in reply.sources
            ],
            "suggestions": reply.suggestions,
            "triage": {"category": reply.triage_category} if reply.triage_category else None,
        }
    )


def _sse(event: str, data: object) -> str:
    """One SSE frame; data is JSON-encoded (never multi-line on the wire)."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/ask/stream")
def ask_stream(
    body: TutorAskIn,
    user: User = Depends(auth_svc.current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    if not body.message.strip():
        raise ApiError(
            422, "validation_error", "Type a question first — Ranger can't answer a blank message."
        )
    # Ranger costs real money per question and runs on a personal key, so both
    # gates are checked before any upstream call: the learner must be entitled
    # to the course at all, and must be inside their own usage allowance.
    ent_svc.require_course_access(db, user)
    quota_svc.check_tutor_quota(db, user)
    quota_svc.record_tutor_use(db, user)

    def event_stream():
        try:
            for kind, payload in pipeline.answer_stream(db, user, body.message, body.lesson_id):
                if kind == "token":
                    yield _sse("token", payload)
                else:  # the one closing meta event (SPEC-004)
                    reply = payload
                    meta = TutorStreamMeta.model_validate(
                        {
                            "id": reply.extra["message_id"],
                            "grounding": reply.grounding,
                            "sources": [
                                {
                                    "chunk_id": s["id"],
                                    "title": s["title"],
                                    "module_ref": s["module_ref"],
                                }
                                for s in reply.sources
                            ],
                            "suggestions": reply.suggestions,
                            "triage": (
                                {"category": reply.triage_category}
                                if reply.triage_category
                                else None
                            ),
                        }
                    )
                    yield _sse("meta", meta.model_dump(by_alias=True))
        except ApiError as exc:
            yield _sse("error", {"error": {"code": exc.code, "message": exc.message}})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history", response_model=TutorHistoryOut)
def history(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> TutorHistoryOut:
    rows = (
        db.execute(
            select(TutorMessage)
            .where(TutorMessage.user_id == user.id)
            # role asc breaks created_at ties (a pair can share a timestamp on
            # coarse clocks): after reversal the user turn precedes its reply.
            .order_by(TutorMessage.created_at.desc(), TutorMessage.role.asc())
            .limit(HISTORY_LIMIT)
        )
        .scalars()
        .all()
    )
    return TutorHistoryOut.model_validate(
        {
            "messages": [
                {
                    "id": row.id,
                    "role": row.role,
                    "content": row.content,
                    "grounding": row.grounding,
                    "sources": row.sources,
                    "source_refs": _source_refs(row.sources),
                    "triage_category": row.triage_category,
                    "created_at": row.created_at,
                }
                for row in reversed(rows)  # chronological
            ]
        }
    )


@router.delete("/history", status_code=204)
def clear_history(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> Response:
    db.execute(delete(TutorMessage).where(TutorMessage.user_id == user.id))
    db.commit()
    return Response(status_code=204)


# Context-aware starter prompts (SPEC-004: varies by learner position).
# Static maps by design — SPEC-008 pins suggestions to static pools offline.
_ORIENTATION_PROMPTS = [
    "What should I check before every ride?",
    "Why can't I ride my ATV on paved roads?",
    "What gear actually matters, and why?",
]
_MODULE_PROMPTS = {
    1: [
        "How do risk factors stack up on a ride?",
        "Why does familiarity make riders bolder?",
        "What's a pre-commitment and why does it work?",
    ],
    2: [
        "What's in the T-CLOC pre-ride walkaround?",
        "How do I know if an ATV fits me?",
        "Why does tire pressure matter so much?",
    ],
    3: [
        "What gear belongs on every single ride?",
        "How do I check that a helmet fits right?",
        "When does a helmet need replacing?",
    ],
    4: [
        "How do I read a hill before I commit to it?",
        "What makes an ATV roll over on a side-hill?",
        "How should I handle a water crossing?",
    ],
    5: [
        "What goes into a solid ride plan?",
        "How does cold change the risk picture?",
        "What belongs in my trail carry kit?",
    ],
    6: [
        "Why is pavement riskier than it looks?",
        "What's the safe way to cross a road?",
        "Can I carry a passenger on my ATV?",
    ],
}
_GRADUATE_PROMPTS = [
    "What should I practice on my first real rides?",
    "How do I find hands-on training near me?",
    "What does good trail stewardship look like?",
]


def _current_module_order(db: Session, user: User) -> int | None:
    """Order of the module the learner is working in; None when not started."""
    state = db.get(LearnerState, user.id)
    completed_ids = set(
        db.execute(
            select(ModuleCompletion.module_id).where(ModuleCompletion.user_id == user.id)
        ).scalars()
    )
    if state and state.last_lesson_id:
        lesson = db.get(Lesson, state.last_lesson_id)
        if lesson and lesson.module_id not in completed_ids:
            module = db.get(Module, lesson.module_id)
            if module:
                return module.order
    if not completed_ids:
        return None  # nothing finished, nothing in progress -> orientation
    incomplete = [
        module.order
        for module in db.execute(select(Module).order_by(Module.order)).scalars()
        if module.id not in completed_ids
    ]
    # First incomplete module; all complete (but uncertified) -> stay on the last.
    return incomplete[0] if incomplete else max(_MODULE_PROMPTS)


@router.get("/suggested", response_model=TutorSuggestedOut)
def suggested(
    user: User = Depends(auth_svc.current_user), db: Session = Depends(get_db)
) -> TutorSuggestedOut:
    graduated = (
        db.execute(select(Certificate).where(Certificate.user_id == user.id)).scalar_one_or_none()
        is not None
    )
    if graduated:
        prompts = _GRADUATE_PROMPTS
    else:
        order = _current_module_order(db, user)
        prompts = _MODULE_PROMPTS.get(order, _ORIENTATION_PROMPTS) if order else _ORIENTATION_PROMPTS
    return TutorSuggestedOut.model_validate({"prompts": list(prompts)})
