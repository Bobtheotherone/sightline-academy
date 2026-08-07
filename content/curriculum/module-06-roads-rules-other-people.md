---
id: m6-roads-rules-people
order: 6
title: Roads, Rules & Other People
tagline: The machine's limits, the law's categories, and everyone who shares the ground.
mission: Understand why ATVs and pavement don't mix, how crossings, passengers, and loads really work, and how to ride among other people — then build your capstone Ride Plan.
estimated_minutes: 60
badge_id: b-roadwise
hero_slot: hero-m6-roads
objectives:
  - Explain the physics of why ATVs handle unpredictably on pavement
  - Apply the rules-categories for road crossings, passengers, and cargo
  - Commit to the impairment and shared-trail standards
  - Synthesize the whole course into a complete Ride Plan
---

# Lesson: Why Pavement Says No

```yaml lesson
id: m6-l1-pavement
order: 1
summary: "Never ride on paved roads" isn't bureaucratic caution — it's tire and axle engineering. See why.
estimated_minutes: 13
```

## Step: Predict — the pavement question

```yaml step
id: m6-l1-s1
section: learn
renderer: prediction_reveal
minutes: 3
required: true
```

```json payload
{
  "instructions": "The question every new rider eventually asks. Commit first.",
  "question": "Pavement is smooth and grippy — cars love it. Why would it be a problem for an ATV?",
  "options": [
    {"id": "traction", "label": "It isn't really — the rule is mostly about traffic laws"},
    {"id": "tires", "label": "ATV tires and drivetrain are built for soft ground and behave badly on hard surface"},
    {"id": "speed", "label": "Pavement tempts riders into higher speeds"}
  ],
  "reveal": {
    "perOption": {
      "traction": "The legal side is real — ATVs generally aren't road vehicles — but the rule would deserve to exist with no law at all. The machine itself is the reason.",
      "tires": "That's the core of it. The next screen shows the mechanism — it's genuinely interesting engineering.",
      "speed": "Also true — pavement invites speed, and speed amplifies everything. But even a slow ATV on pavement is a compromised ATV."
    },
    "md": "The full answer is a stack: the machine is engineered against pavement, the legal system classifies it off pavement, and pavement adds the one hazard soft trails don't have — **traffic moving at car speeds around an unprotected rider**. All three point the same direction, which is why \"never ride on paved roads\" is one of the most universal rules in ATV safety."
  }
}
```

## Step: The mechanism

```yaml step
id: m6-l1-s2
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "Three pieces of engineering, one conclusion.",
  "blocks": [
    {"type": "keylist", "title": "Why the machine itself objects", "items": [
      {"term": "Tires built to deform", "detail": "Module 2's low-pressure knobbies grip by squishing into soft, uneven ground. On hard pavement there's nothing to deform into — the tall soft carcass squirms instead, making steering vague and imprecise exactly when precision matters most."},
      {"term": "The rear axle problem", "detail": "Many ATVs drive both rear wheels together (solid or limited-slip rear axles). On dirt, the inside wheel slips a little in every turn and nobody notices. On grippy pavement it can't slip — so the machine fights the turn, pushing wide or hopping, and the handling becomes unpredictable in a way no rider skill fixes."},
      {"term": "High CoG meets grippy surface", "detail": "Module 4's stability envelope again: on dirt, a hard maneuver tends to slide the tires — the machine drifts. On pavement the tires grip, so the same maneuver *tips* instead. Pavement converts slide-outs into rollovers."}
    ]},
    {"type": "callout", "variant": "caution", "title": "And then there's traffic", "md": "Everything above happens on an empty road. A real road adds vehicles with several times your mass, closing speeds no trail produces, and drivers who are not expecting an ATV. An unprotected rider on an unpredictable-handling machine among cars is the single deadliest combination in the ATV record — which is why it leads the short list from Module 1."},
    {"type": "text", "md": "The judgment version: **pavement is not a shortcut surface, a connector, or a quick hop.** Trailers and trucks exist to move ATVs between riding areas. The only pavement question left is crossings — next lesson."}
  ]
}
```

