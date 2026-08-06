# ADR-005 — Retrieval Augments; It Never Gates

**Status:** Accepted. This is the single most important tutor decision.

## Context

v1's tutor refused any question that didn't lexically match its tiny approved
corpus. Users experienced a refusal machine. The requirement for this build is
explicit: the tutor answers **any ATV-safety or road-safety inquiry** — including
topics the curriculum never covers — while remaining *curriculum-aware*.

## Decision

1. Retrieval results **never** determine whether the tutor answers. They
   determine *what gets cited* and how the answer is *framed*.
2. Grounding is surfaced honestly in the UI:
   - `curriculum` — answer substantially supported by retrieved chunks; source
     chips shown, each deep-linking to its module.
   - `mixed` — partially supported; chips shown plus a "beyond the course" note.
   - `general` — no relevant chunks; tutor answers from general knowledge with a
     quiet label ("From Ranger's general knowledge — not covered in the course").
3. Curriculum-awareness is prompt-level, always on: Ranger knows the course map
   and the learner's position, relates answers back to relevant modules when a
   natural fit exists ("Module 2 covers this in the pre-ride walkaround"), and
   recommends — never requires — course sections.
4. The only non-answers are the safety triage categories in SPEC-008 §Safety
   (self-harm → supportive redirect with resources; stunt/racing technique →
   decline + safer reframe; medical dosing/diagnosis and jurisdiction-specific
   legal rulings → boundary + direction to professionals/authorities; prompt
   injection → cheerful non-compliance). Off-topic-but-harmless questions
   ("what's a good hiking boot?") get one helpful sentence + a warm steer back,
   never a refusal template.

## Consequences

- SPEC-008 defines acceptance questions covering all four grounding/behavior
  modes; they are part of the wave-1 exit criteria.
- The extractive offline fallback also follows this ADR: with no chunks it says
  so and gives its best short general-knowledge template answer, rather than
  refusing.
