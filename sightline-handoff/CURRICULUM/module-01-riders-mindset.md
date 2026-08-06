---
id: m1-riders-mindset
order: 1
title: The Rider's Mindset
tagline: Most crashes are decided before the wheels turn.
mission: Understand why ATV crashes actually happen, and build your personal risk profile so you know which mistakes are most likely to be yours.
estimated_minutes: 45
badge_id: b-mindset
hero_slot: hero-m1-mindset
objectives:
  - Name the handful of factors behind most serious ATV crashes
  - Recognize how social pressure and familiarity distort risk judgment
  - Build a personal risk profile identifying your own highest-risk situations
---

# Lesson: Why Riders Crash

```yaml lesson
id: m1-l1-why-riders-crash
order: 1
summary: The real crash data tells a simpler story than most riders expect — and it's mostly about decisions.
estimated_minutes: 15
```

## Step: A machine with no cage

```yaml step
id: m1-l1-s1
section: briefing
renderer: content
minutes: 2
required: true
```

```json payload
{
  "instructions": "Read the briefing to set up this lesson.",
  "blocks": [
    {"type": "text", "md": "An ATV weighs roughly as much as three or four adults, rides on soft, low-pressure tires, and puts nothing between you and the ground. That combination is exactly why it can go places a truck can't — and exactly why the margin for error is thin.\n\nHere's the part experienced riders will tell you: the machine is rarely the problem. **Most serious ATV crashes trace back to a decision made before or during the ride** — where to ride, how to ride, what to wear, who's aboard, and what condition the rider was in."},
    {"type": "callout", "variant": "story", "title": "The pattern", "md": "Ask a search-and-rescue volunteer what their ATV callouts have in common and you'll hear the same short list on repeat: no helmet, paved road or unfamiliar ground, a passenger on a machine built for one, alcohol, or a rider on a machine too big for them. This module is about getting that list into your head before it applies to you."},
    {"type": "text", "md": "This course won't teach you throttle technique — that's what hands-on training is for. What it will do is train the judgment layer: seeing risk clearly, early, and personally."}
  ]
}
```

## Step: Predict the top factor

```yaml step
id: m1-l1-s2
section: learn
renderer: prediction_reveal
minutes: 3
required: true
```

```json payload
{
  "instructions": "Before we look at the pattern, commit to a prediction.",
  "question": "Across serious ATV crashes, which factor shows up most often?",
  "options": [
    {"id": "speed", "label": "Excessive speed for conditions"},
    {"id": "mechanical", "label": "Mechanical failure"},
    {"id": "helmet", "label": "Riding without a helmet"},
    {"id": "terrain", "label": "Freak terrain the rider couldn't have seen"}
  ],
  "reveal": {
    "perOption": {
      "speed": "Speed is a huge player — but it usually shows up *alongside* something else: speed **plus** unfamiliar terrain, speed **plus** no helmet. It's an amplifier.",
      "mechanical": "Genuine mechanical surprise is rare in the record. When machines contribute, it's usually something a pre-ride check would have caught — which is a decision, not a failure.",
      "helmet": "Close to the mark. Helmet absence doesn't *cause* crashes, but it's the single factor that most reliably turns a survivable crash into a life-changing one.",
      "terrain": "\"Couldn't have seen it\" is rarer than riders think. Post-crash analysis usually finds the hazard was visible — the rider was moving too fast to process it, or didn't know what to look for. Module 4 fixes that."
    },
    "md": "There is no single villain. Serious crashes cluster around a short list of **choices**: no helmet, riding on pavement, carrying a passenger on a single-rider machine, riding impaired, riding a machine that doesn't fit the rider, and outrunning your sight lines. Every one of those is decided by a person, which means every one of them is preventable by a person. That's the whole premise of this course."
  }
}
```

## Step: The short list

