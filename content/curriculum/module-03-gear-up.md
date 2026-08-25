---
id: m3-gear-up
order: 3
title: Gear Up
tagline: Gear is the only safety decision that keeps working after a mistake.
mission: Understand what protective gear actually does, get helmet choice and fit right, and build the gear card you'll pack from.
estimated_minutes: 40
badge_id: b-geared
hero_slot: hero-m3-gear
objectives:
  - Explain what a helmet does and what makes one fit correctly
  - Know the every-ride gear set from head to toe and what each item protects against
  - Build a personal gear card including condition and replacement awareness
---

# Lesson: The Helmet

```yaml lesson
id: m3-l1-helmet
order: 1
summary: The single highest-leverage object in this course. What it does, how it fits, when it retires.
estimated_minutes: 15
```

## Step: What a helmet actually does

```yaml step
id: m3-l1-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "Understand the mechanism — it makes every fit rule obvious.",
  "blocks": [
    {"type": "text", "md": "A helmet has one job: **stretch out the time** over which your head decelerates in an impact. The crushable liner collapses over milliseconds, and those milliseconds are the difference between forces a brain can take and forces it can't. Everything else about helmets falls out of this:"},
    {"type": "keylist", "title": "Consequences of the mechanism", "items": [
      {"term": "It must be ON and fastened", "detail": "The liner can't help a head it isn't attached to. A crash while just moving the machine across the yard obeys the same physics as a crash miles out on the trail."},
      {"term": "It must FIT", "detail": "A loose helmet shifts on impact and can present its edge instead of its shell. Snug all around, no rocking front-to-back, cheek pads in contact, strap so only two fingers fit under it."},
      {"term": "It must be RATED", "detail": "Look for a motorsports safety certification on the shell: a DOT sticker, or whatever the equivalent is where you ride. That label means someone actually tested how the liner crushes. A bicycle helmet is built for a different kind of impact, and a thin uncertified shell sold just to look like a helmet isn't built for impact at all."},
      {"term": "It crushes ONCE", "detail": "The liner is single-use at real impact energies. A helmet that's taken a serious hit — or bounced hard off concrete from height — has spent some of its one crush. Retire it. Same for aging: manufacturers give a service life (commonly ~5 years of use); liners degrade."}
    ]},
    {"type": "figure", "assetSlot": "scene-helmet-fit", "caption": "The liner is the mechanism. The shell spreads the hit; the liner crushes to buy milliseconds — which is why fit, fastening, rating, and retirement are all the same rule wearing different clothes."},
    {"type": "callout", "variant": "tip", "title": "Eyes too", "md": "Goggles or a face shield ride with the helmet every time. Trail speed turns dust, brush, and stones into eye hazards, and watering eyes at the wrong moment is a control failure. Two features are worth insisting on: anti-fog, and a strap that sits on the helmet rather than against your bare head."}
  ]
}
```

## Step: Predict — the dropped helmet

```yaml step
id: m3-l1-s2
section: learn
renderer: prediction_reveal
minutes: 3
required: true
```

```json payload
{
  "instructions": "A garage-floor classic. Commit to a call.",
  "question": "Your helmet rolls off the rack and bonks the garage floor from waist height. Is it done?",
  "options": [
    {"id": "done", "label": "Done — any impact retires a helmet"},
    {"id": "fine", "label": "Fine — that's nowhere near crash energy"},
    {"id": "inspect", "label": "Depends — inspect it and decide"}
  ],
  "reveal": {
    "perOption": {
      "done": "A defensibly cautious instinct — and if the drop was harder than it looked, cheap insurance. But a rule that retires helmets for every touch mostly teaches people to ignore the rule.",
      "fine": "Usually true for a short unloaded drop — the liner is designed for far bigger energies with a head inside. But \"usually\" is doing work in that sentence.",
      "inspect": "The keeper. Look it over: shell cracks or gouges, liner dents or separation, anything rattling. Clean inspection after a minor unloaded drop → ride on. Any doubt, or any drop that involved real height or a loaded helmet → retire it. Manufacturers will inspect or advise if you're unsure."
    },
    "md": "The principle generalizes to all gear: **inspect after events, retire on doubt.** A helmet's liner is invisible from outside, which is why the bias runs toward retirement when the event was significant — the one component you can't verify is the one doing the lifesaving."
  }
}
```