## Step: Check — the shoulder argument

```yaml step
id: m6-l1-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "The pavement case is closed. Crossings next.",
  "reviseCopy": "Which of the three mechanisms does a gravel shoulder actually fix?",
  "inner": {
    "prompt": "\"I'll just ride the gravel shoulder, not the pavement itself.\" What's wrong with the shoulder argument?",
    "options": [
      {"id": "a", "text": "Nothing — gravel is soft ground, so the machine is happy", "isBest": false, "feedback": "The tires are marginally happier — but look at where you are: a lane-width from traffic, on a narrow strip with drainage drop-offs, signs, and mailboxes, still in the road environment that supplies the deadliest hazard."},
      {"id": "b", "text": "The surface improves slightly but the road environment — traffic proximity, narrow margins, driver expectations — remains, and that environment is the biggest hazard on the list", "isBest": true, "feedback": "Right. The shoulder fixes the least dangerous third of the problem and keeps the most dangerous third at arm's length. Road corridors are for road vehicles; where local law creates specific exceptions, those come with their own rules — check your local authority, don't improvise."},
      {"id": "c", "text": "Shoulders are illegal everywhere, and that settles it", "isBest": false, "feedback": "Rules vary by jurisdiction — some places prohibit it outright, a few carve narrow exceptions. But the safety analysis doesn't need the statute: the environment is the hazard."}
    ],
    "explanation": "Pattern for all of Module 6: learn the reason, then the rule-category, then check your local authority for specifics."
  }
}
```

# Lesson: Crossings, Passengers & Loads

```yaml lesson
id: m6-l2-crossings-passengers-loads
order: 2
summary: The three situations where machine limits and rules meet daily riding.
estimated_minutes: 15
```

## Step: The legal crossing

```yaml step
id: m6-l2-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "Sometimes a trail system crosses a road. There's a right way.",
  "blocks": [
    {"type": "text", "md": "Many jurisdictions permit ATVs to *cross* roads at designated points under specific conditions — the category of rule usually looks like: cross at/near right angles, at designated crossings where marked, after a complete stop, yielding to all road traffic. The reasons write themselves once you have Modules 4 and 6:"},
    {"type": "keylist", "title": "Anatomy of a good crossing", "items": [
      {"term": "Stop completely, look completely", "detail": "Full stop before the road surface. Traffic from both directions, then again — closing speeds on roads beat trail intuition, and a car at highway speed covers a football field in seconds."},
      {"term": "Square, brisk, done", "detail": "Cross at a right angle: it minimizes your time on pavement AND avoids turning on it (Lesson 1's tip-not-slide problem lives in pavement turns). Steady and brisk, straight across, no pausing mid-road."},
      {"term": "The group crosses as individuals", "detail": "One machine at a time, each making its own stop-and-look. \"Following the leader across\" delegates your traffic judgment to someone who was looking three seconds ago — group gravity's most dangerous form."},
      {"term": "Designated beats convenient", "detail": "Marked crossings exist where sight lines were judged adequate. A convenient crossing point with a blind curve upstream is a bad trade for saved minutes."}
    ]},
    {"type": "figure", "assetSlot": "scene-crossing", "caption": "Stopped square behind the bar, sight lines swept both ways, minimum time on pavement. Every part of a good crossing is visible from above — which is how you should picture it before you reach one."},
    {"type": "callout", "variant": "tip", "title": "The category-and-authority pattern", "md": "Crossing rules, minimum ages, supervision requirements, helmet mandates, and where ATVs may operate all vary by state, province, and country — and they change. This course gives you the reasoning and the rule-categories; your local OHV/DMV authority gives you the current specifics. Ranger answers legal questions exactly this way, on purpose."}
  ]
}
```

## Step: Sort — passengers & cargo calls

```yaml step
id: m6-l2-s2
section: try
renderer: sort_categorize
minutes: 6
required: true
```