```yaml step
id: m1-l1-s3
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "These six show up throughout the course. Learn them as a set.",
  "blocks": [
    {"type": "keylist", "title": "The six decisions behind most serious crashes", "items": [
      {"term": "Bare head", "detail": "No helmet, or a helmet that doesn't fit or isn't fastened. The most consequential single choice a rider makes."},
      {"term": "Pavement", "detail": "ATVs are engineered for soft, uneven ground. On pavement they handle unpredictably and roll more easily in turns — Module 6 covers the physics."},
      {"term": "Extra rider", "detail": "A passenger on a machine designed for one changes balance and blocks the rider's ability to shift weight — which is how ATVs are steered and stabilized."},
      {"term": "Impairment", "detail": "Alcohol or drugs before or during a ride. Balance, reaction time, and judgment are the three things riding runs on; impairment attacks all three."},
      {"term": "Wrong-size machine", "detail": "Riders — especially young riders — on machines too large or powerful for them. Fit rules exist because leverage and reach are physical requirements, not suggestions."},
      {"term": "Outrunning your eyes", "detail": "Riding faster than the distance you can see and process — over crests, around brush, into shadow. If you can't see it, you can't choose around it."}
    ]},
    {"type": "callout", "variant": "tip", "title": "Why decisions, not skills?", "md": "Skill matters — and hands-on training builds it. But the record says most serious outcomes were shaped by choices any rider could have made differently *regardless of skill level*. Judgment scales instantly; skill takes seasons."}
  ]
}
```

## Step: Check — spot the amplifier

```yaml step
id: m1-l1-s4
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Checkpoint for this lesson.",
  "mode": "multiple_choice",
  "passCopy": "That's the mindset. On to the trail decisions.",
  "reviseCopy": "Look back at the six decisions — the answer lives there.",
  "inner": {
    "prompt": "A capable adult rider on a well-maintained ATV rides familiar trails — but tonight adds one beer before heading out and skips the helmet \"because it's a short loop.\" What just happened to their risk?",
    "options": [
      {"id": "a", "text": "Barely changed — skill and familiarity carry the ride", "isBest": false, "feedback": "Familiarity helps you spot hazards, but it does nothing for reaction time or for what happens to an unprotected head in a crash. Two of the six decisions just flipped the wrong way at once."},
      {"id": "b", "text": "It multiplied — impairment degrades the rider while the missing helmet raises the cost of any mistake", "isBest": true, "feedback": "Exactly. Risk factors don't add, they multiply: one raises the odds of a crash, the other raises the severity of the crash. \"Short loop\" changes neither."},
      {"id": "c", "text": "It only matters if they ride fast", "isBest": false, "feedback": "Speed is an amplifier too — but plenty of serious crashes happen at modest speeds. A slow rollover onto an unprotected head is not a minor event."}
    ],
    "explanation": "The habit to build: whenever a ride changes — even by one small choice — re-ask which of the six decisions just moved."
  }
}
```

# Lesson: Judgment Under Pressure

```yaml lesson
id: m1-l2-judgment-pressure
order: 2
summary: Risk judgment is easy alone at a desk. Riders lose it to groups, moods, and momentum. Practice keeping it.
estimated_minutes: 15
```

## Step: The judgment leaks

```yaml step
id: m1-l2-s1
section: learn
renderer: content
minutes: 4
required: true
```

```json payload
{
  "instructions": "Three ways good judgment leaks out of good riders.",
  "blocks": [
    {"type": "text", "md": "You now know the short list. The harder problem is that riders who *know* the list still override it in the moment. Three leaks do most of the damage:"},
    {"type": "keylist", "title": "The three leaks", "items": [
      {"term": "Group gravity", "detail": "When the group rides past a hazard, following feels safer than it is and stopping feels more awkward than it should. The rider at the back inherits everyone else's choices — plus dust and worse sight lines."},
      {"term": "Familiarity discount", "detail": "\"I've ridden this trail a hundred times\" quietly becomes \"this trail can't surprise me.\" Trails change — washouts, downed limbs, new mud, other people. Your hundredth ride is on a trail you've never seen in today's condition."},
      {"term": "Sunk momentum", "detail": "You're two hours in, the light's going, and the shortcut looks tempting. Tired riders don't get more cautious; they get more committed to finishing. Fatigue is when plans should get *more* conservative, and usually get less."}
    ]},
    {"type": "callout", "variant": "tip", "title": "The out-loud rule", "md": "Judgment holds better when it's spoken. \"I'm going around this one\" or \"I'm taking the long way back\" said out loud — even to yourself — turns a vague discomfort into a decision. Groups with one person willing to say it out loud make better calls; be that person."}
  ]
}
```

