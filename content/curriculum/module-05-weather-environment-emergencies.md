---
id: m5-environment-emergencies
order: 5
title: Weather, Environment & Emergencies
tagline: The ride starts before the ride, and help starts before the emergency.
mission: Learn how conditions change the whole risk picture, how a ride plan and communication turn remoteness from a danger into a variable, and how to think in the first minutes when something goes wrong.
estimated_minutes: 50
badge_id: b-prepared
hero_slot: hero-m5-environment
objectives:
  - Adjust the risk picture for weather, temperature, light, and dust
  - Build the before-you-go trio — ride plan, communication plan, carry kit
  - Apply the stop-assess-communicate pattern to trouble scenarios
---

# Lesson: Conditions Change Everything

```yaml lesson
id: m5-l1-conditions
order: 1
summary: The same trail is a different trail in different conditions. Sort the adjustments.
estimated_minutes: 13
```

## Step: The condition multipliers

```yaml step
id: m5-l1-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "Four condition families and what each one attacks.",
  "blocks": [
    {"type": "text", "md": "Module 4 taught you to read the ground. Conditions are the layer that re-writes what you read — the same trail at noon in July and at dusk after rain are two different trails wearing one name."},
    {"type": "hotspot_figure", "assetSlot": "keylist-four-families", "ratio": "3 / 2",
     "prompt": "Open each family to see what it attacks — the trail, or the rider.",
     "caption": "Water and light change the trail you're reading; cold, heat, and dust change the rider doing the reading — and a hard day usually hands you one from each side.",
     "stops": [
      {"id": "water", "x": 12.3, "y": 22.6, "size": 18, "term": "Water — rain, mud, crossings", "detail": "Attacks traction and hides ground. Wet roots and clay behave like ice; standing water conceals depth and scour. Fast-moving water is its own category: it moves machines, and depth/current judgment fails from the seat (Module 1's creek, forever)."},
      {"id": "light", "x": 35.1, "y": 22.6, "size": 18, "term": "Light — dusk, dawn, shadow", "detail": "Attacks the scan. Depth cues flatten, ruts vanish, and your Module 4 skill quietly loses resolution. Failing light is a schedule instrument: turnaround time exists because of it."},
      {"id": "temperature", "x": 86.1, "y": 24.2, "size": 16, "term": "Cold & heat", "detail": "Attack the rider. Cold stiffens hands (throttle and brake precision), then judgment itself as the body diverts resources. Heat dehydrates and dulls attention. Both degrade you *before* you notice — the rider is always the last to know."},
      {"id": "dust", "x": 87.5, "y": 67.7, "size": 17, "term": "Dust & visibility", "detail": "Attacks spacing. Following a machine in its dust cone means riding blind at whatever speed the group set. The fix is distance — enough that you see trail, not tailgate."}
     ]},
    {"type": "callout", "variant": "tip", "title": "The condition question", "md": "Before every ride, ask one question: **\"What's different today?\"** New rain, first frost, later start, bigger group, heavier load. The answer is the list of adjustments. A ride where the honest answer is \"quite a lot is different\" is a ride that deserves a smaller plan."}
  ]
}
```

## Step: Sort — condition to adjustment

```yaml step
id: m5-l1-s2
section: try
renderer: sort_categorize
minutes: 6
required: true
```