```json payload
{
  "instructions": "Passengers and loads, real situations. Sort each call.",
  "assetSlot": "scene-loading-cargo",
  "shuffle": true,
  "categories": [
    {"id": "sound", "label": "Sound practice", "hint": "Consistent with machine design and limits"},
    {"id": "unsafe", "label": "Unsafe — hard no", "hint": "Violates design or physics"},
    {"id": "depends", "label": "Needs a check first", "hint": "Could be fine — verify something specific"}
  ],
  "items": [
    {"id": "kid_behind", "label": "A child rides behind you on your single-rider ATV \"just around the field\"", "categoryId": "unsafe", "explanation": "Single-rider machines have no passenger provision for a reason: a passenger raises the CoG, blocks the rider's weight-shifting (the invisible control), and has nothing designed to hold onto. Distance and speed don't fix any of that. Machines designed for two exist — this isn't one."},
    {"id": "two_up_designed", "label": "Carrying a passenger on a two-up ATV built and labeled for two, both in gear", "categoryId": "sound", "explanation": "Purpose-built two-up machines have the seat, geometry, and rating for it. Design is the dividing line — not confidence."},
    {"id": "rack_limits", "label": "Hauling fencing gear with rack weights checked against the posted limits, strapped low and centered", "categoryId": "sound", "explanation": "Racks are for exactly this — within posted limits, secured, low, centered. Module 4's cargo slider, done right."},
    {"id": "heavy_high", "label": "A tall, heavy cooler strapped high on the rear rack for a beach run", "categoryId": "depends", "explanation": "The check: weight vs the rack limit, and whether it can ride lower. High mass is a CoG lever — same kilograms, worse geometry. Often fixable by repacking; unridable as loaded if it can't be brought down."},
    {"id": "towing", "label": "Towing a small utility trailer for the first time", "categoryId": "depends", "explanation": "The checks: machine's rated towing capacity, hitch condition, trailer loading (tongue weight, low and centered), and the knowledge that braking and turning both change with a trailer. Rated and loaded right → sound. Unchecked → no."},
    {"id": "sibling_lap", "label": "A toddler on the operator's lap for a slow ride", "categoryId": "unsafe", "explanation": "A lap passenger obstructs the controls and the rider's movement, cannot hold on, and is positioned to absorb any front impact. No speed is slow enough to make this sound."},
    {"id": "loose_tools", "label": "Tossing loose tools into the front basket for a quick trip across the property", "categoryId": "depends", "explanation": "The check is one word: secured. Loose mass shifts on the first bump — becoming both a stability variable and a projectile. Strap it or bag it and this becomes routine."}
  ]
}
```

## Step: Check — the design line

```yaml step
id: m6-l2-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "Design limits internalized. Last stop: everyone else.",
  "reviseCopy": "What did every 'unsafe' card in the sort have in common?",
  "inner": {
    "prompt": "Across passengers, cargo, and towing, what's the single question that separates sound practice from unsafe?",
    "options": [
      {"id": "a", "text": "\"Am I confident I can handle it?\"", "isBest": false, "feedback": "Confidence was present in every incident report ever filed. The machine doesn't read confidence."},
      {"id": "b", "text": "\"Was the machine designed and rated for this — and am I within those limits, loaded the way the design assumes?\"", "isBest": true, "feedback": "That's the line. Design and ratings encode the physics you studied in Module 4; staying inside them keeps the envelope where the engineers left it."},
      {"id": "c", "text": "\"Is anyone watching?\"", "isBest": false, "feedback": "The physics attends every ride whether anyone's watching or not."}
    ],
    "explanation": "Design intent is the question. It settles passenger seats, rack weights, towing, and half the arguments at any trailhead."
  }
}
```

# Lesson: Sharing the Outdoors

```yaml lesson
id: m6-l3-sharing
order: 3
summary: Impairment, other trail users, and the standards that keep riding areas open.
estimated_minutes: 12
```

## Step: The people layer

```yaml step
id: m6-l3-s1
section: learn
renderer: content
minutes: 5
required: true
```

