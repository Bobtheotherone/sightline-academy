---
id: m4-reading-the-terrain
order: 4
title: Reading the Terrain
tagline: The ground announces itself. Learn its language.
mission: Learn to read terrain and hazards early, understand the stability envelope that governs every slope and side-hill, and write your first hazard brief.
estimated_minutes: 55
badge_id: b-terrain
hero_slot: hero-m4-terrain
objectives:
  - Identify common trail hazards and the early cues that reveal them
  - Explain the center-of-gravity / support concept behind ATV stability on slopes
  - Apply a scan-and-decide rhythm to terrain scenarios
---

# Lesson: Terrain Talks

```yaml lesson
id: m4-l1-terrain-talks
order: 1
summary: Hazards broadcast cues before they matter. Train your eyes on a loaded scene.
estimated_minutes: 15
```

## Step: Scan rhythm

```yaml step
id: m4-l1-s1
section: learn
renderer: content
minutes: 3
required: true
```

```json payload
{
  "instructions": "The scanning habit that everything else builds on.",
  "blocks": [
    {"type": "text", "md": "Experienced riders don't stare at their front wheels — by the time terrain reaches your wheels, your options are gone. They run a rhythm: **far, near, sides, repeat.** Far ahead for the trail's shape and the big commitments (crests, water, junctions). Near for the next few seconds of surface. Sides for what feeds the trail — drainages, slopes, brush that hides exits and entrances.\n\nAnd the governing rule from Module 1 applies to eyes, not just speed: **never ride faster than the distance you can see and process.** A blind crest at speed is a decision made with zero information."},
    {"type": "callout", "variant": "tip", "title": "Cues, not objects", "md": "Novices look for obstacles. Experienced riders read *cues*: a darker patch means moisture, shadow across a rut hides its depth, gravel sheen means loose over hard, brush leaning downhill marks where water runs. The next screen trains cue-reading on a loaded scene."}
  ]
}
```

## Step: Read the scene

```yaml step
id: m4-l1-s2
section: try
renderer: hotspot_list
minutes: 8
required: true
```

```json payload
{
  "instructions": "A trail scene with seven hazards broadcasting cues. Find and read all seven.",
  "assetSlot": "scene-trail-hazards",
  "intro": "Mid-morning, mixed forest trail descending toward a drainage.",
  "requireAll": true,
  "hotspots": [
    {"id": "crest", "label": "Blind crest", "x": 18, "y": 30, "description": "The trail rises and vanishes — beyond it could be a washout, a stopped machine, or an oncoming one. The cue is the vanishing point itself. Response category: speed you could stop within the visible distance, and position for sight line."},
    {"id": "shadow_rut", "label": "Shadowed ruts", "x": 40, "y": 62, "description": "Deep wheel ruts running through shade. Shadow flattens depth perception — a rut that looks like a stripe can swallow a wheel. Cue: linear shadows aligned with the trail. Read them where light crosses them."},
    {"id": "wet_clay", "label": "Dark wet patch", "x": 55, "y": 70, "description": "A darker, smoother band across the trail low in the drainage — moisture. Wet clay and algae-slick rock behave like ice for knobby tires. Cue: color change plus location (low points collect water)."},
    {"id": "loose_over_hard", "label": "Gravel over hardpack", "x": 68, "y": 58, "description": "A sheen of loose marbles over a hard base — the classic traction trap on corners and brakes. Cue: uniform sparkle, scattered stones at the trail edge where wheels have thrown them."},
    {"id": "deadfall", "label": "Downed limb", "x": 78, "y": 44, "description": "A limb across the far side of the trail, partly screened by brush. Fresh deadfall means the trail differs from every previous ride — the familiarity discount's favorite ambush. Cue: horizontal line breaking the trail's vertical texture."},
    {"id": "side_slope", "label": "Off-camber section", "x": 30, "y": 48, "description": "The trail tilts sideways where it traverses the hillside. Side-slopes attack stability directly — next lesson's lab shows exactly how. Cue: the trail's far edge sits lower than its near edge; vegetation leans."},
    {"id": "soft_edge", "label": "Undercut soft edge", "x": 62, "y": 78, "description": "The downhill trail edge above the drainage is soft and possibly undercut — edges fail under weight, and this one has water working beneath it. Cue: crumbled edge line, exposed roots, cracks parallel to the edge. Response category: track away from suspect edges."}
  ]
}
```