```json payload
{
  "instructions": "Each situation demands an adjustment. Sort them by the adjustment family they call for first.",
  "shuffle": true,
  "categories": [
    {"id": "slow_space", "label": "Slow down / add space", "hint": "Speed and spacing adjustments"},
    {"id": "reroute_reschedule", "label": "Change route or schedule", "hint": "Plan-level adjustments"},
    {"id": "rider_care", "label": "Tend the rider", "hint": "Layers, water, rest, warm-up"}
  ],
  "items": [
    {"id": "dust_cone", "label": "Riding third in a dry-day group, trail disappearing in dust", "categoryId": "slow_space", "explanation": "Open the gap until the trail is visible again. Dust spacing is non-negotiable — you can't read ground you can't see."},
    {"id": "wet_roots", "label": "Rain overnight; the trail crosses wooded root sections", "categoryId": "slow_space", "explanation": "Wet roots are near-zero traction. Speed down, crossings as square as the trail allows, no braking mid-root."},
    {"id": "fading_light", "label": "The loop is running 40 minutes behind and sunset is fixed", "categoryId": "reroute_reschedule", "explanation": "Light doesn't negotiate. Shorten the loop now, while the choosing is easy — dusk terrain-reading is a skill downgrade you don't take voluntarily."},
    {"id": "storm_line", "label": "Forecast shifted: thunderstorm line arriving mid-ride", "categoryId": "reroute_reschedule", "explanation": "Storms bring water, wind, deadfall, and lightning exposure on open ground. Reschedule or re-route short — the trail will still be there."},
    {"id": "numb_hands", "label": "An hour in cold drizzle, your hands are clumsy on the levers", "categoryId": "rider_care", "explanation": "Clumsy hands are degraded controls. Stop, warm up, add layers, eat something — and factor the new pace into your turnaround math."},
    {"id": "heat_headache", "label": "Hot afternoon, a dull headache and you can't remember your last drink", "categoryId": "rider_care", "explanation": "That's dehydration talking, and attention goes next. Shade, water, real rest — and a shorter afternoon than you planned."},
    {"id": "swollen_crossing", "label": "The usual creek crossing is visibly higher and faster than you've seen it", "categoryId": "reroute_reschedule", "explanation": "Module 1's scenario as a sorting card: moving water you can't judge from the bank is a route change, not a technique challenge."},
    {"id": "first_frost", "label": "First frosty morning of the season, shaded corners still white", "categoryId": "slow_space", "explanation": "Frost is patchy ice that hides in shade. Slow through shadows and treat every shaded corner as suspect until the day warms."}
  ]
}
```

## Step: Check — the last to know

```yaml step
id: m5-l1-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint.",
  "mode": "multiple_choice",
  "passCopy": "Conditions read. Now the before-you-go trio.",
  "reviseCopy": "Which family attacks the rider rather than the trail?",
  "inner": {
    "prompt": "Why do cold and heat deserve *scheduled* countermeasures (planned stops, layer changes, drink timers) rather than \"I'll adjust when I feel it\"?",
    "options": [
      {"id": "a", "text": "Because scheduled stops make the ride more social", "isBest": false, "feedback": "Pleasant, but not the mechanism."},
      {"id": "b", "text": "Because both degrade judgment and fine control before the rider subjectively notices — the impaired rider is the worst judge of their own impairment", "isBest": true, "feedback": "Exactly. You schedule countermeasures precisely because the feedback loop (\"I feel fine\") is the first thing that breaks."},
      {"id": "c", "text": "Because stopping frequently protects the engine", "isBest": false, "feedback": "The machine handles temperature better than the rider does. This one's about you."}
    ],
    "explanation": "Same logic as Module 1's impairment rule — cold and heat are slow-onset impairment."
  }
}
```

# Lesson: Before You Go

```yaml lesson
id: m5-l2-before-you-go
order: 2
summary: Ride plan, communication plan, carry kit — the trio that turns remoteness into just another variable.
estimated_minutes: 13
```

## Step: The trio

```yaml step
id: m5-l2-s1
section: learn
renderer: content
minutes: 5
required: true
```

