# Final Assessment — Question Bank

Format: parsed by the seed pipeline into the final assessment (SPEC-006). All 20
questions are served, one at a time, order shuffled, options shuffled. No inline
feedback during the attempt; the results screen shows per-question feedback and
maps misses to modules (`module` field) for the review interstitial. Pass ≥ 80%
(16/20).

```json assessment
{
  "id": "final-assessment",
  "passPct": 80,
  "questions": [
    {"id": "q1", "module": "m1-riders-mindset", "prompt": "Most serious ATV crashes trace back to:", "options": [
      {"id": "a", "text": "Mechanical failures no one could predict", "correct": false, "feedback": "Genuine mechanical surprise is rare — and most machine contributions are walkaround-catchable."},
      {"id": "b", "text": "A short list of rider decisions: helmet, pavement, passengers, impairment, fit, and outrunning sight lines", "correct": true, "feedback": "The six decisions — the course's spine."},
      {"id": "c", "text": "Freak terrain that couldn't have been seen", "correct": false, "feedback": "Post-crash analysis usually finds the hazard was visible — at the speed and scan the rider was using."}]},
    {"id": "q2", "module": "m1-riders-mindset", "prompt": "Risk factors on a ride combine by:", "options": [
      {"id": "a", "text": "Adding — two factors is twice one", "correct": false, "feedback": "They interact, not stack."},
      {"id": "b", "text": "Multiplying — one raises crash odds while another raises crash cost, drawing down the same margin", "correct": true, "feedback": "Impairment plus no helmet was the canonical example; stacked terrain hazards were another."},
      {"id": "c", "text": "Canceling — experience offsets added risk", "correct": false, "feedback": "Experience helps judgment; it doesn't refund physics."}]},
    {"id": "q3", "module": "m1-riders-mindset", "prompt": "A useful personal risk-profile entry is one that:", "options": [
      {"id": "a", "text": "Covers every possible danger comprehensively", "correct": false, "feedback": "Everything-lists can't fire in the moment."},
      {"id": "b", "text": "Is specific enough that you recognize the exact moment it describes when it arrives", "correct": true, "feedback": "The profile is a tripwire, not an encyclopedia."},
      {"id": "c", "text": "Demonstrates safety commitment to others", "correct": false, "feedback": "It's private and functional — recognition, not optics."}]},
    {"id": "q4", "module": "m2-know-your-machine", "prompt": "T-CLOC stands for:", "options": [
      {"id": "a", "text": "Tires & wheels, Controls & cables, Lights & electrics, Oil & fuel, Chassis", "correct": true, "feedback": "The five zones, same order every time."},
      {"id": "b", "text": "Throttle, Clutch, Levers, Oil, Chain", "correct": false, "feedback": "Close-sounding, wrong zones."},
      {"id": "c", "text": "Terrain, Climate, Load, Operator, Course", "correct": false, "feedback": "A reasonable-sounding invention — but not the walkaround."}]},
    {"id": "q5", "module": "m2-know-your-machine", "prompt": "The pre-ride walkaround works primarily because it:", "options": [
      {"id": "a", "text": "Certifies the machine mechanically sound to standard", "correct": false, "feedback": "It's not a certification — deep issues still go to a mechanic."},
      {"id": "b", "text": "Acts as a change detector — a ritual that makes today's differences (new drip, softer lever, low tire) visible", "correct": true, "feedback": "Ritual + order = reliability, even tired or excited."},
      {"id": "c", "text": "Satisfies insurance requirements", "correct": false, "feedback": "Paperwork isn't the mechanism."}]},
    {"id": "q6", "module": "m2-know-your-machine", "prompt": "Machine fit is checked by:", "options": [
      {"id": "a", "text": "Reach to all controls, stance with bend on the pegs, leverage to shift the machine's balance, and the machine's size class", "correct": true, "feedback": "Four checks, pass/fail, re-run whenever the rider-machine pairing changes."},
      {"id": "b", "text": "Whether the rider feels confident on it", "correct": false, "feedback": "Confidence doesn't extend arms or add leverage."},
      {"id": "c", "text": "A few minutes of riding to adapt", "correct": false, "feedback": "You adapt comfort, not reach."}]},
    {"id": "q7", "module": "m2-know-your-machine", "prompt": "Young riders on adult-size machines is:", "options": [
      {"id": "a", "text": "Acceptable with close supervision", "correct": false, "feedback": "Supervision can't lend reach or leverage — the fit gate still fails."},
      {"id": "b", "text": "One of the most consistent threads in serious ATV incident data — the fit rules are physics, not paperwork", "correct": true, "feedback": "Right-class machine, gear, supervision, and a hands-on youth course are the four biggest levers."},
      {"id": "c", "text": "Fine at low speeds", "correct": false, "feedback": "Fit failures aren't speed problems."}]},
    {"id": "q8", "module": "m3-gear-up", "prompt": "A helmet protects by:", "options": [
      {"id": "a", "text": "Being hard enough to deflect impacts", "correct": false, "feedback": "The shell distributes; the save happens inside."},
      {"id": "b", "text": "Its crushable liner stretching the head's deceleration over milliseconds — which is why it must fit, be fastened, be rated, and be retired after a real impact", "correct": true, "feedback": "One mechanism, four rules."},
      {"id": "c", "text": "Improving rider visibility to others", "correct": false, "feedback": "A side benefit of color at best."}]},
    {"id": "q9", "module": "m3-gear-up", "prompt": "The every-ride gear set is:", "options": [
      {"id": "a", "text": "Fitted rated helmet (fastened), eye protection, over-ankle boots, gloves, long sleeves and pants", "correct": true, "feedback": "Every ride — defined by riding, not by trip length."},
      {"id": "b", "text": "Helmet only — the rest is for rough terrain", "correct": false, "feedback": "The set exists because crashes involve ground, brush, and machines from every angle."},
      {"id": "c", "text": "Whatever matches the day's plans", "correct": false, "feedback": "Conditional items flex; the every-ride five don't."}]},
    {"id": "q10", "module": "m3-gear-up", "prompt": "Gear's unique role among the course's safety layers is that it:", "options": [
      {"id": "a", "text": "Prevents crashes from happening", "correct": false, "feedback": "Judgment prevents; gear does something else."},
      {"id": "b", "text": "Still works after a mistake — yours or someone else's", "correct": true, "feedback": "The only layer operating post-error. You want both layers."},
      {"id": "c", "text": "Signals experience to other riders", "correct": false, "feedback": "Gear works on impact energy, not observers."}]},
    {"id": "q11", "module": "m4-reading-the-terrain", "prompt": "The governing speed rule for terrain is:", "options": [
      {"id": "a", "text": "Never faster than the distance you can see and process", "correct": true, "feedback": "Sight distance is decision distance."},
      {"id": "b", "text": "Match the pace of the most experienced rider present", "correct": false, "feedback": "Group gravity in rule form — their pace assumes their eyes and machine."},
      {"id": "c", "text": "Posted trail speed limits cover it", "correct": false, "feedback": "Limits (where they exist) don't know today's conditions or your sight lines."}]},
    {"id": "q12", "module": "m4-reading-the-terrain", "prompt": "An ATV stays upright while:", "options": [
      {"id": "a", "text": "The center of gravity's vertical line stays inside the tires' support area — which is why side-slopes, high loads, and passengers all attack stability the same way", "correct": true, "feedback": "One model, many rules."},
      {"id": "b", "text": "Speed keeps it gyroscopically stable", "correct": false, "feedback": "Rollovers need no speed at all."},
      {"id": "c", "text": "The rider grips firmly", "correct": false, "feedback": "Grip keeps the rider on the machine; it doesn't move the CoG."}]},
    {"id": "q13", "module": "m4-reading-the-terrain", "prompt": "Rider weight-shift on a side-slope:", "options": [
      {"id": "a", "text": "Is a myth — the rider is too light to matter", "correct": false, "feedback": "The rider is a large fraction of the system's weight and its only movable part."},
      {"id": "b", "text": "Buys genuine but finite stability margin — beyond a point even full lean isn't enough, which is why unverifiable slopes get refused", "correct": true, "feedback": "The lab's second objective, in words."},
      {"id": "c", "text": "Works best leaning downhill for visibility", "correct": false, "feedback": "Downhill lean moves the CoG toward the failing edge — backwards."}]},
    {"id": "q14", "module": "m5-environment-emergencies", "prompt": "Cold and heat get scheduled countermeasures because:", "options": [
      {"id": "a", "text": "They degrade judgment and fine control before the rider notices — self-assessment is the first casualty", "correct": true, "feedback": "The rider is always the last to know."},
      {"id": "b", "text": "Weather stops are traditional", "correct": false, "feedback": "Tradition isn't the mechanism."},
      {"id": "c", "text": "Engines overheat otherwise", "correct": false, "feedback": "The machine handles temperature better than the rider."}]},
    {"id": "q15", "module": "m5-environment-emergencies", "prompt": "The before-you-go trio is:", "options": [
      {"id": "a", "text": "Ride plan with turnaround time, an off-ride contact with a check-in trigger, and a remoteness-sized carry kit", "correct": true, "feedback": "Judgment, time-shifted to when you're best at it."},
      {"id": "b", "text": "Full tank, tire pressure, phone charged", "correct": false, "feedback": "All good — all walkaround/kit items, not the trio."},
      {"id": "c", "text": "Helmet, gloves, boots", "correct": false, "feedback": "That's the gear set — Module 3."}]},
    {"id": "q16", "module": "m5-environment-emergencies", "prompt": "In the first minutes after a crash, the pattern is:", "options": [
      {"id": "a", "text": "Right the machine first to clear the scene", "correct": false, "feedback": "The machine is the least important object present — and moving it can cause the second incident."},
      {"id": "b", "text": "Stop (engines off, scene safe) — Assess (people first; respect signs over 'I'm fine') — Communicate (early, not as a last resort)", "correct": true, "feedback": "And get real first-aid training — the course's sincere recommendation, not a disclaimer."},
      {"id": "c", "text": "Immediately transport the injured person out on any available machine", "correct": false, "feedback": "An injured person on a single-rider machine stacks a foreseeable second incident onto the first."}]},
    {"id": "q17", "module": "m6-roads-rules-people", "prompt": "ATVs handle unpredictably on pavement because:", "options": [
      {"id": "a", "text": "Low-pressure terrain tires squirm on hard surface, rear axles that need wheel-slip fight grippy turns, and the high CoG tips where dirt would slide — and the road adds traffic", "correct": true, "feedback": "Engineering, physics, and environment all pointing one way."},
      {"id": "b", "text": "They actually handle fine — the rule is purely legal", "correct": false, "feedback": "The rule would deserve to exist with no law at all."},
      {"id": "c", "text": "Pavement damages the tires quickly", "correct": false, "feedback": "Wear is real but not the safety mechanism."}]},
    {"id": "q18", "module": "m6-roads-rules-people", "prompt": "A sound road crossing looks like:", "options": [
      {"id": "a", "text": "Full stop, both-direction look, square right-angle line, brisk and steady, each group member crossing on their own judgment, at designated points where marked", "correct": true, "feedback": "Minimum pavement time, no pavement turns, no delegated traffic judgment."},
      {"id": "b", "text": "Follow the leader across while the gap they found is still open", "correct": false, "feedback": "Their gap is three seconds stale — group gravity's most dangerous form."},
      {"id": "c", "text": "Cross diagonally to shorten the exposed distance", "correct": false, "feedback": "Diagonal means longer on pavement AND turning on it — both wrong ways."}]},
    {"id": "q19", "module": "m6-roads-rules-people", "prompt": "Passengers on a single-rider ATV are a hard no because:", "options": [
      {"id": "a", "text": "They raise the CoG, block the rider's weight-shifting, and have nothing designed to hold them — and no speed is slow enough to fix design", "correct": true, "feedback": "Design intent is the question that settles it."},
      {"id": "b", "text": "It's rude to the passenger", "correct": false, "feedback": "Etiquette isn't the mechanism."},
      {"id": "c", "text": "It's fine if the passenger is small", "correct": false, "feedback": "Small passengers still raise the CoG and block the invisible control — and a lap position is worse still."}]},
    {"id": "q20", "module": "m6-roads-rules-people", "prompt": "The impairment standard that actually works is:", "options": [
      {"id": "a", "text": "Stay under the legal driving limit", "correct": false, "feedback": "Driving limits assume an enclosed vehicle on engineered roads; degradation starts below them."},
      {"id": "b", "text": "Riding days are dry days — no in-the-moment arithmetic by the instrument being degraded", "correct": true, "feedback": "Pre-made decisions survive pressure. The course's oldest theme, clearest case."},
      {"id": "c", "text": "Personal timing math based on body weight", "correct": false, "feedback": "Trailside impairment arithmetic is the judgment leak wearing a calculator."}]}
  ]
}
```
