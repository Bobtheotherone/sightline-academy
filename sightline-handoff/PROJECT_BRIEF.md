# PROJECT BRIEF — Sightline Safety Academy (General-Audience Release)

## Origin

Sightline Safety Academy began as a one-week summer-camp companion app teaching ATV safety to
kids, built under time pressure with only one day of curriculum truly fleshed out.
It proved the concept: interactive missions, a field journal, and a safety-first
tutor genuinely engaged learners. This project is the full realization: a complete,
public, self-serve online module for a **general audience** (teens with guardian
awareness through adults), rebuilt from scratch to a professional standard.

## What we are building

**Sightline Safety Academy** — a web-based interactive learning platform for ATV (all-terrain
vehicle / quad) safety and adjacent road safety, with:

1. **Open, worldwide access.** Anyone can create an account with an email and
   password and complete the course at their own pace. No class codes, no
   instructor gatekeeping for the core path (a light instructor view exists but is
   secondary — see SPEC-011).
2. **A six-module curriculum** (`CURRICULUM/`) that is genuinely rewarding to
   complete: varied interactive activities (sorting, hotspot exploration,
   branching scenarios, matching, prediction-reveals, structured reflection),
   a persistent **Field Journal** of artifacts the learner builds as they go,
   knowledge checks with rich per-option feedback, a capstone project, a final
   assessment, and a completion certificate.
3. **A curriculum-aware AI tutor ("Ranger")** powered by retrieval-augmented
   generation over a ChromaDB vector store built from `RAG_CORPUS/`. Ranger
   answers **any** ATV-safety or road-safety question — not only questions about
   the course — but always answers *in a curriculum-aware manner*: grounded in the
   corpus when relevant, citing course modules, aware of where the learner is in
   the course, and honest when it is speaking from general knowledge rather than
   course material. See SPEC-008 and ADR-005.
4. **A finished, distinctive visual product.** The bar is: someone lands on any
   page — not just the login screen — and believes a design team shipped this.
   Design direction is fully specified in `DESIGN/`.

## Audience & tone

- Primary: adults and older teens who ride or are about to ride ATVs recreationally
  or for work (farm, hunting, trail riding), plus parents/supervisors of young riders.
- Tone: capable, direct, outdoors-literate. Respectful of the reader's intelligence.
  Never childish, never preachy, never corporate-sterile. Safety framing is
  "competence and judgment," not fear.
- Reading level: ~8th–10th grade for learner-facing copy.

## Educational stance (important)

Sightline Safety Academy is an **awareness and judgment** course. It teaches recognition,
preparation, decision-making, and widely established safety practices. It is not a
substitute for hands-on, in-person training, and the certificate explicitly says
so (see SPEC-009 §Certificate). Content is written at the level of established,
uncontroversial safety practice (helmet use, pre-ride inspection, no passengers on
single-rider machines, no paved-road riding, no impaired riding, rider-fit sizing,
supervision of young riders, hands-on course encouragement). Where exact
jurisdiction-specific rules vary (age laws, road-crossing statutes), the course
teaches the *category* of rule and directs learners to their local authority.

## Product pillars (rank-ordered; when in tension, higher wins)

1. **Learner safety integrity** — the product never rewards or glamorizes risk.
2. **Finished-product feel** — every visible surface is polished and coherent.
3. **Rewarding progression** — completing the course should feel like an
   accomplishment, with visible momentum (XP, badges, journal, certificate).
4. **Tutor usefulness** — Ranger should be the best ATV-safety answerer the
   learner has ever used: fast, warm, specific, honest about grounding.
5. **Operational simplicity** — one `docker compose up`, SQLite + Chroma volumes,
   no cloud lock-in.

## Success criteria (the professor's bar)

- A first-time visitor can register, complete Module 1 end-to-end, ask Ranger three
  questions (one on-curriculum, one general ATV question, one off-topic), and
  receive excellent experiences at every step — with zero dead ends, zero
  placeholder text, zero unstyled states.
- All six modules are fully playable with the provided content; nothing is stubbed.
- The visual crawl gallery (every route × key states) reads as one coherent,
  designed product.
- The stack boots from clean checkout with documented commands in under 10 minutes.

## Naming

- Product: **Sightline Safety Academy**
- Tutor persona: **Ranger**
- Course: **Sightline Safety Academy ATV & Road Safety Course** (six modules, listed in CURRICULUM-000)
- Learner-facing progress artifact: **Field Journal**
- Capstone: **The Ride Plan** (Module 6)
