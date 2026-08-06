/* Dev-only renderer sandbox (/dev/renderers, DEV builds only — the route is
 * registered behind import.meta.env.DEV and lazy-loaded, so this chunk never
 * ships in production). Mounts every Wave 1 renderer through ActivityHost with
 * REAL payloads copied verbatim from content/curriculum module 1–3 files, no
 * API required. Evidence persists to local state with an on-screen inspector,
 * so every renderer is browser-verified before the lesson player wires up.
 *
 * File length note: the verbatim curriculum payloads live inline by design —
 * they are the point of the sandbox — which puts this file over the usual
 * ~400-line guideline.
 */
import { useMemo, useState } from "react";
import type { StepOut } from "../../lib/api";
import type { EvidenceDraft, StepEvidenceLike } from "../../activities/types";
import { ActivityHost } from "../../activities/ActivityHost";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { BlazeMarker } from "../../components/BlazeMarker";
import { StepRail } from "../../components/StepRail";
import { SectionInterstitial } from "../../components/SectionInterstitial";
import { ModuleCard } from "../../components/ModuleCard";
import { LessonRow } from "../../components/LessonRow";
import { XpChip } from "../../components/XpChip";

// ---------------------------------------------------------------------------
// Sample steps — payloads verbatim from content/curriculum (modules 1–3).
// ---------------------------------------------------------------------------