## Step: Check — fit call

```yaml step
id: m3-l1-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "Helmet handled. Now the rest of you.",
  "reviseCopy": "Back to the mechanism — what does a shifting helmet do at impact?",
  "inner": {
    "prompt": "A helmet feels comfortable but rocks noticeably front-to-back when you shake your head. Why is that a real problem rather than a comfort quirk?",
    "options": [
      {"id": "a", "text": "It'll get annoying on long rides", "isBest": false, "feedback": "It will — but annoyance isn't why fit is a safety gate."},
      {"id": "b", "text": "A shifting helmet can be out of position at impact, protecting the wrong part of the head or presenting an edge", "isBest": true, "feedback": "Exactly. The liner only works where it sits, and impact happens too fast for the helmet to be anywhere but where it already was."},
      {"id": "c", "text": "Rocking wears out the strap faster", "isBest": false, "feedback": "Strap wear is a maintenance item, not the core issue. Position at impact is."}
    ],
    "explanation": "Fit checks take fifteen seconds: snug all around, no rock, cheek contact, two-finger strap."
  }
}
```

# Lesson: Head to Toe

```yaml lesson
id: m3-l2-head-to-toe
order: 2
summary: Sort the full gear picture — what rides every time, what's conditional, and what never belongs on a machine.
estimated_minutes: 12
```

## Step: Sort the gear

```yaml step
id: m3-l2-s1
section: try
renderer: sort_categorize
minutes: 7
required: true
```

```json payload
{
  "instructions": "Sort each item into the right column. Don't worry about getting it right the first time; a wrong drop explains itself.",
  "shuffle": true,
  "categories": [
    {"id": "every", "label": "Every ride", "hint": "Non-negotiables, any distance, any weather"},
    {"id": "conditions", "label": "Conditions & ride type", "hint": "Smart when the situation calls for it"},
    {"id": "never", "label": "Never on the machine", "hint": "Actively makes riding more dangerous"}
  ],
  "items": [
    {"id": "helmet", "label": "Rated, fitted helmet — fastened", "categoryId": "every", "explanation": "Lesson 1 in one line: on, fitted, fastened, every single time the wheels turn."},
    {"id": "eyes", "label": "Goggles or face shield", "categoryId": "every", "explanation": "Eye protection rides with the helmet. Dust, brush, and stones don't check your plans first."},
    {"id": "boots", "label": "Over-the-ankle boots", "categoryId": "every", "explanation": "Ankle support and coverage against pegs, rocks, brush, and heat. Sneakers give up all four."},
    {"id": "gloves", "label": "Riding gloves", "categoryId": "every", "explanation": "Grip when sweaty, protection from brush and blisters, and hands are what you land on."},
    {"id": "longs", "label": "Long sleeves and long pants", "categoryId": "every", "explanation": "The minimum abrasion and brush barrier — sturdy fabric, not \"technically long.\""},
    {"id": "chest", "label": "Chest/roost protector", "categoryId": "conditions", "explanation": "Strong call for rougher terrain, group riding in dust and thrown stones, and for young riders generally."},
    {"id": "hiviz", "label": "High-visibility layer or flag", "categoryId": "conditions", "explanation": "Shared trails, hunting seasons, dusk, dunes — whenever being seen is part of being safe."},
    {"id": "layers", "label": "Weather layers (rain shell, insulation)", "categoryId": "conditions", "explanation": "Module 5 territory: cold and wet degrade the rider before the rider notices. Pack for the weather you might get, not the weather you have."},
    {"id": "loose", "label": "Loose scarf, drawstrings, dangling straps", "categoryId": "never", "explanation": "Anything that dangles can find moving parts or brush. Tuck, zip, or leave it home."},
    {"id": "flipflops", "label": "Sandals or flip-flops", "categoryId": "never", "explanation": "No ankle support, no coverage, and they leave the pegs at the first bounce."},
    {"id": "headphones", "label": "Both-ears headphones", "categoryId": "never", "explanation": "Engine note, other machines, voices, and terrain sounds are safety information. Riding deaf discards a sense you need."}
  ]
}
```

