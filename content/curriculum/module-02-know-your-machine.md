---
id: m2-know-your-machine
order: 2
title: Know Your Machine
tagline: You can't judge what you can't name.
mission: Learn the ATV's anatomy and controls, master the T-CLOC pre-ride walkaround, and understand why rider-machine fit is a hard rule.
estimated_minutes: 55
badge_id: b-mechanic
hero_slot: hero-m2-machine
objectives:
  - Identify the major systems of an ATV and what each does for stability and control
  - Know the five T-CLOC inspection zones and what a walkaround is checking for
  - Explain why machine size and fit rules exist, especially for young riders
---

# Lesson: Anatomy of an ATV

```yaml lesson
id: m2-l1-anatomy
order: 1
summary: A guided tour of the machine — eight parts, and why each one matters to staying upright.
estimated_minutes: 15
```

## Step: Why anatomy first

```yaml step
id: m2-l1-s1
section: briefing
renderer: content
minutes: 2
required: true
```

```json payload
{
  "instructions": "Set up the tour.",
  "blocks": [
    {"type": "text", "md": "Every hazard judgment you'll make in Modules 4–6 runs through the machine: how it grips, where its weight sits, how it stops. You don't need to be a mechanic. You do need to be able to look at an ATV and see *systems* — because the pre-ride check, fit rules, and loading limits all make sense the moment you can.\n\nExplore the machine. Visit every marked point."}
  ]
}
```

## Step: Explore the machine

```yaml step
id: m2-l1-s2
section: learn
renderer: hotspot_list
minutes: 7
required: true
```

```json payload
{
  "instructions": "Tap every waypoint on the machine. Each one earns its place in the walkaround you'll learn next lesson.",
  "assetSlot": "scene-atv-anatomy",
  "intro": "Side view of a typical single-rider utility ATV.",
  "requireAll": true,
  "hotspots": [
    {"id": "tires", "label": "Tires & wheels", "x": 22, "y": 72, "description": "Low-pressure, deep-tread tires designed to deform around soft, uneven ground — that deformation IS the grip. Pressure a few PSI off changes handling more than you'd expect, and it's why these tires behave badly on pavement (Module 6)."},
    {"id": "handlebars", "label": "Handlebars & controls", "x": 55, "y": 22, "description": "Steering plus the control cluster: throttle (usually a thumb lever), brakes, and switches. On an ATV you steer with the bars *and* your body weight together — which is why fit and free movement matter so much."},
    {"id": "brakes", "label": "Brakes", "x": 30, "y": 62, "description": "Front and rear systems, hand and/or foot operated. The walkaround checks lever feel and function *before* you need them, because the bottom of a hill is a bad place to learn your rear brake is soft."},
    {"id": "suspension", "label": "Suspension", "x": 38, "y": 58, "description": "Keeps the tires in contact with uneven ground so grip and braking stay available. Sagging or leaking suspension quietly shrinks your margins on every bump."},
    {"id": "engine", "label": "Engine & fuel", "x": 48, "y": 50, "description": "Fuel level, oil level, and leaks are walkaround items — running dry or seizing far from the trailhead turns a ride into a recovery. Engine size classes also drive youth-fit rules (Lesson 4)."},
    {"id": "footwells", "label": "Footwells & pegs", "x": 62, "y": 68, "description": "Where your feet live — and stay. Footwells keep boots away from the wheels; the rider's ability to stand and shift weight through the pegs is core to how ATVs handle terrain."},
    {"id": "racks", "label": "Racks & cargo points", "x": 82, "y": 38, "description": "Utility ATVs carry loads — but every kilogram changes the balance you'll study in Module 4. Racks have posted limits, and loads must be secured low and centered (Module 6 covers loading)."},
    {"id": "chassis", "label": "Frame & chassis", "x": 58, "y": 55, "description": "The skeleton everything bolts to. The walkaround's chassis check is a look for cracks, loose fasteners, and anything hanging — small findings here are cheap; discovered-on-trail findings are not."}
  ]
}
```

## Step: Check — systems thinking