```json payload
{
  "instructions": "Three artifacts every serious ride carries — two on paper, one on the rack.",
  "blocks": [
    {"type": "text", "md": "Remoteness isn't dangerous by itself — *unplanned* remoteness is. The difference between an inconvenience and an emergency ten miles from the trailhead is almost always preparation that happened in the driveway."},
    {"type": "hotspot_figure", "assetSlot": "keylist-before-you-go", "ratio": "3 / 2",
     "prompt": "Open each artifact — all three exist in the driveway or not at all.",
     "caption": "All three exist in the driveway or they don't exist at all — not one of them can be assembled at the moment you find out you needed it.",
     "stops": [
      {"id": "plan", "x": 21.5, "y": 84.0, "size": 13, "term": "1. The ride plan", "detail": "Where you're going, the route, who's along, and — the part people skip — the **turnaround time**: the clock time at which you head back regardless of where you are. Light and fatigue math done in advance, when you're smart."},
      {"id": "comms", "x": 48.5, "y": 83.0, "size": 13, "term": "2. The communication plan", "detail": "Someone NOT on the ride knows the plan and the check-in time, and knows what to do if you miss it (who to call, where you said you'd be). Phones die and lose coverage in exactly the terrain ATVs love — the plan can't live only in your pocket. For genuinely remote country, satellite messengers exist; awareness of that option is part of the plan."},
      {"id": "kit", "x": 84.6, "y": 45.4, "size": 13, "term": "3. The carry kit", "detail": "Awareness-level contents: water and food beyond the plan, first-aid basics you know how to use, tool basics for your machine, a way to make light, a way to stay warm if the ride becomes a wait, and navigation that doesn't need a signal. Sized to remoteness — the mail-run kit and the backcountry kit are different kits."}
     ]},
    {"type": "callout", "variant": "story", "title": "The check-in that worked", "md": "Ask around and you'll find a version of this story in every riding community: machine dead in a drainage at dusk, no coverage — and a rider who was warm, fed, and found within hours *because someone in town knew the route and the missed check-in time meant something*. The trio isn't paperwork. It's the difference between \"a long evening\" and a search that starts at midnight with no starting point."}
  ]
}
```

## Step: Match — plan element to failure it prevents

```yaml step
id: m5-l2-s2
section: try
renderer: match
minutes: 4
required: true
```

```json payload
{
  "instructions": "Every element of the trio exists because of a specific failure. Match them.",
  "shuffle": true,
  "pairs": [
    {"id": "p1", "left": "Turnaround time", "right": "Sunk momentum pushing tired riders to \"just finish the loop\" into failing light", "explanation": "The decision is made in the driveway so the tired version of you doesn't get a vote."},
    {"id": "p2", "left": "Off-ride contact with check-in time", "right": "Nobody noticing you're overdue until far too late — and searchers having no starting point", "explanation": "The missed check-in is the alarm; the shared route is the map. Both require a person who isn't with you."},
    {"id": "p3", "left": "Water and food beyond the plan", "right": "A two-hour breakdown becoming a physiological problem on top of a mechanical one", "explanation": "The kit assumes the ride goes longer than the plan — because the days it matters, it did."},
    {"id": "p4", "left": "Signal-free navigation", "right": "One dead battery deleting your ability to answer \"where am I and which way is out\"", "explanation": "Map/GPS redundancy that doesn't share a failure mode with your phone."},
    {"id": "p5", "left": "Warmth for an unplanned wait", "right": "A mild evening turning dangerous when you're stationary, sweaty, and the temperature drops", "explanation": "Riding generates heat; waiting doesn't. The gap between those is what a packed layer covers."}
  ]
}
```

## Step: Reflection — your remoteness

```yaml step
id: m5-l2-s3
section: debrief
renderer: reflection
minutes: 2
required: true
```

```json payload
{
  "instructions": "Calibrate the trio to your riding.",
  "prompt": "For the riding you described in your Risk Profile — how far is help, really? And who's your off-ride contact going to be?",
  "chips": ["Minutes away — but the trio still applies", "An hour-plus — kit gets serious", "Genuinely remote — every element matters", "I honestly hadn't thought about a contact"],
  "allowText": true
}
```

# Lesson: When Things Go Wrong

```yaml lesson
id: m5-l3-when-things-go-wrong
order: 3
summary: The first minutes decide everything. Learn the stop-assess-communicate pattern and run a scenario.
estimated_minutes: 14
```

## Step: The first-minutes pattern

