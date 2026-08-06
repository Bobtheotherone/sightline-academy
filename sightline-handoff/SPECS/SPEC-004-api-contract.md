# SPEC-004 — API Contract

Base path `/api`. JSON in/out. Auth = session cookie unless marked `public`.
Errors: `{"error": {"code": "<snake_case>", "message": "<human copy>"}}` with
proper status. 422 validation errors are re-shaped into the same envelope
(first field error becomes `message`).

Field casing: **camelCase over the wire** (Pydantic alias generator), snake_case
in Python.

## Auth (`routers/auth.py`)

| Method & path | Auth | Request | Response |
| --- | --- | --- | --- |
| POST `/auth/register` | public | `{email, password, displayName}` | 201 `{user: UserOut}` + sets cookie |
| POST `/auth/login` | public | `{email, password}` | `{user: UserOut}` + sets cookie |
| POST `/auth/logout` | yes | — | 204, clears cookie |
| GET `/auth/me` | yes | — | `{user: UserOut, state: {lastLessonId, lastStepId}}` |
| PATCH `/auth/me` | yes | `{displayName?}` | `{user: UserOut}` |
| POST `/auth/password` | yes | `{current, next}` | 204 |
| GET `/auth/export` | yes | — | full JSON dump of the user's rows (download) |
| DELETE `/auth/me` | yes | `{confirmEmail}` | 204 (hard delete) |

`UserOut = {id, email, displayName, role, createdAt, xpTotal, level}`

Rate limits (R1.3) on register/login: 429 `{error:{code:"rate_limited", ...}}`.

## Course (`routers/course.py`) — all auth `learner`

| Method & path | Response |
| --- | --- |
| GET `/course` | `{course, modules: ModuleOut[]}` — modules include per-user `{percent, complete, locked}` |
| GET `/modules/{moduleId}` | `{module, lessons: LessonSummary[]}` with per-lesson progress |
| GET `/lessons/{lessonId}` | `{lesson, steps: StepOut[], evidence: {stepId: EvidenceOut}}` — full payloads for the player |

`StepOut = {id, order, section, renderer, title, minutes, required, payload}` —
`payload` is passed to the renderer verbatim (SPEC-007 contracts).

## Progress (`routers/progress.py`)

| Method & path | Request | Response |
| --- | --- | --- |
| PUT `/steps/{stepId}/evidence` | `{kind, value, complete}` | `{evidence, lessonComplete?, moduleComplete?, xpAwarded: XpEvent[], badgesAwarded: Badge[]}` |
| GET `/progress` | — | `{modules: per-module rollup, xpTotal, level, levelProgress, badges, recentXp: XpEvent[]}` |
| POST `/assessment/final` | `{answers: {questionId: optionId}}` | `{scorePct, passed, perQuestion: [{questionId, correct, feedback}], certificateCode?}` |
| GET `/certificate` | — | `{code, issuedAt, nameOnCert} \| 404` |
| GET `/verify/{code}` | public | `{valid, nameOnCert, issuedAt, courseTitle}` (no other PII) |

The evidence PUT is the single write path for all activity types; the server
validates `value` against the step's renderer contract and computes
completion/XP server-side (client never self-awards).

## Journal (`routers/journal.py`)

| Method & path | Request | Response |
| --- | --- | --- |
| GET `/journal` | — | `{artifacts: ArtifactOut[]}` |
| PUT `/journal/{artifactType}` | `{title?, fields, status}` | `{artifact}` (upsert; autosave-friendly) |

## Tutor (`routers/tutor.py`)

| Method & path | Request | Response |
| --- | --- | --- |
| POST `/tutor/ask` | `{message, lessonId?}` | `{id, answerMarkdown, grounding, sources: [{chunkId, title, moduleRef}], suggestions: string[], triage?: {category}}` |
| POST `/tutor/ask/stream` | same | SSE: `token` events then one `meta` event with the non-text fields |
| GET `/tutor/history` | — | `{messages: TutorMessageOut[]}` (last 50) |
| DELETE `/tutor/history` | — | 204 |
| GET `/tutor/suggested` | — | `{prompts: string[]}` (context-aware starters; varies by learner position) |

## Meta (`routers/meta.py`)

| Method & path | Auth | Response |
| --- | --- | --- |
| GET `/meta/health` | public | `{status, db, chroma: {docs}, provider: 'anthropic'\|'extractive', version}` |

## Instructor (`routers/instructor.py`) — role `instructor`

| Method & path | Response |
| --- | --- |
| GET `/instructor/overview` | `{learners, activeLast7d, moduleFunnel: [{moduleId, started, completed}], knowledgeCheckStats: [{stepId, prompt, firstAttemptCorrectPct, commonWrong: [{optionId, text, pct}]}], tutorThemes: [{topic, count}]}` |
| GET `/instructor/export.csv` | CSV of the funnel + check stats (no emails) |

## Contract discipline

- This file is normative. If implementation must deviate, update this file in
  the same commit and add a BUILDLOG line.
- The web client (`web/src/lib/api.ts`) declares TS types mirroring every
  response shape above, by hand, in one file — that file is the frontend's copy
  of the contract.