## Step: Check — cue logic

```yaml step
id: m4-l1-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "Your eyes are calibrating. Now the physics underneath.",
  "reviseCopy": "Revisit the scan rhythm — what does distance buy you?",
  "inner": {
    "prompt": "Why do experienced riders scan far ahead when the hazards are ultimately met by the wheels up close?",
    "options": [
      {"id": "a", "text": "Distance is decision time — a hazard seen far away is met with a chosen speed, line, or a stop; one seen late is met with whatever you happened to be doing", "isBest": true, "feedback": "Exactly. Scanning converts terrain from surprises into choices. Every meter of early detection is time to decide."},
      {"id": "b", "text": "Far hazards are more dangerous than near ones", "isBest": false, "feedback": "Danger isn't about distance — options are. Near hazards seen early were far hazards once."},
      {"id": "c", "text": "It reduces eye strain on long rides", "isBest": false, "feedback": "Comfort is a side benefit. The safety mechanism is time-to-decide."}
    ],
    "explanation": "Far, near, sides, repeat — and speed never exceeding sight."
  }
}
```

# Lesson: The Stability Envelope

```yaml lesson
id: m4-l2-stability
order: 2
summary: One concept — center of gravity over support — explains slopes, side-hills, loads, and passengers all at once.
estimated_minutes: 18
```

## Step: One concept, many rules

```yaml step
id: m4-l2-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "The model behind the lab.",
  "blocks": [
    {"type": "text", "md": "Picture the four tire contact patches as corners of a rectangle on the ground — the **support area**. Now picture the combined weight of machine, rider, and cargo concentrated at one point — the **center of gravity (CoG)**, which on an ATV sits high, and higher still with a seated rider.\n\nThe machine stays upright while the CoG's straight-down line lands *inside* the support area. Tilt the ground, and that line marches toward the edge. Cross the edge and physics finishes the argument — that's a rollover, and it needs no speed at all to happen."},
    {"type": "keylist", "title": "Everything this one model explains", "items": [
      {"term": "Why slopes have limits", "detail": "Steeper ground walks the CoG line toward the support edge. Every machine/load/rider combination has an angle where margin runs out — and it's smaller than it feels from the seat."},
      {"term": "Why side-hills are the sharpest case", "detail": "The support rectangle is narrower side-to-side than front-to-back, so sideways tilt spends margin fastest. Off-camber trail is the stability envelope's thinnest edge."},
      {"term": "Why rider position is a control", "detail": "The rider is a third of the system's weight and the only movable part — weight shifted uphill moves the CoG away from the failing edge. This is why fit (leverage!) mattered in Module 2."},
      {"term": "Why loads and passengers change everything", "detail": "Cargo raises and shifts the CoG; a passenger on a single-rider machine raises it AND freezes the movable part. Module 6 makes this concrete."}
    ]},
    {"type": "callout", "variant": "caution", "title": "What this model is", "md": "A concept model for judgment — not an operating chart. Real limits shift with tire pressure, surface, moisture, momentum, and machine design, always in the unfavorable direction from the ideal. The lab that follows builds intuition for the *shape* of the envelope; respect for the real one is what keeps riders off steep and off-camber ground they can't verify. Hands-on courses teach slope technique in person, on chosen ground, for exactly this reason."}
  ]
}
```

## Step: Lab — stability explorer

```yaml step
id: m4-l2-s2
section: try
renderer: lab_objective
minutes: 9
required: true
```