## Step: The gear habit

```yaml step
id: m3-l2-s2
section: debrief
renderer: content
minutes: 3
required: true
```

```json payload
{
  "instructions": "Two habits that make the gear list real.",
  "blocks": [
    {"type": "callout", "variant": "tip", "title": "Habit 1 — gear lives together", "md": "Helmet, goggles, gloves, boots in one spot. If you can grab the whole set in one motion, you will actually wear it. Gear scattered across the house is gear that gets skipped \"just this once.\""},
    {"type": "callout", "variant": "tip", "title": "Habit 2 — check your gear like you check the machine", "md": "Once a season, inspect your gear the same way you'd inspect the ATV. Look at the helmet (Lesson 1), the goggle strap and lens, the soles of your boots, the palms of your gloves, and how old all of it is. Gear wears out on a schedule, the same way tires do. Your gear card next lesson has a condition line for exactly this reason."},
    {"type": "text", "md": "One more framing worth keeping: gear is the only layer of this whole course that still works **after** a mistake — yours or someone else's. Judgment prevents crashes; gear survives them. You want both layers, every ride."}
  ]
}
```

# Lesson: Your Gear Card

```yaml lesson
id: m3-l3-gear-card
order: 3
summary: Turn the gear picture into the card you'll actually pack from.
estimated_minutes: 13
```

## Step: Build your gear card

```yaml step
id: m3-l3-s1
section: journal
renderer: journal_builder
minutes: 7
required: true
```

```json payload
{
  "instructions": "Your packing source of truth. Specific beats aspirational.",
  "artifactType": "gear_card",
  "title": "My Gear Card",
  "intro": "This card is what your Ride Plan's gear section will pull from — write it like a checklist you'd hand yourself at 6am.",
  "connection": "The Ride Plan capstone pre-fills its gear section from this card.",
  "fields": [
    {"id": "every_ride", "label": "My every-ride set", "prompt": "List your five non-negotiables with the detail that matters (e.g., \"DOT helmet — the gray one that fits, not the loaner\").", "minLength": 80},
    {"id": "conditional", "label": "My conditional additions", "prompt": "Which condition-based items apply to the riding you described in your Risk Profile, and what triggers packing them?", "minLength": 60},
    {"id": "condition_check", "label": "Condition & age notes", "prompt": "Anything in your current or planned kit due for inspection or replacement? Helmet age counts.", "minLength": 30},
    {"id": "gap", "label": "My gap", "prompt": "The one piece of gear you don't own yet that matters most for your riding — name it.", "options": ["Rated helmet that actually fits me", "Proper over-ankle boots", "Goggles that don't fog", "Chest protection", "Weather layers", "Riding gloves", "Nothing — kit's complete"]}
  ]
}
```

## Step: Checkpoint — gear logic

```yaml step
id: m3-l3-s2
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Module 3 final check.",
  "mode": "multiple_choice",
  "passCopy": "Geared up. Next: reading the ground itself.",
  "reviseCopy": "Think about which layer works after a mistake happens.",
  "inner": {
    "prompt": "It's a two-minute ride down a familiar dirt lane to grab the mail. Full gear feels absurd. What's the honest analysis?",
    "options": [
      {"id": "a", "text": "Short familiar rides are low enough risk that gear is genuinely optional", "isBest": false, "feedback": "Distance shortens exposure time, but a single unlucky second is all a crash takes — and familiar ground plus no gear is literally two entries from Module 1's short list stacked together."},
      {"id": "b", "text": "Helmet and eyes minimum, every time the wheels turn — the crash doesn't know it's a short ride", "isBest": true, "feedback": "Right. The physics of one bad moment are identical at minute two and mile twenty. This is why the every-ride set is defined by *riding*, not by trip length."},
      {"id": "c", "text": "Gear matters mainly for making a responsible impression", "isBest": false, "feedback": "Gear works on impact energy, not on observers. Wear it where no one's watching — that's most rides."}
    ],
    "explanation": "\"Every ride\" earns its name in exactly these moments. Your gear card exists so the decision is pre-made."
  }
}
```
