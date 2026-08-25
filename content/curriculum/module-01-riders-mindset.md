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
    {"type": "text", "md": "This course won't teach you throttle technique — that's what hands-on training is for. What it will do is train the judgment layer: seeing risk clearly, early, and personally."},
    {"type": "callout", "variant": "tip", "title": "Why decisions, not skills?", "md": "Skill matters — and hands-on training builds it. But the record says most serious outcomes were shaped by choices any rider could have made differently *regardless of skill level*. Judgment scales instantly; skill takes seasons."}
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
renderer: hotspot_list
minutes: 5
required: true
```

```json payload
{
  "instructions": "Find all six marks around the rider, then open each one. The step is done when you've read every one.",
  "assetSlot": "scene-six-decisions",
  "intro": "Six decisions ring one geared rider at equal distance. None of them outranks the others, and every one is close enough to reach you on an ordinary ride.",
  "requireAll": true,
  "hotspots": [
    {
      "id": "helmet",
      "label": "Bare head",
      "x": 50.0,
      "y": 11.62,
      "description": "No helmet, or a helmet that doesn't fit or isn't fastened. The most consequential single choice a rider makes."
    },
    {
      "id": "pavement",
      "label": "Pavement",
      "x": 70.5,
      "y": 31.69,
      "description": "ATVs are engineered for soft, uneven ground. On pavement they handle unpredictably and roll more easily in turns — Module 6 covers the physics."
    },
    {
      "id": "passenger",
      "label": "Extra rider",
      "x": 70.3,
      "y": 66.75,
      "description": "A passenger on a machine designed for one changes balance and blocks the rider's ability to shift weight — which is how ATVs are steered and stabilized."
    },
    {
      "id": "impairment",
      "label": "Impairment",
      "x": 49.97,
      "y": 87.4,
      "description": "Alcohol or drugs before or during a ride. Balance, reaction time, and judgment are the three things riding runs on; impairment attacks all three."
    },
    {
      "id": "fit",
      "label": "Wrong-size machine",
      "x": 29.61,
      "y": 66.55,
      "description": "Riders — especially young riders — on machines too large or powerful for them. Fit rules exist because leverage and reach are physical requirements, not suggestions."
    },
    {
      "id": "eyes",
      "label": "Outrunning your eyes",
      "x": 29.35,
      "y": 31.49,
      "description": "Riding faster than the distance you can see and process — over crests, around brush, into shadow. If you can't see it, you can't choose around it."
    }
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
    "prompt": "A capable adult rider on a well-maintained ATV rides familiar trails — but tonight adds one beer and skips the helmet, convinced that's the cooler way to ride. What just happened to their risk?",
    "options": [
      {"id": "a", "text": "Barely changed — skill and familiarity carry the ride", "isBest": false, "feedback": "Familiarity helps you spot hazards, but it does nothing for reaction time or for what happens to an unprotected head in a crash. Two of the six decisions just flipped the wrong way at once."},
      {"id": "b", "text": "It multiplied — impairment degrades the rider while the missing helmet raises the cost of any mistake", "isBest": true, "feedback": "Exactly. Risk factors don't add, they multiply: one raises the odds of a crash, the other raises the severity of the crash. Looking cool changes neither."},
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
  "instructions": "Three ways good riders talk themselves into bad calls.",
  "blocks": [
    {"type": "text", "md": "You know the short list now. Here's the catch: *knowing* it doesn't stop you from talking yourself past it on the trail. That usually happens one of three ways:"},
    {"type": "keylist", "title": "The three leaks", "items": [
      {"term": "Group gravity", "detail": "Everyone else rode past it, so you do too — pulling over feels awkward and keeping up feels safe. It isn't. And the rider at the back gets the worst deal: everyone else's choices, plus their dust and half the view."},
      {"term": "Familiarity discount", "detail": "\"I've ridden this trail a hundred times\" quietly slides into \"nothing here can surprise me.\" But the trail you remember isn't the trail today — rain reshapes it, limbs drop across it, other people show up on it. Ride number one hundred deserves fresh eyes."},
      {"term": "Sunk momentum", "detail": "\"We've come this far.\" Two hours in, light fading, and the shortcut starts looking smart. Tired riders don't get more careful — they get set on being done. The end of a long day is exactly when your plan should get safer, and it's when most riders let it slip."}
    ]},
    {"type": "figure", "assetSlot": "keylist-three-leaks", "caption": "Think of judgment as a tank with three slow leaks. It never empties all at once — which is why a rider running on low still feels like they're thinking straight."},
    {"type": "callout", "variant": "tip", "title": "The out-loud rule", "md": "Judgment holds better when you say it. \"I'm going around this one\" or \"I'm heading back the long way\" — spoken out loud, even just to yourself — turns a nagging feeling into an actual decision. Every group makes better calls when one person is willing to say it first. Be that person."}
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
  "scenario": "Mid-morning, a group of four on familiar trails. Spring melt has the creek higher than you've ever seen it at the usual crossing — fast, opaque, edges undercut. The two lead riders splash through without stopping and wave from the far bank. Your friend to your left shouts \"just gun it!\"",
  "startNode": "n1",
  "nodes": [
    {
      "id": "n1",
      "prompt": "The far bank is thirty feet away. What's your move?",
      "choices": [
        {"id": "follow", "label": "Follow their line — they made it", "quality": "risky", "feedback": "You start across. Their crossing told you the line held *their* weight on *their* line two minutes ago — moving water rearranges beds fast, and you can't see yours. Halfway across, your front wheel drops into a scoured hole they missed. You're stopped, in current, on an unstable machine. This is how riders and machines end up downstream. Back up the decision: what could you have checked first?", "next": "n1"},
        {"id": "assess", "label": "Stop on the bank and assess before deciding", "quality": "best", "feedback": "You stop. In good morning light you can actually look: how fast is the water moving, can you see bottom, is there a wider/shallower reach nearby, and what happens downstream if something goes wrong? The usual line fails two of those checks — but fifty yards up you find a wider, slower reach where you can see bottom, and the group crosses there. Thirty seconds of stopping bought the whole decision.", "next": "n2"},
        {"id": "defer", "label": "Wave them on — you'll find another way and meet up", "quality": "okay", "feedback": "A defensible instinct — you refused a crossing you couldn't judge. Stronger version: stop and *assess* first, then decide with information. Sometimes the crossing is fine and you learn why; sometimes it isn't and now you can name the reason to the group instead of just peeling off.", "next": "n2"}
      ]
    },
    {
      "id": "n2",
      "report": "Another ride, weeks later. Same group, same trail, same crossing — except you're at it after dark this time, and the melt still has the creek up. Your headlight flattens the water into one black sheet: no speed, no depth, no bottom. The two who led that day are already across again, their lights small in the trees. The water sounds louder than it did in daylight.",
      "prompt": "The lead riders idle at the far edge: \"We've ridden this crossing all spring — same line, quick, done.\" What do you say?",
      "choices": [
        {"id": "cave", "label": "\"Same line as always — go.\" Cross by headlight.", "quality": "risky", "feedback": "Every daylight read you have of this crossing is weeks old — melt-fed creeks climb, drop, and rearrange their beds all spring, and a bed that shifted won't announce it. At night the water tells you nothing: headlight glare turns the surface into a mirror, and depth and speed become guesses. You'd be crossing on memory, through water you can't see. That's the familiarity discount with the lights off. Try the moment again.", "next": "n2"},
        {"id": "voice", "label": "\"Not in the dark — we can't read the water. Long way around, who's with me?\"", "quality": "best", "feedback": "Out loud, specific, and it names the real problem: not nerve — visibility. A dark trail holds still under your headlight; moving water you can't read is a different animal. Groups take this exit ramp more often than new riders expect. The long way around is a story; a night crossing gone wrong is a search party.", "next": null},
        {"id": "silent", "label": "Turn around without a word and take the long way alone", "quality": "okay", "feedback": "You kept yourself out of water you couldn't see — genuinely the most important thing. But a group that splits up in the dark without a word has created a second problem: nobody knows who's where if either route goes wrong, and night makes that worse. Module 5 is all about this. The strongest move keeps your judgment *and* the group's awareness.", "next": null}
      ]
    }
  ],
  "debrief": "The strongest line was assess in the light, then say it out loud in the dark. Same creek, two rides, two different problems: in daylight, stopping could buy you information; after dark there was none to buy — low visibility turned a crossing you'd already ridden into unknown ground. Notice that no riding skill was involved anywhere — this scenario was decided by whether you stopped, what you could actually see, and what you said. That's the mindset this course trains, and it's the part that transfers to every machine you'll ever ride."
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