```json payload
{
  "instructions": "Three standards for the human environment.",
  "blocks": [
    {"type": "keylist", "title": "The three standards", "items": [
      {"term": "Zero impairment — zero, before and during", "detail": "Riding runs on balance, reaction time, and judgment; alcohol and impairing substances attack all three, starting well below any legal driving line. And impairment's first casualty is the ability to notice you're impaired (Module 5's cold-hands logic, sharpened). The standard that actually works is the simple one: riding days are dry days. Full stop."},
      {"term": "Yield generously, pass like a neighbor", "detail": "Trails carry hikers, cyclists, horses, dogs, and other machines. The working defaults: slow early and wide for everyone on foot or hoof; a horse gets engines quieted and instructions from its rider followed (a spooked horse endangers its rider — and you); uphill traffic generally has the right of way; oncoming machines get a wide line and — a genuinely useful convention — a hand signal counting the riders behind you so no one's surprised by your group's tail."},
      {"term": "Ride like access depends on it — it does", "detail": "Stay on designated trails: shortcut braids and meadow scars are how riding areas close. Pack out what you brought. Noise carries — closed areas and neighbors hear machines long before they see them. Every rider is a vote on whether the next generation gets these trails."}
    ]},
    {"type": "callout", "variant": "story", "title": "Why the counting signal exists", "md": "Meeting an oncoming group on a narrow trail, the lead rider holds up three fingers: three more behind me. You hold your line and your patience through exactly three machines, then relax. A five-second convention that prevents the classic head-on: pulling back onto the trail into rider number four. Small courtesies on trails are usually crash prevention wearing manners."}
  ]
}
```

## Step: Check — the one beer question

```yaml step
id: m6-l3-s2
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "Standards set. Time to build your Ride Plan.",
  "reviseCopy": "What does impairment attack first?",
  "inner": {
    "prompt": "\"One beer with lunch, then back on the trail — that's under every legal limit.\" What does this course say?",
    "options": [
      {"id": "a", "text": "Legal limits are the line — under them, you're fine", "isBest": false, "feedback": "Driving limits are set for enclosed vehicles on engineered roads. You're balancing an open machine on uneven ground using the exact faculties alcohol degrades first — and degradation starts well under those limits."},
      {"id": "b", "text": "Riding days are dry days — impairment attacks balance, reaction, and judgment starting below legal lines, and judgment is the tool you'd use to notice", "isBest": true, "feedback": "Right. The simple standard survives contact with real afternoons precisely because it requires no in-the-moment measurement by an instrument that's being degraded."},
      {"id": "c", "text": "It depends on body weight and timing math", "isBest": false, "feedback": "Doing personal impairment arithmetic at a trailside lunch is the judgment leak wearing a calculator. The dry-day rule exists so nobody has to be good at that math."}
    ],
    "explanation": "Pre-made decisions survive pressure. This is the course's oldest theme, applied to its clearest case."
  }
}
```

## Step: Reflection — your trail community

```yaml step
id: m6-l3-s3
section: debrief
renderer: reflection
minutes: 2
required: true
```

```json payload
{
  "instructions": "Last reflection before the capstone.",
  "prompt": "Who else uses the ground you ride — and what's the one sharing standard you most want to be known for?",
  "chips": ["The generous yield", "The quiet pass", "The counting signal", "Staying on the trail, every time"],
  "allowText": true
}
```

# Lesson: Capstone — The Ride Plan

```yaml lesson
id: m6-l4-ride-plan
order: 4
summary: Everything you've built, assembled into the one document a serious rider carries: your Ride Plan.
estimated_minutes: 20
```

## Step: Briefing — what a Ride Plan is

```yaml step
id: m6-l4-s1
section: briefing
renderer: content
minutes: 3
required: true
```

