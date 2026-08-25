# How the course is built

Three separate systems make up "the course": the curriculum (what a learner reads and does),
the art (what they look at), and the tutor (what answers them). They are deliberately loosely
coupled — content does not name artwork, artwork does not know about lessons, and the tutor
reads neither. This page is how each one works and where its rules are enforced.

The normative specs live in `sightline-handoff/SPECS/`: `SPEC-006-learning-engine.md`,
`SPEC-007-activity-renderers.md` and `SPEC-008-rag-tutor.md`. This is the working summary of
how they were actually implemented, not a replacement for them.

## 1. The curriculum format

`content/curriculum/` holds one markdown file per module, plus `CURRICULUM-000-overview.md`
and `final-assessment.md`. `server/app/services/seed.py` parses them at every boot. Prose
between blocks is author commentary and is ignored, so you can leave notes in the file.

**Module front matter** — YAML between `---` fences at the very top. Keys, all required:
`id`, `order`, `title`, `tagline`, `mission`, `estimated_minutes`, `badge_id`, `hero_slot`,
`objectives` (a list).

**A lesson** opens with `# Lesson: <Title>` followed by a fenced `yaml lesson` block carrying
`id`, `order`, `summary`, `estimated_minutes`. The title comes from the heading, not the YAML.

**A step** opens with `## Step: <Title>`, then a fenced `yaml step` block with `id`, `section`,
`renderer`, `minutes`, `required`, then a fenced `json payload` block. Sections are
`briefing`, `learn`, `try`, `debrief`, `journal`, `checkpoint`; a checkpoint, where one exists,
must be the last step in its lesson.

Every payload shares three optional fields, handled by `ActivityHost` rather than by the
renderer: `instructions` (the step header), `assetSlot` (an illustration), `helper` (a
collapsible hint).

Validation is fail-loud. A missing key, an unknown renderer, a duplicate id or invalid JSON
raises `SeedError` and the API refuses to start, naming the file and the step id. That is the
design: a typo should break the boot, not silently drop a lesson.

Re-seeding is by content hash. `run_seed` parses on every boot and rewrites the course tables
only when the SHA-256 over the curriculum files changed, or when `SEED_FORCE=1`.

## 2. The twelve renderers

One folder per renderer under `web/src/activities/`, each default-exporting a component with
the `ActivityProps` shape in `types.ts`. Renderers stay pure: read `step.payload`, restore
from `evidence`, report through `onEvidence`. The host owns persistence.

Every completion is decided by the server. `PUT /steps/{id}/evidence` lands in
`server/app/services/progress.py`, which checks the submitted value against the step's payload
before it counts — the client never self-awards XP or completion.

| Renderer | What the learner does | Evidence kind | What the server checks to call it complete |
|---|---|---|---|
| `content` | Reads prose, callouts, key lists, figures, hotspot figures | `acknowledgement` | `seen` is true |
| `prediction_reveal` | Commits to a guess, then sees the answer | `prediction` | The chosen option exists |
| `multiple_choice` | Picks the best answer, with per-option feedback | `choice` | The chosen option is the one flagged `isBest` |
| `sort_categorize` | Drags items into categories | `classification` | Every item sits in its authored category |
| `match` | Pairs left to right | `matches` | Every authored pair is matched |
| `hotspot_list` | Finds and reads marked features on a scene | `hotspots` | Every hotspot id has been visited |
| `branching_decision` | Rides a scenario, choice by choice | `decision_path` | The path reached a terminal choice |
| `structured_response` | Writes to a prompt against criteria | `written_response` | Text meets `minLength` |
| `journal_builder` | Fills a field journal artifact | `journal_artifact` | Every field has a valid selection or enough text |
| `reflection` | Picks a chip, writes a line, or both | `written_response` | A chip or some text is present |
| `lab_objective` | Plays the stability or walkaround lab | `lab_result` | Every objective id is in `objectivesMet` |
| `checkpoint` | A gated multiple choice or written answer | `checkpoint_response` | Same rule as the mode it wraps |

The mapping lives in `EXPECTED_KIND` in `progress.py`; the per-renderer rules are
`_validate_evidence` in the same file. If you add a renderer you touch three places: the
payload type in `types.ts`, the folder, and both of those.

`lab_objective` is the one renderer with real machinery behind it. The stability lab is a
matter-js rigid-body simulation — rollovers, wheel lift, loop-outs and the rider coming off
all emerge from the physics, none of it is scripted. Its acceptance suite is
`stabilityRun.check.ts`, and `qa/stability-rebuild/CONTRACT.md` and `BUILD-NOTES.md` record
how it was built and what its numbers mean.