const STEPS: { source: string; step: StepOut }[] = [
  {
    source: "module-01 · m1-l1-s1",
    step: {
      id: "m1-l1-s1",
      order: 1,
      section: "briefing",
      renderer: "content",
      title: "A machine with no cage",
      minutes: 2,
      required: true,
      payload: {
        instructions: "Read the briefing to set up this lesson.",
        blocks: [
          {
            type: "text",
            md: "An ATV weighs roughly as much as three or four adults, rides on soft, low-pressure tires, and puts nothing between you and the ground. That combination is exactly why it can go places a truck can't — and exactly why the margin for error is thin.\n\nHere's the part experienced riders will tell you: the machine is rarely the problem. **Most serious ATV crashes trace back to a decision made before or during the ride** — where to ride, how to ride, what to wear, who's aboard, and what condition the rider was in.",
          },
          {
            type: "callout",
            variant: "story",
            title: "The pattern",
            md: "Ask a search-and-rescue volunteer what their ATV callouts have in common and you'll hear the same short list on repeat: no helmet, paved road or unfamiliar ground, a passenger on a machine built for one, alcohol, or a rider on a machine too big for them. This module is about getting that list into your head before it applies to you.",
          },
          {
            type: "text",
            md: "This course won't teach you throttle technique — that's what hands-on training is for. What it will do is train the judgment layer: seeing risk clearly, early, and personally.",
          },
        ],
      },
    },
  },
  {
    source: "module-01 · m1-l1-s2",
    step: {
      id: "m1-l1-s2",
      order: 2,
      section: "learn",
      renderer: "prediction_reveal",
      title: "Predict the top factor",
      minutes: 3,
      required: true,
      payload: {
        instructions: "Before we look at the pattern, commit to a prediction.",
        question: "Across serious ATV crashes, which factor shows up most often?",
        options: [
          { id: "speed", label: "Excessive speed for conditions" },
          { id: "mechanical", label: "Mechanical failure" },
          { id: "helmet", label: "Riding without a helmet" },
          { id: "terrain", label: "Freak terrain the rider couldn't have seen" },
        ],
        reveal: {
          perOption: {
            speed:
              "Speed is a huge player — but it usually shows up *alongside* something else: speed **plus** unfamiliar terrain, speed **plus** no helmet. It's an amplifier.",
            mechanical:
              "Genuine mechanical surprise is rare in the record. When machines contribute, it's usually something a pre-ride check would have caught — which is a decision, not a failure.",
            helmet:
              "Close to the mark. Helmet absence doesn't *cause* crashes, but it's the single factor that most reliably turns a survivable crash into a life-changing one.",
            terrain:
              "\"Couldn't have seen it\" is rarer than riders think. Post-crash analysis usually finds the hazard was visible — the rider was moving too fast to process it, or didn't know what to look for. Module 4 fixes that.",
          },
          md: "There is no single villain. Serious crashes cluster around a short list of **choices**: no helmet, riding on pavement, carrying a passenger on a single-rider machine, riding impaired, riding a machine that doesn't fit the rider, and outrunning your sight lines. Every one of those is decided by a person, which means every one of them is preventable by a person. That's the whole premise of this course.",
        },
      },
    },
  },
  {
    source: "module-02 · m2-l4-s2 (checkpoint inner, mounted bare)",
    step: {
      id: "sandbox-mc",
      order: 3,
      section: "learn",
      renderer: "multiple_choice",
      title: "The borrowed machine",
      minutes: 3,
      required: true,
      payload: {
        instructions: "Knowledge check.",
        prompt:
          "A friend offers you their larger ATV for the afternoon. You can reach the brakes, but only by shifting your grip, and standing on the pegs your legs are nearly straight. What's the read?",
        options: [
          {
            id: "a",
            text: "Fine — you'll adapt to it within a few minutes of riding",
            isBest: false,
            feedback:
              "You'll adapt your *comfort*, not your reach or leverage. The physical gaps are exactly what shows up in the moment you least want them to.",
          },
          {
            id: "b",
            text: "Two fit checks just failed — this machine doesn't fit you today, so the answer is no",
            isBest: true,
            feedback:
              "Right. Reach (shifting grip to brake) and stance (no knee bend) both failed. Fit is a pass/fail gate, and it's re-checked every time the rider-machine pairing changes.",
          },
          {
            id: "c",
            text: "Acceptable if you keep the speed low",
            isBest: false,
            feedback:
              "Slow helps some risks; it doesn't restore reach or leverage. Fit failures aren't speed problems.",
          },
        ],
        explanation:
          "The fit gate is the same four checks whether the rider is nine or fifty: reach, stance, leverage, class.",
      },
    },
  },
  {
    source: "module-01 · m1-l1-s4",
    step: {
      id: "m1-l1-s4",
      order: 4,
      section: "checkpoint",
      renderer: "checkpoint",
      title: "Check — spot the amplifier",
      minutes: 3,
      required: true,
      payload: {
        instructions: "Checkpoint for this lesson.",
        mode: "multiple_choice",
        passCopy: "That's the mindset. On to the trail decisions.",
        reviseCopy: "Look back at the six decisions — the answer lives there.",
        inner: {
          prompt:
            "A capable adult rider on a well-maintained ATV rides familiar trails — but tonight adds one beer before heading out and skips the helmet \"because it's a short loop.\" What just happened to their risk?",
          options: [
            {
              id: "a",
              text: "Barely changed — skill and familiarity carry the ride",
              isBest: false,
              feedback:
                "Familiarity helps you spot hazards, but it does nothing for reaction time or for what happens to an unprotected head in a crash. Two of the six decisions just flipped the wrong way at once.",
            },
            {
              id: "b",
              text: "It multiplied — impairment degrades the rider while the missing helmet raises the cost of any mistake",
              isBest: true,
              feedback:
                "Exactly. Risk factors don't add, they multiply: one raises the odds of a crash, the other raises the severity of the crash. \"Short loop\" changes neither.",
            },
            {
              id: "c",
              text: "It only matters if they ride fast",
              isBest: false,
              feedback:
                "Speed is an amplifier too — but plenty of serious crashes happen at modest speeds. A slow rollover onto an unprotected head is not a minor event.",
            },
          ],
          explanation:
            "The habit to build: whenever a ride changes — even by one small choice — re-ask which of the six decisions just moved.",
        },
      },
    },
  },
  {
    source: "module-03 · m3-l2-s1",
    step: {
      id: "m3-l2-s1",
      order: 5,
      section: "try",
      renderer: "sort_categorize",
      title: "Sort the gear",
      minutes: 7,
      required: true,
      payload: {
        instructions:
          "Sort each item into the right column. Wrong drops explain themselves — use them.",
        shuffle: true,
        categories: [
          { id: "every", label: "Every ride", hint: "Non-negotiables, any distance, any weather" },
          {
            id: "conditions",
            label: "Conditions & ride type",
            hint: "Smart when the situation calls for it",
          },
          {
            id: "never",
            label: "Never on the machine",
            hint: "Actively makes riding more dangerous",
          },
        ],
        items: [
          {
            id: "helmet",
            label: "Rated, fitted helmet — fastened",
            categoryId: "every",
            explanation:
              "Lesson 1 in one line: on, fitted, fastened, every single time the wheels turn.",
          },
          {
            id: "eyes",
            label: "Goggles or face shield",
            categoryId: "every",
            explanation:
              "Eye protection rides with the helmet. Dust, brush, and stones don't check your plans first.",
          },
          {
            id: "boots",
            label: "Over-the-ankle boots",
            categoryId: "every",
            explanation:
              "Ankle support and coverage against pegs, rocks, brush, and heat. Sneakers give up all four.",
          },
          {
            id: "gloves",
            label: "Riding gloves",
            categoryId: "every",
            explanation:
              "Grip when sweaty, protection from brush and blisters, and hands are what you land on.",
          },
          {
            id: "longs",
            label: "Long sleeves and long pants",
            categoryId: "every",
            explanation:
              "The minimum abrasion and brush barrier — sturdy fabric, not \"technically long.\"",
          },
          {
            id: "chest",
            label: "Chest/roost protector",
            categoryId: "conditions",
            explanation:
              "Strong call for rougher terrain, group riding in dust and thrown stones, and for young riders generally.",
          },
          {
            id: "hiviz",
            label: "High-visibility layer or flag",
            categoryId: "conditions",
            explanation:
              "Shared trails, hunting seasons, dusk, dunes — whenever being seen is part of being safe.",
          },
          {
            id: "layers",
            label: "Weather layers (rain shell, insulation)",
            categoryId: "conditions",
            explanation:
              "Module 5 territory: cold and wet degrade the rider before the rider notices. Pack for the weather you might get, not the weather you have.",
          },
          {
            id: "loose",
            label: "Loose scarf, drawstrings, dangling straps",
            categoryId: "never",
            explanation:
              "Anything that dangles can find moving parts or brush. Tuck, zip, or leave it home.",
          },
          {
            id: "flipflops",
            label: "Sandals or flip-flops",
            categoryId: "never",
            explanation:
              "No ankle support, no coverage, and they leave the pegs at the first bounce.",
          },
          {
            id: "headphones",
            label: "Both-ears headphones",
            categoryId: "never",
            explanation:
              "Engine note, other machines, voices, and terrain sounds are safety information. Riding deaf discards a sense you need.",
          },
        ],
      },
    },
  },
  {
    source: "module-02 · m2-l2-s1",
    step: {
      id: "m2-l2-s1",
      order: 6,
      section: "learn",
      renderer: "match",
      title: "Match the controls",
      minutes: 5,
      required: true,
      payload: {
        instructions:
          "Connect each control to what it actually does. Wrong guesses teach — try freely.",
        shuffle: true,
        pairs: [
          {
            id: "p1",
            left: "Thumb throttle",
            right:
              "Meters engine power — designed so a bump can't yank it open the way a twist grip could when you're bounced",
            explanation:
              "The thumb lever is an ATV-specific safety design: rough ground jostles your whole arm, and a thumb lever falls closed instead of twisting open.",
          },
          {
            id: "p2",
            left: "Front brake lever",
            right: "Slows the wheels that carry most of the weight during braking",
            explanation:
              "Weight shifts forward when slowing — the front brake does serious work, which is why lever feel is a walkaround item.",
          },
          {
            id: "p3",
            left: "Rear/foot brake",
            right:
              "Adds controlled slowing without loading the front — matters on loose or downhill ground",
            explanation:
              "Awareness-level: knowing both systems exist and both get checked is the course's concern; blending them well is hands-on training's.",
          },
          {
            id: "p4",
            left: "Engine stop switch",
            right: "Kills the engine instantly from the bars — findable without looking",
            explanation:
              "You should be able to hit it by feel. If you can't reach it comfortably, the machine may not fit you (Lesson 4).",
          },
          {
            id: "p5",
            left: "Gear selector / range",
            right:
              "Chooses forward ranges, neutral, reverse — low range for slow technical work and heavy loads",
            explanation:
              "Wrong range for the job means fighting the machine — a stability tax you don't need.",
          },
          {
            id: "p6",
            left: "Body position",
            right:
              "The invisible control: shifting rider weight is how ATVs are balanced through terrain",
            explanation:
              "Not a lever at all — but ask any trainer and they'll call it the most important control on the machine. It's why passengers on single-rider ATVs are a hard no (Module 6).",
          },
        ],
      },
    },
  },
  {
    source: "module-01 · m1-l2-s2",
    step: {
      id: "m1-l2-s2",
      order: 7,
      section: "try",
      renderer: "branching_decision",
      title: "Scenario — the creek line",
      minutes: 6,
      required: true,
      payload: {
        instructions:
          "Ride the scenario. Your choices are honored — including the risky ones. You'll see where each leads.",
        scenario:
          "Late afternoon, a group of four on familiar trails. Spring melt has the creek higher than you've ever seen it at the usual crossing — fast, opaque, edges undercut. The two lead riders splash through without stopping and wave from the far bank. Your friend behind you shouts \"just gun it!\"",
        startNode: "n1",
        nodes: [
          {
            id: "n1",
            prompt: "The far bank is thirty feet away. What's your move?",
            choices: [
              {
                id: "follow",
                label: "Follow their line — they made it",
                quality: "risky",
                feedback:
                  "You start across. Their crossing told you the line held *their* weight on *their* line two minutes ago — moving water rearranges beds fast, and you can't see yours. Halfway across, your front wheel drops into a scoured hole they missed. You're stopped, in current, on an unstable machine. This is how riders and machines end up downstream. Back up the decision: what could you have checked first?",
                next: "n1",
              },
              {
                id: "assess",
                label: "Stop on the bank and assess before deciding",
                quality: "best",
                feedback:
                  "You stop. From the bank you can actually look: how fast is the water moving, can you see bottom, is there a wider/shallower reach nearby, and what happens downstream if something goes wrong? Two of those answers are bad today. Stopping cost you thirty seconds and bought you the whole decision.",
                next: "n2",
              },
              {
                id: "defer",
                label: "Wave them on — you'll find another way and meet up",
                quality: "okay",
                feedback:
                  "A defensible instinct — you refused a crossing you couldn't judge. Stronger version: stop and *assess* first, then decide with information. Sometimes the crossing is fine and you learn why; sometimes it isn't and now you can name the reason to the group instead of just peeling off.",
                next: "n2",
              },
            ],
          },
          {
            id: "n2",
            prompt:
              "You judge this crossing a bad bet today. The lead riders are on the far bank pointing at the light: \"We're losing the sun — it's this or the long way.\" What do you say?",
            choices: [
              {
                id: "cave",
                label: "\"Fine — but slow.\" Cross carefully.",
                quality: "risky",
                feedback:
                  "\"Carefully\" doesn't change the water. A hazard you judged a bad bet doesn't become a good bet at lower speed — slower in fast current can mean *more* time exposed on an unstable bed. Notice what happened: the group's schedule just outvoted your judgment. Try the moment again.",
                next: "n2",
              },
              {
                id: "voice",
                label: "\"Not this one, not today. I'm taking the long way — who's with me?\"",
                quality: "best",
                feedback:
                  "Out loud, specific, and it offers the group an easy exit ramp. In real groups this sentence works far more often than new riders expect — usually at least one other rider was waiting for someone to say it. The long way home is a story; the crossing gone wrong is an incident report.",
                next: null,
              },
              {
                id: "silent",
                label: "Turn around without a word and head back alone",
                quality: "okay",
                feedback:
                  "You kept yourself out of the water — genuinely the most important thing. But a group that splits without communicating has created a new problem: nobody knows who's where if something goes wrong on either route. Module 5 is all about this. The strongest move keeps your judgment *and* the group's awareness.",
                next: null,
              },
            ],
          },
        ],
        debrief:
          "The strongest line was assess → say it out loud with an exit ramp. Notice that no riding skill was involved anywhere — this entire scenario was decided by whether you stopped, what you checked, and what you said. That's the mindset this course trains, and it's the part that transfers to every machine you'll ever ride.",
      },
    },
  },
  {
    source: "module-01 · m1-l2-s3",
    step: {
      id: "m1-l2-s3",
      order: 8,
      section: "debrief",
      renderer: "reflection",
      title: "Your own leak",
      minutes: 2,
      required: true,
      payload: {
        instructions: "For you — not graded, not shared.",
        prompt:
          "Which leak is most likely to get *you* — group gravity, the familiarity discount, or sunk momentum? Where has it shown up in your life already (riding or not)?",
        chips: ["Group gravity", "Familiarity discount", "Sunk momentum", "Honestly, all three"],
        allowText: true,
      },
    },
  },
  {
    source: "module-01 · m1-l3-s2",
    step: {
      id: "m1-l3-s2",
      order: 9,
      section: "journal",
      renderer: "journal_builder",
      title: "Build your risk profile",
      minutes: 7,
      required: true,
      payload: {
        instructions: "Your first Field Journal artifact. It travels with you through the course.",
        artifactType: "risk_profile",
        title: "My Risk Profile",
        intro: "Four honest entries. You'll revisit this in Module 6 when you build your Ride Plan.",
        connection:
          "Your Ride Plan capstone starts from this profile — the hazards and habits you name here become the things your plan explicitly guards against.",
        fields: [
          {
            id: "experience",
            label: "Where I am as a rider",
            prompt: "Pick the honest one.",
            options: [
              "Brand new — haven't ridden yet or just starting",
              "Some rides, still learning the machine",
              "Comfortable, several seasons in",
              "Very experienced — which brings its own risks",
            ],
          },
          {
            id: "likely_leak",
            label: "My most likely judgment leak",
            prompt: "Which leak from Lesson 2 is most likely to get you, and in what situation?",
            minLength: 60,
          },
          {
            id: "riding_context",
            label: "Where and how I expect to ride",
            prompt: "Terrain, typical group or solo, distance from help — one or two sentences.",
            minLength: 40,
          },
          {
            id: "commitments",
            label: "Two lines I won't cross",
            prompt:
              "Write two specific personal rules drawn from the six decisions (e.g., \"No ride without my helmet fastened, even to move the machine across the yard.\").",
            minLength: 60,
          },
        ],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Sandbox chrome
// ---------------------------------------------------------------------------

interface EvidenceRecord extends StepEvidenceLike {
  updatedAt: string;
}

function StepSandbox({ source, step }: { source: string; step: StepOut }) {
  const [record, setRecord] = useState<EvidenceRecord | null>(null);
  const [mountKey, setMountKey] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const onEvidence = (draft: EvidenceDraft) => {
    setRecord({ ...draft, updatedAt: new Date().toISOString() });
  };

  return (
    <section id={step.id} aria-label={`${step.renderer} sandbox`} className="scroll-mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-pine-950 px-3 py-1 font-mono text-xs text-paper-0">
            {step.renderer}
          </span>
          <span className="font-mono text-xs text-ink-500">{source}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs ${
              record?.complete
                ? "border-pine-700 bg-pine-700 text-paper-0"
                : "border-line-200 bg-paper-0 text-ink-500"
            }`}
          >
            {record?.complete ? "complete" : record ? "in progress" : "no evidence"}
          </span>
          <Button
            variant="ghost"
            size="s"
            onClick={() => {
              setRecord(null);
              setMountKey((k) => k + 1);
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <Card padding="l">
        <ActivityHost
          key={mountKey}
          step={step}
          evidence={record}
          onEvidence={onEvidence}
        />
      </Card>

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setInspectorOpen((o) => !o)}
          className="font-mono text-xs text-pine-700 underline"
        >
          {inspectorOpen ? "hide evidence" : "inspect evidence"}
        </button>
        {inspectorOpen && (
          <pre className="mt-2 overflow-x-auto rounded-sm border border-line-200 bg-pine-950 p-4 font-mono text-xs leading-relaxed text-paper-0">
            {record ? JSON.stringify(record, null, 2) : "// no evidence emitted yet"}
          </pre>
        )}
      </div>
    </section>
  );
}

function ComponentsGallery() {
  const [interstitial, setInterstitial] = useState(false);
  const [railCurrent, setRailCurrent] = useState("m1-l1-s2");
  const railSteps = useMemo(
    () =>
      STEPS.slice(0, 4).map(({ step }) => ({
        id: step.id,
        title: step.title,
        section: step.section,
      })),
    [],
  );
  return (
    <section id="components" aria-label="Learning components gallery" className="scroll-mt-6">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="rounded-full bg-pine-950 px-3 py-1 font-mono text-xs text-paper-0">
          components
        </span>
        <span className="font-mono text-xs text-ink-500">
          StepRail · SectionInterstitial · ModuleCard · LessonRow · XpChip
        </span>
      </div>
      <Card padding="l" className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="ts-eyebrow">StepRail</p>
            <div className="mt-3">
              <StepRail
                steps={railSteps}
                currentId={railCurrent}
                completedIds={new Set(["m1-l1-s1"])}
                onSelect={setRailCurrent}
              />
            </div>
          </div>
          <div className="min-w-0 flex flex-col gap-8">
            <div>
              <p className="ts-eyebrow">XpChip + SectionInterstitial</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <XpChip xp={25} label="Step complete" />
                <XpChip xp={75} label="Checkpoint first try" delay={120} />
                <Button variant="secondary" size="s" onClick={() => setInterstitial(true)}>
                  Play section interstitial
                </Button>
              </div>
            </div>
            <div>
              <p className="ts-eyebrow">LessonRow</p>
              <div className="mt-3 flex flex-col gap-2">
                <LessonRow order={1} title="Why Riders Crash" minutes={15} status="done" to="#" />
                <LessonRow order={2} title="Judgment Under Pressure" minutes={15} status="active" to="#" />
                <LessonRow order={3} title="Your Risk Profile" minutes={15} status="todo" />
                <LessonRow order={4} title="Fit Is a Hard Rule" minutes={10} status="locked" />
              </div>
            </div>
          </div>
        </div>
        <div>
          <p className="ts-eyebrow">ModuleCard</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ModuleCard
              order={1}
              title="The Rider's Mindset"
              tagline="Most crashes are decided before the wheels turn."
              minutes={45}
              heroSlot="hero-m1-mindset"
              percent={100}
              complete
              badgeName="Clear Eyes"
            />
            <ModuleCard
              order={2}
              title="Know Your Machine"
              tagline="You can't judge what you can't name."
              minutes={55}
              heroSlot="hero-m2-machine"
              percent={40}
              to="#"
            />
            <ModuleCard
              order={3}
              title="Gear Up"
              tagline="Gear is the only safety decision that keeps working after a mistake."
              minutes={40}
              heroSlot="hero-m3-gear"
              percent={0}
              locked
              unlockHint="Finish Know Your Machine first"
            />
          </div>
        </div>
      </Card>
      {interstitial && (
        <SectionInterstitial section="try" onDone={() => setInterstitial(false)} />
      )}
    </section>
  );
}

export default function RenderersSandbox() {
  if (!import.meta.env.DEV) return null;
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-10 px-6 py-10 lg:px-12">
      <header>
        <div className="flex items-center gap-3">
          <BlazeMarker state="active" size="l" />
          <h1 className="font-display text-2xl font-bold text-pine-950">Renderer sandbox</h1>
          <span className="rounded-full border border-clay-500 px-2.5 py-0.5 font-mono text-xs text-clay-500">
            dev only
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          Every Wave 1 activity renderer mounted through ActivityHost with verbatim curriculum
          payloads. Evidence stays in local state — no API needed.
        </p>
        <nav aria-label="Jump to renderer" className="mt-4 flex flex-wrap gap-2">
          {STEPS.map(({ step }) => (
            <a
              key={step.id}
              href={`#${step.id}`}
              className="rounded-full border border-line-200 bg-paper-0 px-3 py-1 font-mono text-xs text-pine-700 hover:border-pine-300"
            >
              {step.renderer}
            </a>
          ))}
          <a
            href="#components"
            className="rounded-full border border-line-200 bg-paper-0 px-3 py-1 font-mono text-xs text-pine-700 hover:border-pine-300"
          >
            components
          </a>
        </nav>
      </header>

      {STEPS.map(({ source, step }) => (
        <StepSandbox key={step.id} source={source} step={step} />
      ))}

      <ComponentsGallery />
    </div>
  );
}
