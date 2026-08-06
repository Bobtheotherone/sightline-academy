# SPEC-007 — Activity Renderer Contracts

Twelve renderer types. Each subsection defines: purpose, payload contract (the
`payload` JSON stored on the step and delivered verbatim by the API), evidence
contract (what the client PUTs), and UX requirements. The CURRICULUM/ files
contain real instances of every type — build against those, not synthetic data.

Shared payload fields on every step payload:
`{instructions: string, assetSlot?: string, helper?: string}` — `instructions`
renders in the step header; `helper` is an optional collapsible hint;
`assetSlot` names an illustration slot (DESIGN-002 §Illustration).

Shared UX requirements for ALL renderers:
- Completed/revisit mode shows prior answers with a subtle "answered" treatment
  and allows re-interaction without losing completion.
- Feedback moments (correct placement, reveal, branch outcome) get micro-motion
  per DESIGN-004 (≤250ms, reduced-motion aware).
- Keyboard operability and 375px behavior per R3.3; drag interactions always
  have a tap-to-assign alternative (tap item → tap target).

---

## 1. `content`
Narrative/teaching screen. **Payload:** `{blocks: Block[]}` where
`Block = {type:'text', md} | {type:'callout', variant:'tip'|'caution'|'story', title?, md} | {type:'figure', assetSlot, caption} | {type:'keylist', title, items:[{term, detail}]}`.
**Evidence:** `{kind:'acknowledgement', value:{seen:true}}` auto-submitted when
the learner reaches the bottom (intersection observer) or presses Continue.
**UX:** typographic care per DESIGN-001; callouts are designed components;
keylists render as the "trail marker" list treatment (DESIGN-002).

## 2. `prediction_reveal`
Commit to a prediction, then see the reveal — creates the curiosity gap.
**Payload:** `{question, options:[{id, label}], reveal: {md, perOption: {optionId: md}}}`.
**Evidence:** `{kind:'prediction', value:{optionId}}`.
**UX:** options lock on selection with a "locked in" state → reveal animates in:
first the per-option response to *their* prediction, then the general reveal.
No right/wrong framing — predictions are honored, not graded.

## 3. `multiple_choice` (knowledge check)
**Payload:** `{prompt, options:[{id, text, isBest, feedback}], explanation?: md}`.
Exactly one `isBest` (seed parser enforces).
**Evidence:** `{kind:'choice', value:{optionId, firstAttemptOptionId}}`.
**UX:** selecting shows that option's authored feedback inline (color-coded
best/not-best per DESIGN-001 semantic colors); not-best keeps others enabled for
retry; finding best unlocks Continue and shows `explanation` if present. First
attempt recorded once, client-side tracked, server-persisted.

## 4. `sort_categorize`
Classify items into 2–4 buckets.
**Payload:** `{categories:[{id, label, hint?}], items:[{id, label, categoryId, explanation}], shuffle:true}`.
**Evidence:** `{kind:'classification', value:{placements:{itemId: categoryId}}}` —
complete when all placements correct.
**UX:** drag cards into labeled category zones (or tap-to-assign). Wrong drop:
card shakes gently, returns to tray, shows the item's `explanation` in a
feedback strip (teaching moment, not a penalty). Correct drop: settles with a
check. Progress "5 of 8 sorted" visible.

## 5. `match`
Pair terms with descriptions/images.
**Payload:** `{pairs:[{id, left, right, explanation?}], shuffle:true}`.
**Evidence:** `{kind:'matches', value:{matches:{pairId: true}}}`.
**UX:** two-column tap-to-connect with drawn connector lines; wrong pair flashes
and clears with the explanation shown; solved pairs lock with connector settled.

## 6. `hotspot_list`
Explore labeled points on an illustrated scene; each must be visited.
**Payload:** `{assetSlot (required), intro, hotspots:[{id, label, x, y, description, detail?: md}], requireAll:true}`.
x/y are percentages of the image box.
**Evidence:** `{kind:'hotspots', value:{visited: string[]}}` — complete when all
visited.
**UX:** pulsing markers on the scene (pulse respects reduced-motion → static
ring); clicking opens a side panel (desktop) / bottom sheet (mobile) with the
description; visited markers change state; "4 of 7 explored" counter; a list
fallback below the image mirrors the hotspots for accessibility (buttons, not
just image targets).

