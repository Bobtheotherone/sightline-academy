# LEGACY NOTES — What v1 (Sightline Safety Academy_Online_Module) Taught Us

The v1 repo is **not** part of this handoff and must not be resurrected. Its
frontend source was lost (only minified bundles remained) and its content lived in
a database export outside the repo — a hard lesson that informs ADR-006
(content-as-code). This file records what we deliberately keep, adapt, or drop.

## KEEP (concepts re-specified in this handoff)

1. **The mission/step interaction taxonomy.** v1's renderer set
   (content, prediction_reveal, multiple_choice, sort_categorize, match,
   hotspot_list, branching_decision, structured_response, journal_builder,
   reflection, lab_objective, checkpoint) was its best idea. SPEC-007 carries it
   forward with cleaned-up contracts.
2. **The Field Journal.** Learners assembling persistent artifacts (risk map,
   preparation card, hazard brief, ride/communication plan) across modules, then
   drawing on them in the capstone — this created real continuity. Kept and
   expanded (SPEC-006 §Journal).
3. **Evidence-based completion.** Steps complete when the learner produces
   evidence (a choice + reason, a classification, a written response), not when a
   timer elapses. Kept (SPEC-006 §Progression).
4. **XP safety rules.** XP must never reward speed, risky choices, or public
   ranking; forbidden-signal enforcement in code was elegant. Kept verbatim in
   spirit (SPEC-009).
5. **Tutor safety triage categories.** self-harm support redirect, stunt/thrill
   refusal-with-redirect, medical/legal boundaries, prompt-injection resilience.
   Kept, but as a *triage layer in front of a capable tutor*, not as the whole
   tutor (see DROP #2). Adapted patterns live in `STARTER/safety_policy.json`.
6. **Sectioned lesson arc** (Briefing → Learn → Try → Debrief → Journal →
   Checkpoint). A strong pedagogical rhythm; kept as the lesson player structure.
7. **Asset naming discipline** (`slot-name-vN.webp`, an expected-assets manifest).
   Kept lightweight in DESIGN-002 §Illustration slots.

## ADAPT

1. **Audience shift: kids → general audience.** All v1 copy patterns
   ("ask a trained adult," camp framing, counselor voice) are replaced by the
   PROJECT_BRIEF tone. Supervision content remains — reframed as *supervising
   young riders* rather than *being supervised*.
2. **3D lab → 2D interactive labs.** v1 shipped a Three.js ATV posture/stability
   lab. Genuinely cool, but the source is lost and 3D is a schedule risk with low
   safety-learning ROI. SPEC-007 `lab_objective` re-imagines the two best labs
   (stability/center-of-gravity explorer; pre-ride inspection walkaround) as
   polished 2D interactives (SVG/canvas). If schedule allows after Wave 3, a 3D
   upgrade is a listed stretch goal — never a blocker.

## DROP (never rebuild)

1. **The governance layer.** Fifteen review statuses, an approval ledger,
   release gates, a review dashboard, "approved_mock_only" content states.
   It consumed the project. See NON_GOALS.md §1.
2. **The refusal-first tutor.** v1's "tutor" was offline BM25 retrieval that
   refused anything scoring below 0.8 relevance against a tiny approved corpus —
   users mostly received refusals. The new stance (ADR-005): retrieval *augments*
   a capable LLM; the tutor answers any ATV/road-safety question and is honest
   about grounding. Refusal is reserved for the genuinely harmful categories.
3. **Cloudflare-specific architecture** (Workers, D1 single-table JSON rows, R2).
   Replaced by ADR-001's portable stack.
4. **Class-code gated entry.** The world logs in directly now (SPEC-005).
5. **Live classwide activities / host mode.** Out of scope (NON_GOALS §2).
6. **The "traffic extension" as a separate reference-only track.** Road-safety
   material is now integrated as Module 6 — first-class, fully interactive.