```yaml step
id: m2-l1-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "You can name the machine. Now let's talk to it.",
  "reviseCopy": "Revisit the tires and suspension waypoints.",
  "inner": {
    "prompt": "Why does a few PSI of tire pressure matter more on an ATV than on a car?",
    "options": [
      {"id": "a", "text": "ATV tires are more expensive to replace", "isBest": false, "feedback": "Cost isn't the safety issue. Think about how ATV tires generate grip."},
      {"id": "b", "text": "ATV grip depends on low-pressure tires deforming around terrain, so small pressure changes shift handling noticeably", "isBest": true, "feedback": "Right — the tire's squish is the suspension-and-grip system. Change the squish, change the machine."},
      {"id": "c", "text": "It doesn't — pressure is only about ride comfort", "isBest": false, "feedback": "On these tires, pressure is a handling variable first and a comfort variable second."}
    ],
    "explanation": "This is why tires open the T-CLOC walkaround — next lesson."
  }
}
```

# Lesson: Controls & What They Do

```yaml lesson
id: m2-l2-controls
order: 2
summary: Match each control to its job — and learn the one behavior that surprises new riders.
estimated_minutes: 12
```

## Step: Match the controls

```yaml step
id: m2-l2-s1
section: learn
renderer: match
minutes: 5
required: true
```

```json payload
{
  "instructions": "Connect each control to what it actually does. Wrong guesses teach — try freely.",
  "shuffle": true,
  "pairs": [
    {"id": "p1", "left": "Thumb throttle", "right": "Meters engine power — designed so a bump can't yank it open the way a twist grip could when you're bounced", "explanation": "The thumb lever is an ATV-specific safety design: rough ground jostles your whole arm, and a thumb lever falls closed instead of twisting open."},
    {"id": "p2", "left": "Front brake lever", "right": "Slows the wheels that carry most of the weight during braking", "explanation": "Weight shifts forward when slowing — the front brake does serious work, which is why lever feel is a walkaround item."},
    {"id": "p3", "left": "Rear/foot brake", "right": "Adds controlled slowing without loading the front — matters on loose or downhill ground", "explanation": "Awareness-level: knowing both systems exist and both get checked is the course's concern; blending them well is hands-on training's."},
    {"id": "p4", "left": "Engine stop switch", "right": "Kills the engine instantly from the bars — findable without looking", "explanation": "You should be able to hit it by feel. If you can't reach it comfortably, the machine may not fit you (Lesson 4)."},
    {"id": "p5", "left": "Gear selector / range", "right": "Chooses forward ranges, neutral, reverse — low range for slow technical work and heavy loads", "explanation": "Wrong range for the job means fighting the machine — a stability tax you don't need."},
    {"id": "p6", "left": "Body position", "right": "The invisible control: shifting rider weight is how ATVs are balanced through terrain", "explanation": "Not a lever at all — but ask any trainer and they'll call it the most important control on the machine. It's why passengers on single-rider ATVs are a hard no (Module 6)."}
  ]
}
```

## Step: Predict — closed throttle on a hill

```yaml step
id: m2-l2-s2
section: learn
renderer: prediction_reveal
minutes: 3
required: true
```

```json payload
{
  "instructions": "One behavior that surprises new riders. Predict first.",
  "question": "You're riding down a gentle hill and fully release the throttle. What does the machine do?",
  "options": [
    {"id": "coast", "label": "Coasts freely, like a bicycle"},
    {"id": "engine_brake", "label": "Slows itself noticeably as the engine drags"},
    {"id": "stops", "label": "Stops almost immediately"}
  ],
  "reveal": {
    "perOption": {
      "coast": "Some machines in some modes do freewheel — which is exactly why you find out *your* machine's behavior somewhere flat, not on your first descent.",
      "engine_brake": "The common case: most ATVs slow themselves through engine braking when the throttle closes. Good prediction — with the same caveat: behavior varies by machine and drive mode.",
      "stops": "Engine braking is real drag, not a brake application — the machine slows, it doesn't stop."
    },
    "md": "The takeaway isn't the mechanism — it's the habit: **every machine has behaviors you discover on purpose or by surprise.** Engine braking, throttle response, brake bite, steering effort — a few minutes in a flat open area on any unfamiliar machine converts surprises into knowledge. Hands-on courses build exactly this familiarization into their first hour."
  }
}
```