```yaml step
id: m5-l3-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "A thinking pattern, not a medical course.",
  "blocks": [
    {"type": "text", "md": "This course won't teach you medicine — real first-aid training is hands-on and worth every hour, and this module's honest advice is to go get it. What an awareness course *can* give you is the thinking pattern that keeps the first minutes from making things worse:"},
    {"type": "keylist", "title": "Stop — Assess — Communicate", "items": [
      {"term": "STOP", "detail": "Kill the urgency before it kills the judgment. Machines off, scene safe — is anything still moving, leaking, or about to slide? The second incident (a helper hurt, a machine rolling further) is a classic pattern, and it's prevented in this step."},
      {"term": "ASSESS", "detail": "People first, machines a distant second. Who's hurt and how urgently? What are the real resources — people, kit, coverage, daylight? Serious mechanisms (a rider who hit their head, a machine that landed on someone) mean professional help, full stop — the machismo shortcut of \"walking it off\" is how bad days become worse ones."},
      {"term": "COMMUNICATE", "detail": "Early, not as a last resort. Call emergency services the moment the situation might need them — canceling help that's rolling is easy; summoning help you delayed is not. No coverage? This is the moment the communication plan pays: someone knows where you are and when you're due."}
    ]},
    {"type": "figure", "assetSlot": "keylist-stop-assess-communicate", "caption": "The one list in this course that is genuinely an order — the instinct is to run straight to the person on the ground, and the stage before that is what keeps one hurt rider from becoming two."},
    {"type": "callout", "variant": "caution", "title": "The boundary, plainly", "md": "Anything beyond scene safety, basic aid you're actually trained in, and getting professional help fast is outside this course — and mostly outside untrained hands. \"Get real training\" isn't a disclaimer here; it's the module's sincere recommendation. Ranger will hold the same line if you ask."}
  ]
}
```

## Step: Scenario — the silent radio

```yaml step
id: m5-l3-s2
section: try
renderer: branching_decision
minutes: 7
required: true
```

```json payload
{
  "instructions": "Run the pattern under pressure.",
  "scenario": "Group of three, spread out on a climb. You crest and wait. One buddy arrives. The third doesn't. Two minutes. Five. You ride back down and find their ATV on its side at the outside of a bend, engine still running — and your friend sitting on the ground beside it, holding their wrist, pale, saying \"I'm fine, help me flip it.\"",
  "startNode": "n1",
  "nodes": [
    {
      "id": "n1",
      "prompt": "First move?",
      "choices": [
        {"id": "flip", "label": "Do what they ask — flip the machine first", "quality": "risky", "feedback": "The machine is the least important object on this hillside, and it's running on its side (fuel, hot parts, and it may move when righted — the second-incident pattern in the flesh). Meanwhile your pale friend cradling a wrist has not actually been assessed by anyone, including themselves. Run the pattern from the top.", "next": "n1"},
        {"id": "stop_first", "label": "Engines off — theirs and yours — scene check, then look at THEM", "quality": "best", "feedback": "STOP done: engines silent, machine stable where it lies, no one downhill of it. Now the person: pale is a sign worth respecting, and \"I'm fine\" from someone pale and guarding a wrist is data about their adrenaline, not their condition. On to ASSESS.", "next": "n2"},
        {"id": "yell_up", "label": "Shout up the hill for your other buddy before anything", "quality": "okay", "feedback": "More hands are genuinely useful — but the running, tipped machine and your unassessed friend are the clock right now. Kill the engines and check the person; wave the third rider down as you do. Sequence matters.", "next": "n2"}
      ]
    },
    {
      "id": "n2",
      "prompt": "Assessment: wrist swelling fast, they can't grip; they didn't hit their head (helmet unmarked, story consistent); otherwise moving fine but shaky. Trailhead is 40 minutes of easy trail; one bar of signal flickers on your phone. Now what?",
      "choices": [
        {"id": "ride_out_injured", "label": "They're a good rider — splint-ish it and let them ride themselves out", "quality": "risky", "feedback": "A rider who can't grip can't brake or throttle on one side — you'd be sending a degraded rider back onto the trail that just claimed them, which stacks a foreseeable second incident onto the first. The pattern says resources: you HAVE better options. Reconsider.", "next": "n2"},
        {"id": "call_plan", "label": "Use the flickering bar NOW to call/text out the situation and location, then move them out as a passenger-appropriate plan — or wait for help — based on what gets through", "quality": "best", "feedback": "COMMUNICATE early, exactly. A short text with location and situation often survives coverage a call won't. And your transport thinking is right: an injured person doesn't ride a single-rider machine out as a passenger — the plan is help coming in, or walking-pace escort if they can genuinely ride one-handed nothing-required terrain, or waiting warm with your kit. You also know your off-ride contact expects a check-in — the system you built in Lesson 2 is now working for you.", "next": null},
        {"id": "wait_silent", "label": "Keep them warm and comfortable and wait — someone will come eventually", "quality": "okay", "feedback": "Warm and monitored is good care — but \"eventually\" is doing dangerous work in that sentence if nobody knows to come. Waiting is only a plan when communication has happened or a missed check-in will trigger it. Send the message first, then wait as comfortably as your kit allows.", "next": null}
      ]
    }
  ],
  "debrief": "Score the scenario against the pattern: STOP prevented a second incident, ASSESS overruled \"I'm fine,\" and COMMUNICATE-early turned a flickering bar into a working plan. Notice also what made every good option possible: the kit on your rack and the contact in town — decisions made before the ride, back when everything was easy."
}
```

