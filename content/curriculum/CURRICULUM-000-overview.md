# CURRICULUM-000 — Course Overview & Authoring Format

## The Sightline Safety Academy ATV & Road Safety Course

Six modules, ~5 hours total, each ending in a Field Journal artifact. The arc
moves from **judgment** (why crashes happen and how riders think) through
**machine**, **gear**, **terrain**, and **environment/emergencies** to
**roads and other people**, closing with the capstone Ride Plan and the final
assessment.

| # | Module | Minutes | Artifact | Badge |
| --- | --- | --- | --- | --- |
| 1 | The Rider's Mindset | 45 | risk_profile | b-mindset |
| 2 | Know Your Machine | 55 | inspection_log | b-mechanic |
| 3 | Gear Up | 40 | gear_card | b-geared |
| 4 | Reading the Terrain | 55 | hazard_brief | b-terrain |
| 5 | Weather, Environment & Emergencies | 50 | readiness_plan | b-prepared |
| 6 | Roads, Rules & Other People (+ Capstone) | 60 | ride_plan | b-roadwise |

Content stance (from PROJECT_BRIEF §Educational stance): awareness and judgment,
established safety practice, no operating techniques, no jurisdiction-specific
legal claims — categories of rules plus "check your local authority." The
concluding message of every module points at hands-on training as the next step
for skills.

Final assessment: `final-assessment.md` (20-question bank, 80% pass).

## Authoring format (BINDING — the seed parser in `services/seed.py` implements exactly this)

Each module is one file `module-0N-<slug>.md`:

1. **Module front-matter** (YAML between `---` fences at top):
   `id, order, title, tagline, mission, estimated_minutes, badge_id, hero_slot,
   objectives (list)`.
2. **Lessons** open with an H1 `# Lesson: <Title>` followed immediately by a
   fenced block tagged `yaml lesson` containing
   `id, order, summary, estimated_minutes`.
3. **Steps** open with an H2 `## Step: <Title>` followed by a fenced block
   tagged `yaml step` (`id, section, renderer, minutes, required`) and then a
   fenced block tagged `json payload` containing the SPEC-007 payload for that
   renderer. Nothing else between steps is parsed (prose between blocks is
   author commentary and is ignored by the parser).
4. IDs are globally unique slugs; step ids are `<lessonId>-sN`.
5. Markdown inside payload strings uses `\n` escapes; keep it tight.
6. Parser validation is SPEC-003 §Seed-pipeline-rules — fail loudly.

The six module files in this folder conform to this format and are the complete
course. Copy them verbatim to `content/curriculum/` (ADR-006). If you find a
payload that violates its SPEC-007 contract, fix the payload minimally, note it
in BUILDLOG — do not restructure content.

## Voice reminders for any copy edits
Direct, capable, outdoors-literate. "You" voice. Reasons before rules. No fear
theater; respect the reader. Sentence case. Short sentences win.