## Step: Reflection — your unknowns

```yaml step
id: m2-l2-s3
section: debrief
renderer: reflection
minutes: 2
required: true
```

```json payload
{
  "instructions": "Quick one.",
  "prompt": "If you sat on an unfamiliar ATV tomorrow, what would you check by feel before moving — and what would you test in the first two flat minutes?",
  "chips": ["Reach every control without looking", "Brake feel at walking pace", "Throttle response", "All of the above, every time"],
  "allowText": true
}
```

# Lesson: The Pre-Ride Walkaround

```yaml lesson
id: m2-l3-walkaround
order: 3
summary: T-CLOC — five zones, five minutes, and most mechanical surprises never happen.
estimated_minutes: 18
```

## Step: Five zones, five minutes

```yaml step
id: m2-l3-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "The T-CLOC framework. You'll practice it in the lab next.",
  "blocks": [
    {"type": "text", "md": "Riders who've been at this for decades share a ritual: a slow lap around the machine before every ride. The industry mnemonic for it is **T-CLOC** — five zones that catch the overwhelming majority of preventable mechanical problems:"},
    {"type": "keylist", "title": "T-CLOC", "items": [
      {"term": "T — Tires & wheels", "detail": "Pressure by gauge (not by eye), tread condition, sidewall damage, wheel fasteners snug."},
      {"term": "C — Controls & cables", "detail": "Throttle moves freely and snaps closed. Brake levers firm, not spongy. Steering sweeps lock to lock without binding."},
      {"term": "L — Lights & electrics", "detail": "Headlight, taillight, engine stop switch actually stops the engine. Matters double at dawn, dusk, and dust."},
      {"term": "O — Oil & fuel", "detail": "Levels checked, no fresh drips underneath, fuel enough for the ride plus reserve."},
      {"term": "C — Chassis", "detail": "The look-over: cracks, loose fasteners, anything hanging or freshly bent. Load racks secure."}
    ]},
    {"type": "figure", "assetSlot": "keylist-tcloc", "caption": "Five stations walked as a loop, always from the same starting point — a fixed order is what stops the zone you like least from quietly becoming the one you skip."},
    {"type": "callout", "variant": "caution", "title": "The awareness line", "md": "This course teaches you *what the zones are and what a check is looking for* — enough to do a meaningful walkaround and to know when something needs a qualified mechanic. Your machine's owner's manual gives the exact specs (pressures, fluid points) for your specific model; a hands-on course will put a trainer's eyes on your technique. Use all three."},
    {"type": "callout", "variant": "story", "title": "Why it works", "md": "The walkaround isn't really a mechanical inspection — it's a *change detector*. You saw the machine yesterday; today the ritual makes you see it again. New drip, softer lever, lower tire: changes are the signal, and five minutes of ritual is what makes changes visible."}
  ]
}
```

## Step: Lab — the walkaround

```yaml step
id: m2-l3-s2
section: try
renderer: lab_objective
minutes: 8
required: true
```

```json payload
{
  "instructions": "Work the machine from above: place each T-CLOC zone, then step through what each check looks for.",
  "lab": "walkaround",
  "config": {"assetSlot": "scene-walkaround-top", "zones": ["tires", "controls", "lights", "oil", "chassis"]},
  "objectives": [
    {"id": "place_all", "text": "Place all five T-CLOC zone labels on the correct regions of the machine"},
    {"id": "review_all", "text": "Step through every zone's \"what you're looking for\" card"}
  ],
  "debrief": "Five zones, in the same order every time — order is what makes it a ritual, and ritual is what makes it reliable when you're tired, cold, or excited to ride. Next: log the practice in your journal so the sequence is in your own words."
}
```

## Step: Journal — inspection log

```yaml step
id: m2-l3-s3
section: journal
renderer: journal_builder
minutes: 5
required: true
```