## 7. `branching_decision`
A scenario with 2–3 sequential decision points.
**Payload:** `{scenario: md, nodes:[{id, prompt, choices:[{id, label, quality:'best'|'okay'|'risky', feedback: md, next?: nodeId}]}], debrief: md, startNode}`.
**Evidence:** `{kind:'decision_path', value:{path:[{nodeId, choiceId}]}}` —
complete when a terminal node's feedback is acknowledged. `risky` choices are
allowed and traversed (that's the learning) — feedback explains consequences and
the node re-offers the decision so the learner also experiences the better line
before continuing. Risky picks never award choice XP (SPEC-009).
**UX:** scenario renders as a "field report" card; the path taken renders as a
breadcrumb trail; debrief compares the learner's route to the strongest route.

## 8. `structured_response`
Short written response against visible criteria.
**Payload:** `{prompt, criteria: string[], minLength: number, placeholder?, exemplar?: md}`.
**Evidence:** `{kind:'written_response', value:{text}}`.
**UX:** criteria render as checkable-looking chips that light as heuristics
detect coverage (simple keyword/length heuristics client-side — coaching, not
grading); after submit, `exemplar` (if present) appears as "one strong way to
think about it" for self-comparison.

## 9. `journal_builder`
Build/extend a Field Journal artifact.
**Payload:** `{artifactType, title, intro, fields:[{id, label, prompt, minLength?, options?: string[], multi?: bool, prefillFrom?: {artifactType, fieldId}}], connection: md}` —
`options` renders tappable cards (selection stored as the value; `multi` allows
several); `prefillFrom` pulls a prior artifact's field as an editable starting
value (capstone uses this heavily). `connection` explains where this artifact
returns later ("You'll use this in your Ride Plan").
**Evidence:** `{kind:'journal_artifact', value:{fields}}` — the same PUT also
upserts the journal artifact.
**UX:** feels like filling a beautiful field notebook page, not a form: the
artifact preview builds live beside/below the inputs in the notebook visual
style (DESIGN-002 §Journal card).

## 10. `reflection`
Low-stakes think prompt.
**Payload:** `{prompt, chips?: string[], allowText: true}`.
**Evidence:** `{kind:'written_response', value:{text?|chip?}}` — one chip tap OR
short text completes.
**UX:** calm, spacious screen; explicitly "for you, not graded" microcopy.

## 11. `lab_objective`
The two interactive 2D labs (LEGACY_NOTES §Adapt-2). Both are custom
components; payloads select and configure them.
**Payload:** `{lab:'stability_explorer'|'walkaround', config: object, objectives:[{id, text}], debrief: md}`.
- **stability_explorer** (Module 4): SVG side/rear-view ATV on adjustable
  terrain; sliders for slope angle and rider-lean; renders the combined
  center-of-gravity marker over the support polygon; objectives like "find the
  slope where the CoG marker exits the support area on a rear view". Teaches the
  concept of stability envelopes — explicitly awareness-level, with copy noting
  that real-world limits vary by machine and conditions and this is a concept
  model, not an operating guide.
- **walkaround** (Module 2): top-down ATV illustration with the five T-CLOC
  inspection zones as interactive regions; learner drags zone labels to regions,
  then steps through each zone's "what you're looking for" awareness cards.
**Evidence:** `{kind:'lab_result', value:{objectivesMet: string[]}}` — complete
when all objectives met.
**UX:** these are showcase screens — budget extra polish time; they anchor the
"finished product" impression. Include an "About this model" popover crediting
the concept-model nature.

## 12. `checkpoint`
Lesson-ending assessment wrapper.
**Payload:** `{mode:'multiple_choice'|'structured_response', inner: <that renderer's payload>, passCopy, reviseCopy}`.
**Evidence:** inner renderer's evidence with `kind:'checkpoint_response'`.
**UX:** framed distinctly ("Checkpoint" banner treatment); completing it
triggers the lesson-complete flow (SPEC-006).

---

## Component architecture note

Each renderer = one folder in `web/src/activities/<type>/` exporting
`<TypeName>Activity({step, evidence, onEvidence})`. A single `ActivityHost`
switches on `step.renderer`, provides the shared header/helper/asset frame, and
guarantees the shared UX requirements so individual renderers stay focused.
Unknown renderer type → designed "content unavailable" state + console error
(should be impossible after seed validation, but never a blank screen).