```json payload
{
  "instructions": "The capstone briefing.",
  "blocks": [
    {"type": "text", "md": "Six modules ago you learned that most serious crashes are decided before the wheels turn. The Ride Plan is where you take control of those decisions: one document, built from every artifact in your journal, describing how *you* run a real ride — a specific, plausible ride you actually intend to take (or would, when riding starts for you).\n\nYour journal artifacts will appear alongside each section, pre-filling where they can. Edit everything — the plan should read like you."},
    {"type": "callout", "variant": "tip", "title": "The standard", "md": "Write it so a riding partner could pick it up and know the plan — and so your off-ride contact could hand it to a searcher. Specific, current, honest about your gaps. That's the whole rubric."}
  ]
}
```

## Step: Build — the Ride Plan

```yaml step
id: m6-l4-s2
section: journal
renderer: journal_builder
minutes: 12
required: true
```

```json payload
{
  "instructions": "Assemble your Ride Plan. Prior artifacts pre-fill where marked — edit them into this ride's specifics.",
  "artifactType": "ride_plan",
  "title": "My Ride Plan",
  "intro": "One real ride, planned end to end.",
  "connection": "This is the course's tangible product — printable, and yours to reuse as a template for every ride after.",
  "fields": [
    {"id": "ride", "label": "The ride", "prompt": "Where, when, with whom, and the route in a sentence or two. Include the terrain type you expect.", "minLength": 80},
    {"id": "machine", "label": "Machine & walkaround", "prompt": "Which machine (and its fit status for you), plus your five-zone walkaround commitment.", "minLength": 60, "prefillFrom": {"artifactType": "inspection_log", "fieldId": "sequence"}},
    {"id": "gear", "label": "Gear", "prompt": "Your every-ride set plus this ride's conditional additions.", "minLength": 60, "prefillFrom": {"artifactType": "gear_card", "fieldId": "every_ride"}},
    {"id": "hazards", "label": "Hazard anticipation", "prompt": "This route's expected hazards with their cues, plus your envelope rule.", "minLength": 80, "prefillFrom": {"artifactType": "hazard_brief", "fieldId": "top_hazards"}},
    {"id": "conditions", "label": "Conditions & schedule", "prompt": "The forecast question (\"what's different today?\"), your turnaround time rule applied to this ride, and light math.", "minLength": 60},
    {"id": "comms", "label": "Communication & emergency", "prompt": "Off-ride contact, check-in time, carry kit for this remoteness, and your first-minutes card.", "minLength": 80, "prefillFrom": {"artifactType": "readiness_plan", "fieldId": "contact"}},
    {"id": "lines", "label": "My lines", "prompt": "The personal rules from your Risk Profile, restated for this ride — including your go/no-go conditions.", "minLength": 60, "prefillFrom": {"artifactType": "risk_profile", "fieldId": "commitments"}}
  ]
}
```

## Step: Checkpoint — the go/no-go

```yaml step
id: m6-l4-s3
section: checkpoint
renderer: checkpoint
minutes: 5
required: true
```

```json payload
{
  "instructions": "The final checkpoint of the course. Written response.",
  "mode": "structured_response",
  "passCopy": "That's the course. The final assessment awaits when you're ready — and your Ride Plan is in your journal, ready for the real thing.",
  "reviseCopy": "Push past restating the plan — this asks what would make you STOP the plan.",
  "inner": {
    "prompt": "Morning of your planned ride: describe two specific things that could be different from your plan's assumptions that would make you shorten, change, or cancel the ride — and for each, name the exact moment you'd decide.",
    "criteria": ["Two concrete condition changes (not generic 'bad weather')", "A specific decision point for each (a time, a place, an observation)", "The change is proportionate — shorten vs cancel reasoning is visible"],
    "minLength": 200,
    "placeholder": "1) If the creek at the second junction is running higher than the step I can see from the bank, then at that junction I...",
    "exemplar": "One strong shape: \"1) Overnight rain heavier than forecast — my decision point is the driveway: if the yard's low spot is standing water, the drainage crossings will be worse, and the loop becomes the ridge out-and-back. 2) My riding partner cancels — my decision point is the moment they text: solo changes my remoteness math, so the ride shortens to the front country where my check-in window is 2 hours, and I re-text the new plan to my contact before leaving.\" Notice: observable triggers, named moments, proportionate responses."
  }
}
```