```json payload
{
  "instructions": "Write your walkaround in your own words — the version you'd actually run.",
  "artifactType": "inspection_log",
  "title": "My Walkaround",
  "intro": "Yours, in your words, in your order (start from T-CLOC).",
  "connection": "Your Ride Plan's \"machine\" section will pull straight from this log.",
  "fields": [
    {"id": "sequence", "label": "My five-zone sequence", "prompt": "Write your walkaround as five short lines — zone, then the one thing you most care about in it.", "minLength": 100},
    {"id": "no_go", "label": "My no-go findings", "prompt": "Name three findings that would end the ride before it starts (e.g., spongy brake lever).", "minLength": 60},
    {"id": "defer", "label": "What goes to a mechanic", "prompt": "One line: which kinds of findings do you fix, and which go to someone qualified?", "minLength": 40}
  ]
}
```

# Lesson: Fit Is a Hard Rule

```yaml lesson
id: m2-l4-fit
order: 4
summary: Machine size rules — especially for young riders — are physics, not paperwork.
estimated_minutes: 10
```

## Step: Why fit rules exist

```yaml step
id: m2-l4-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "The physical case for fit rules.",
  "blocks": [
    {"type": "text", "md": "ATVs are rider-active machines: you steer and stabilize with your whole body. That only works if the machine matches the body. Fit is checkable in seconds:"},
    {"type": "keylist", "title": "The fit checks", "items": [
      {"term": "Reach", "detail": "Hands operate every bar control — brakes, throttle, stop switch — without stretching or shifting grip."},
      {"term": "Stance", "detail": "Standing on the pegs with a bend still in the knees and elbows; feet fully on the footwells while seated."},
      {"term": "Leverage", "detail": "Enough body weight and reach to genuinely shift the machine's balance side to side — the \"invisible control\" from Lesson 2."},
      {"term": "Class", "detail": "Manufacturers label machines by intended rider age/size class, and youth-model rules exist across jurisdictions. The class label is a floor, not a formality."}
    ]},
    {"type": "figure", "assetSlot": "keylist-fit-checks", "caption": "Four gates measured on the rider, not on the machine — each one passes or it doesn't, because a machine you almost fit is a machine you can't weight-shift when it counts."},
    {"type": "callout", "variant": "caution", "title": "The pattern worth naming plainly", "md": "Young riders on adult-size machines is one of the most consistent threads in serious ATV incident data. A rider who can't reach, weigh-shift, or hold the machine on a slope hasn't got a smaller margin — they've got *no* margin. If you supervise young riders: right-class machine, gear on, appropriate supervision, and a hands-on youth course. Those four move the odds more than anything else you can do."},
    {"type": "text", "md": "Fit isn't only a youth topic. Adults on borrowed machines, tall riders on small quads, anyone whose reach or strength is compromised that day — the same four checks apply every time the rider-machine pairing changes."}
  ]
}
```

## Step: Checkpoint — the borrowed machine

```yaml step
id: m2-l4-s2
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Module 2 final check.",
  "mode": "multiple_choice",
  "passCopy": "Module 2 complete — you know the machine. Next: what you wear.",
  "reviseCopy": "Reread the fit checks — the answer is one of the four.",
  "inner": {
    "prompt": "A friend offers you their larger ATV for the afternoon. You can reach the brakes, but only by shifting your grip, and standing on the pegs your legs are nearly straight. What's the read?",
    "options": [
      {"id": "a", "text": "Fine — you'll adapt to it within a few minutes of riding", "isBest": false, "feedback": "You'll adapt your *comfort*, not your reach or leverage. The physical gaps are exactly what shows up in the moment you least want them to."},
      {"id": "b", "text": "Two fit checks just failed — this machine doesn't fit you today, so the answer is no", "isBest": true, "feedback": "Right. Reach (shifting grip to brake) and stance (no knee bend) both failed. Fit is a pass/fail gate, and it's re-checked every time the rider-machine pairing changes."},
      {"id": "c", "text": "Acceptable if you keep the speed low", "isBest": false, "feedback": "Slow helps some risks; it doesn't restore reach or leverage. Fit failures aren't speed problems."}
    ],
    "explanation": "The fit gate is the same four checks whether the rider is nine or fifty: reach, stance, leverage, class."
  }
}
```