## Step: Journal — readiness plan

```yaml step
id: m5-l3-s3
section: journal
renderer: journal_builder
minutes: 5
required: true
```

```json payload
{
  "instructions": "Build your readiness plan — the trio, personalized.",
  "artifactType": "readiness_plan",
  "title": "My Readiness Plan",
  "intro": "Concrete beats complete. Names, times, and items you actually own.",
  "connection": "Your Ride Plan's communication & emergency section starts from this plan.",
  "fields": [
    {"id": "contact", "label": "My off-ride contact & trigger", "prompt": "Who gets your ride plan, what's your check-in method, and exactly what should they do if you miss it?", "minLength": 60},
    {"id": "turnaround", "label": "My turnaround rule", "prompt": "How will you set turnaround time for a ride? Write the rule, not a number (e.g., \"halfway to sunset minus an hour, set before I leave\").", "minLength": 40},
    {"id": "kit", "label": "My carry kit", "prompt": "List your kit for your typical remoteness — the honest current version, plus the one item you need to add.", "minLength": 80},
    {"id": "first_minutes", "label": "My first-minutes card", "prompt": "Write stop-assess-communicate as three lines in your own words — the version you'd remember shaky.", "minLength": 60}
  ]
}
```

# Lesson: Environment Checkpoint

```yaml lesson
id: m5-l4-environment-checkpoint
order: 4
summary: Close the module with one synthesis check.
estimated_minutes: 5
```

## Step: Checkpoint — the whole system

```yaml step
id: m5-l4-s1
section: checkpoint
renderer: checkpoint
minutes: 4
required: true
```

```json payload
{
  "instructions": "Module 5 final check.",
  "mode": "multiple_choice",
  "passCopy": "Prepared. One module left: roads, rules, and everyone else.",
  "reviseCopy": "Think about WHEN each element of the trio does its work.",
  "inner": {
    "prompt": "What do turnaround times, off-ride contacts, and carry kits all have in common that makes them work?",
    "options": [
      {"id": "a", "text": "They're all decided and built BEFORE the ride, when judgment is fresh and options are cheap — so the degraded, pressured version of you inherits good decisions instead of making bad ones", "isBest": true, "feedback": "That's the module in one sentence. Preparation is judgment, time-shifted to when you're best at it."},
      {"id": "b", "text": "They all require expensive equipment", "isBest": false, "feedback": "A turnaround time costs nothing and an off-ride contact costs a text message. The trio is mostly free."},
      {"id": "c", "text": "They guarantee nothing will go wrong", "isBest": false, "feedback": "Nothing guarantees that. The trio changes what going-wrong *costs* — from emergency to inconvenience."}
    ],
    "explanation": "Same principle as the gear card and the walkaround: pre-made decisions survive pressure; improvised ones don't."
  }
}
```