```json payload
{
  "instructions": "Tilt the ground and move the rider. Watch the CoG line against the support area. Meet all three objectives.",
  "lab": "stability_explorer",
  "config": {"views": ["rear", "side"], "sliders": ["slope_angle", "rider_lean", "cargo_load"], "showMarginMeter": true},
  "objectives": [
    {"id": "find_edge", "text": "On the rear view, increase side-slope until the CoG line reaches the support edge — note the angle"},
    {"id": "lean_recovery", "text": "At that angle, shift rider lean uphill and watch the margin return — then find the steeper angle where even full lean isn't enough"},
    {"id": "cargo_effect", "text": "Add rear cargo load on the side view and observe how the same uphill grade now spends more margin"}
  ],
  "debrief": "Three things worth keeping forever: the edge arrives earlier than intuition says; rider position genuinely buys margin but only a finite amount; and load quietly re-draws the whole envelope. When real ground makes you wonder which side of the edge you're on — that wondering IS the answer. Choose different ground."
}
```

## Step: Reflection — the felt edge

```yaml step
id: m4-l2-s3
section: debrief
renderer: reflection
minutes: 2
required: true
```

```json payload
{
  "instructions": "Quick synthesis.",
  "prompt": "The lab's margin meter doesn't exist on real trails. What real-world signals would tell you you're spending stability margin?",
  "chips": ["Uphill wheels going light", "My body pressed to one side just to sit", "The 'wondering' feeling itself", "Load shifting noises behind me"],
  "allowText": true
}
```

# Lesson: Hazard Decisions

```yaml lesson
id: m4-l3-hazard-decisions
order: 3
summary: Put eyes and physics together in a scenario, then codify your approach.
estimated_minutes: 12
```

## Step: Scenario — the shortcut slope

```yaml step
id: m4-l3-s1
section: try
renderer: branching_decision
minutes: 7
required: true
```

```json payload
{
  "instructions": "Apply the envelope. Risky picks show consequences and return you to the decision.",
  "scenario": "A junction: the main trail switchbacks gently down to the valley — ten extra minutes. The old shortcut drops straight down a grassy slope, steeper than anything you've ridden, morning-damp, with an off-camber traverse midway where it crosses the hillside. Tire tracks show others have taken it — recently.",
  "startNode": "n1",
  "nodes": [
    {
      "id": "n1",
      "prompt": "Which way down?",
      "choices": [
        {"id": "shortcut", "label": "Take the shortcut — the tracks prove it goes", "quality": "risky", "feedback": "Tracks prove someone with an unknown machine, unknown load, and unknown skill made it on an unknown day in unknown conditions. This morning's damp grass changes traction; your load and your margin are yours alone. Halfway down, the off-camber traverse starts spending stability margin fast and you feel the uphill side go light — the lab's edge, now with real consequences and no reset slider. Step back to the junction.", "next": "n1"},
        {"id": "walk_it", "label": "Stop and read the slope from the top first", "quality": "best", "feedback": "You look. Steepness you can't verify, damp grass (traction unknown), and an off-camber traverse — that's *two* envelope attacks stacked, on a surface working against you. This is a slope you can't confirm is inside your margins, which by the lab's logic means it isn't. The read takes ninety seconds and makes the decision for you.", "next": "n2"},
        {"id": "switchback", "label": "Just take the switchbacks — no analysis needed", "quality": "okay", "feedback": "Safe outcome, and honestly fine. But the read-first habit is worth building even when you suspect the answer, because someday the *main* trail will be the questionable one and reading terrain will be the only tool you have.", "next": "n2"}
      ]
    },
    {
      "id": "n2",
      "prompt": "You're taking the switchbacks. Midway down, a short off-camber stretch appears where spring water crosses the trail — mild, but tilted and wet. What's the move?",
      "choices": [
        {"id": "power", "label": "Carry speed through it — momentum is stability", "quality": "risky", "feedback": "Momentum helps some situations and wrecks this one: speed on a wet, tilted surface means any slip happens faster than you can respond, and the envelope math doesn't care how committed you are. The wheels skate a hand-width sideways and your stomach files a report. Take the moment again.", "next": "n2"},
        {"id": "slow_line", "label": "Slow, pick the highest line, keep your weight uphill, cross deliberately", "quality": "best", "feedback": "Everything from this module in one move: speed within sight and reaction, line chosen away from the failing edge, rider weight buying margin exactly as the lab showed. The stretch passes underneath you as a non-event — which is what good terrain reading feels like from the inside.", "next": null},
        {"id": "dismount", "label": "Stop before it and scout on foot", "quality": "okay", "feedback": "Never wrong to scout — on foot you can test the surface your tires will meet. For a mild, short, visible stretch it's more caution than the read requires, but the instinct to convert uncertainty into information is exactly the right one. Keep it for the big decisions.", "next": null}
      ]
    }
  ],
  "debrief": "Notice the pattern across both decisions: the strong choices were all *information moves* — read the slope, pick the line, control the speed — and none of them required advanced riding skill. Terrain judgment is mostly deciding what you'll refuse to do with incomplete information."
}
```