## Step: Scenario — the creek line

```yaml step
id: m1-l2-s2
section: try
renderer: branching_decision
minutes: 6
required: true
```

```json payload
{
  "instructions": "Ride the scenario. Your choices are honored — including the risky ones. You'll see where each leads.",
  "scenario": "Late afternoon, a group of four on familiar trails. Spring melt has the creek higher than you've ever seen it at the usual crossing — fast, opaque, edges undercut. The two lead riders splash through without stopping and wave from the far bank. Your friend behind you shouts \"just gun it!\"",
  "startNode": "n1",
  "nodes": [
    {
      "id": "n1",
      "prompt": "The far bank is thirty feet away. What's your move?",
      "choices": [
        {"id": "follow", "label": "Follow their line — they made it", "quality": "risky", "feedback": "You start across. Their crossing told you the line held *their* weight on *their* line two minutes ago — moving water rearranges beds fast, and you can't see yours. Halfway across, your front wheel drops into a scoured hole they missed. You're stopped, in current, on an unstable machine. This is how riders and machines end up downstream. Back up the decision: what could you have checked first?", "next": "n1"},
        {"id": "assess", "label": "Stop on the bank and assess before deciding", "quality": "best", "feedback": "You stop. From the bank you can actually look: how fast is the water moving, can you see bottom, is there a wider/shallower reach nearby, and what happens downstream if something goes wrong? Two of those answers are bad today. Stopping cost you thirty seconds and bought you the whole decision.", "next": "n2"},
        {"id": "defer", "label": "Wave them on — you'll find another way and meet up", "quality": "okay", "feedback": "A defensible instinct — you refused a crossing you couldn't judge. Stronger version: stop and *assess* first, then decide with information. Sometimes the crossing is fine and you learn why; sometimes it isn't and now you can name the reason to the group instead of just peeling off.", "next": "n2"}
      ]
    },
    {
      "id": "n2",
      "prompt": "You judge this crossing a bad bet today. The lead riders are on the far bank pointing at the light: \"We're losing the sun — it's this or the long way.\" What do you say?",
      "choices": [
        {"id": "cave", "label": "\"Fine — but slow.\" Cross carefully.", "quality": "risky", "feedback": "\"Carefully\" doesn't change the water. A hazard you judged a bad bet doesn't become a good bet at lower speed — slower in fast current can mean *more* time exposed on an unstable bed. Notice what happened: the group's schedule just outvoted your judgment. Try the moment again.", "next": "n2"},
        {"id": "voice", "label": "\"Not this one, not today. I'm taking the long way — who's with me?\"", "quality": "best", "feedback": "Out loud, specific, and it offers the group an easy exit ramp. In real groups this sentence works far more often than new riders expect — usually at least one other rider was waiting for someone to say it. The long way home is a story; the crossing gone wrong is an incident report.", "next": null},
        {"id": "silent", "label": "Turn around without a word and head back alone", "quality": "okay", "feedback": "You kept yourself out of the water — genuinely the most important thing. But a group that splits without communicating has created a new problem: nobody knows who's where if something goes wrong on either route. Module 5 is all about this. The strongest move keeps your judgment *and* the group's awareness.", "next": null}
      ]
    }
  ],
  "debrief": "The strongest line was assess → say it out loud with an exit ramp. Notice that no riding skill was involved anywhere — this entire scenario was decided by whether you stopped, what you checked, and what you said. That's the mindset this course trains, and it's the part that transfers to every machine you'll ever ride."
}
```

## Step: Your own leak

```yaml step
id: m1-l2-s3
section: debrief
renderer: reflection
minutes: 2
required: true
```