## 3. How art is attached

Three layers, in this order:

**`assetSlot` in the payload** names a slot, e.g. `"assetSlot": "scene-trail-hazards"`.
Curriculum never names a file. Art can ship, change or lag behind without a content edit.

**`web/src/assets/manifest.json`** is the register of every slot: `status` (`real` or
deferred), `kind` (`raster` or svg-authored), `widths` or `file`, `alt` text, and a `note`
recording provenance and any residual defect. 217 slots today, 212 with real art.

**`SlotArt`** (`web/src/components/SlotArt.tsx`) resolves a slot to pixels. An svg-authored
slot renders from `src/assets/svg/<slot>.svg` with `object-contain`, because a diagram must
not be cropped. A raster slot renders as a `<picture>` with an AVIF/WebP/PNG ladder from
`src/assets/raster/<slot>-<width>w.<ext>` and `object-cover`, because a full-bleed illustration
should fill its card. A slot with no real art draws the designed placeholder — a contour panel
with the slot name — so a gap looks intentional rather than broken.

Two things that trip people up:

- **Hotspot plates carry a coordinate contract.** The `x`/`y` percentages in the payload were
  measured against one crop of one image at one aspect ratio. Change the plate or the presented
  ratio and every marker moves off its cue. The crop is recorded in that slot's manifest `note`.
- **Per-item art is bound in code, not content.** `web/src/assets/slotmap.ts` maps
  `${stepId}:${itemId}` to slots for sort, match and lesson-list thumbnails. An id with no
  entry resolves to nothing and the renderer draws what it drew before the art existed.

`python3 lint_assets.py` in `web/src/assets/` checks manifest integrity, orphaned slots, the
no-text-in-plates rule, external references, file-size budgets and palette conformance. It
proves a slot is referenced, not that it renders — the visual crawl is what proves that.

Raster plates are stored in Git LFS (`.gitattributes`); SVGs deliberately are not, so that
`git diff` on hand-tuned vector work stays readable.

## 4. How Ranger works

**The corpus.** `content/corpus/` holds 33 short markdown documents. One file is one document
and is never re-chunked — the authored paragraph is the retrieval unit. Front matter requires
`id`, `title`, `topic`, `tags`, `module_refs`, `source_basis`, and the body must be 100-500
words. `server/app/ingest/ingest.py` embeds title + tags + body with
sentence-transformers `all-MiniLM-L6-v2`, locally, into a cosine-space Chroma collection.

Ingest is idempotent and cheap, which is also its trap: it re-runs only when the collection
count differs from the corpus file count. Editing text inside an existing file needs
`SEED_FORCE=1` to take effect.

**Retrieval.** `server/app/tutor/retrieval.py`: top 6 by cosine similarity, drop anything under
a 0.43 soft floor, keep at most 2 per topic and at most 4 in total. The grounding label follows
from what survives — 2 or more kept is `curriculum`, exactly 1 is `mixed`, none is `general` —
and drives the citation chips the learner sees. The floor is soft by decision (ADR-005): an
empty result changes how the answer is labelled, never whether Ranger answers.

**Answering.** `server/app/tutor/pipeline.py` triages the message against
`safety_policy.json` first — seven regex categories including self-harm, stunt technique,
impaired riding and legal specifics — and a match short-circuits to a policy reply before any
retrieval happens. Otherwise the kept chunks are composed into a system prompt and sent to the
Anthropic Messages API.

**With no API key, Ranger still answers.** `providers.py` reports `extractive` instead of
`anthropic` and builds the reply out of the retrieved chunks themselves. With nothing above
the floor it says so plainly and names the nearest course topic rather than refusing. The mode
is never silent: whenever the key is missing or malformed, the chat shows a badge reading
"Ranger is answering from the course text only right now.", driven by `tutor.degradedReason`
from `/api/meta/health` rather than by the provider field alone (a malformed key still reports
`anthropic`).

**Caps, because the key is metered.** Messages are normalized and truncated at 2000
characters; only the last 10 stored messages are sent as history; generation is capped at
1024 tokens and 30 seconds; and each learner is limited to 30 tutor messages an hour and 150 a
day (`TUTOR_MESSAGES_PER_HOUR` / `_PER_DAY`), counted in the database rather than in process
memory so the limit survives a restart. Over the limit is a friendly 429, not an error page.