## Step: Journal — hazard brief

```yaml step
id: m4-l3-s2
section: journal
renderer: journal_builder
minutes: 5
required: true
```

```json payload
{
  "instructions": "Codify your terrain approach while it's fresh.",
  "artifactType": "hazard_brief",
  "title": "My Hazard Brief",
  "intro": "The brief a guide would give about the ground YOU ride.",
  "connection": "Your Ride Plan's hazard-anticipation section pulls from this brief.",
  "fields": [
    {"id": "top_hazards", "label": "My terrain's top three hazards", "prompt": "For the riding context in your Risk Profile: three hazards you genuinely expect to meet, each with its early cue.", "minLength": 100},
    {"id": "envelope_rule", "label": "My envelope rule", "prompt": "Write your personal slope/side-hill line in one sentence (e.g., \"If I catch myself wondering whether it's too steep, it is — different ground.\").", "minLength": 40},
    {"id": "scan_habit", "label": "My scan trigger", "prompt": "When are you most likely to stop scanning (fatigue? following? familiar ground?), and what's your reset cue?", "minLength": 50}
  ]
}
```

# Lesson: Terrain Checkpoint

```yaml lesson
id: m4-l4-terrain-checkpoint
order: 4
summary: One synthesis check to close the module.
estimated_minutes: 5
```

## Step: Checkpoint — stacked hazards

```yaml step
id: m4-l4-s1
section: checkpoint
renderer: checkpoint
minutes: 4
required: true
```

```json payload
{
  "instructions": "Module 4 final check.",
  "mode": "multiple_choice",
  "passCopy": "You read ground now. Next: everything around the ground — weather, distance, and when it goes wrong.",
  "reviseCopy": "Count the envelope attacks in the situation — how many margins are being spent at once?",
  "inner": {
    "prompt": "Late in a ride: an off-camber trail section, freshly wet from a passing shower, with loaded rear racks from the day's work. Individually you've handled each factor. What does this module say about them together?",
    "options": [
      {"id": "a", "text": "Manageable — three familiar factors are still familiar", "isBest": false, "feedback": "Each factor alone spends margin from the same account: side-tilt narrows it, wet surface makes the spend less predictable, cargo re-draws the envelope smaller. Familiar ≠ additive-safe."},
      {"id": "b", "text": "The factors multiply — each one shrinks the same stability margin, so together they may leave none, and the read should be as if the section were far steeper than it looks", "isBest": true, "feedback": "Right. Stacked factors attack one shared envelope. The practical move: treat stacked-hazard sections a full severity class higher — slower, better line, or a different route entirely."},
      {"id": "c", "text": "Only the wet surface matters — traction dominates everything", "isBest": false, "feedback": "Traction is one input. The tilt and the load are quietly moving the CoG toward the edge regardless of grip."}
    ],
    "explanation": "Module 1 said risk factors multiply. Module 4 showed you the mechanism: they all draw down the same margin."
  }
}
```