```json payload
{
  "instructions": "For you — not graded, not shared.",
  "prompt": "Which leak is most likely to get *you* — group gravity, the familiarity discount, or sunk momentum? Where has it shown up in your life already (riding or not)?",
  "chips": ["Group gravity", "Familiarity discount", "Sunk momentum", "Honestly, all three"],
  "allowText": true
}
```

# Lesson: Your Risk Profile

```yaml lesson
id: m1-l3-risk-profile
order: 3
summary: Generic safety advice bounces off. A risk profile written in your own words sticks. Build yours.
estimated_minutes: 15
```

## Step: Risk is personal

```yaml step
id: m1-l3-s1
section: learn
renderer: content
minutes: 3
required: true
```

```json payload
{
  "instructions": "Why a personal profile beats a generic checklist.",
  "blocks": [
    {"type": "text", "md": "Two riders can face the same trail with completely different risk pictures. A new rider's biggest exposure might be machine fit and inexperience with terrain; a twenty-year veteran's might be the familiarity discount and riding alone in remote country. **Your risk profile is the honest answer to: where are *my* margins thinnest?**"},
    {"type": "callout", "variant": "tip", "title": "How to answer well", "md": "Be specific enough that future-you recognizes the moment when it arrives. \"I take chances\" is useless. \"When I'm the last one ready, I skip steps to catch up\" is a profile entry that will actually fire when it matters."}
  ]
}
```

## Step: Build your risk profile

```yaml step
id: m1-l3-s2
section: journal
renderer: journal_builder
minutes: 7
required: true
```

```json payload
{
  "instructions": "Your first Field Journal artifact. It travels with you through the course.",
  "artifactType": "risk_profile",
  "title": "My Risk Profile",
  "intro": "Four honest entries. You'll revisit this in Module 6 when you build your Ride Plan.",
  "connection": "Your Ride Plan capstone starts from this profile — the hazards and habits you name here become the things your plan explicitly guards against.",
  "fields": [
    {"id": "experience", "label": "Where I am as a rider", "prompt": "Pick the honest one.", "options": ["Brand new — haven't ridden yet or just starting", "Some rides, still learning the machine", "Comfortable, several seasons in", "Very experienced — which brings its own risks"]},
    {"id": "likely_leak", "label": "My most likely judgment leak", "prompt": "Which leak from Lesson 2 is most likely to get you, and in what situation?", "minLength": 60},
    {"id": "riding_context", "label": "Where and how I expect to ride", "prompt": "Terrain, typical group or solo, distance from help — one or two sentences.", "minLength": 40},
    {"id": "commitments", "label": "Two lines I won't cross", "prompt": "Write two specific personal rules drawn from the six decisions (e.g., \"No ride without my helmet fastened, even to move the machine across the yard.\").", "minLength": 60}
  ]
}
```

## Step: Checkpoint — the profile in action

```yaml step
id: m1-l3-s3
section: checkpoint
renderer: checkpoint
minutes: 3
required: true
```

```json payload
{
  "instructions": "Last check for Module 1.",
  "mode": "multiple_choice",
  "passCopy": "Module 1 complete. Next: the machine itself.",
  "reviseCopy": "Think about what a risk profile is *for* — recognition in the moment.",
  "inner": {
    "prompt": "What makes a risk-profile entry actually useful on ride day?",
    "options": [
      {"id": "a", "text": "It covers every possible danger so nothing is missed", "isBest": false, "feedback": "An everything-list is a nothing-list — it can't fire in the moment because it's always technically relevant. Profiles work by being short and personal."},
      {"id": "b", "text": "It's specific enough that you recognize the exact moment it describes when that moment arrives", "isBest": true, "feedback": "Right. The profile is a tripwire: when the described moment shows up (\"last one ready, tempted to skip steps\"), the entry fires and buys you the pause."},
      {"id": "c", "text": "It proves to others that you take safety seriously", "isBest": false, "feedback": "The journal is private and for you. Safety optics change nothing on the trail; recognition does."}
    ],
    "explanation": "Everything else in this course hangs off this idea: safety knowledge only matters if it surfaces at the moment of decision."
  }
}
```
