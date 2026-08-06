# SPEC-000 — Glossary

| Term | Meaning |
| --- | --- |
| **Module** | One of six top-level course units (CURRICULUM-000). Contains lessons. |
| **Lesson** | A playable sequence of steps within a module, following the six-section arc. |
| **Step** | One screen of a lesson: a content block or an activity, rendered by a renderer type. |
| **Section arc** | Briefing → Learn → Try → Debrief → Journal → Checkpoint. Not every lesson has every section; the order is fixed. |
| **Renderer** | A frontend component implementing one activity type's contract (SPEC-007). |
| **Evidence** | The persisted record proving a learner engaged with a step (choice, classification, text, etc.). |
| **Knowledge check** | A multiple-choice activity with authored per-option feedback. |
| **Checkpoint** | The lesson-ending assessment step (knowledge check or structured response) required for completion. |
| **Field Journal** | The learner's persistent collection of built artifacts. |
| **Artifact** | A structured document the learner assembles in a journal_builder step (risk map, gear card, hazard brief, ride plan…). |
| **Capstone** | Module 6's Ride Plan project synthesizing prior artifacts. |
| **Ranger** | The AI tutor persona. |
| **Grounding** | Tutor answer label: `curriculum` / `mixed` / `general` (ADR-005). |
| **Chunk** | One corpus document in Chroma (one file in content/corpus/). |
| **XP event** | A named, rule-governed award of experience points (SPEC-009). |
| **Crawl** | The Playwright screenshot pass over the route×state matrix (QA-001). |
| **P1/P2/P3 finding** | Visual-review severity levels defined in QA-001. |
