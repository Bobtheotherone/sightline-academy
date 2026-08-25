# Sightline Safety Academy — Visual Asset Program

> **What this file is.** A complete, generation-ready registry of every visual
> asset the product should have, plus the pipeline and agentic procedure that
> turns each registry entry into a shipped file. It is a *work specification*,
> not a governance process — it exists to be consumed and executed, and it
> produces artifacts, not approvals. (NON_GOALS §1 forbids process-about-process;
> this is a parts list with build instructions, in the same spirit as
> `content/curriculum/` being data rather than docs.)
>
> **Authority.** `DESIGN-001` is the style law, `DESIGN-002 §Illustration slots`
> owns slot naming, `DESIGN-006` is the acceptance rubric, and
> `web/src/assets/manifest.json` is the runtime source of truth. Where this file
> and those disagree, they win and this file gets corrected.

---

## Table of contents

| Part | Section |
| --- | --- |
| 0 | [How to use this document](#part-0--how-to-use-this-document) |
| 1 | [The proven pipeline](#part-1--the-proven-pipeline) |
| 2 | [The agentic generation procedure](#part-2--the-agentic-generation-procedure) |
| 3 | [The asset spec schema](#part-3--the-asset-spec-schema) |
| 4 | [Style law and prompt construction](#part-4--style-law-and-prompt-construction) |
| 5 | [Acceptance rubric](#part-5--acceptance-rubric) |
| 6 | [Medium decision: SVG vs diffusion vs hybrid](#part-6--medium-decision-svg-vs-diffusion-vs-hybrid) |
| 7 | [THE REGISTRY](#part-7--the-registry) |
| 8 | [Execution plan](#part-8--execution-plan) |
| 9 | [Integration](#part-9--integration) |
| 10 | [Verification](#part-10--verification) |
| A–F | [Appendices](#appendix-a--measured-settings-reference) — measured settings, reference prompt, failure catalogue, coordinate contracts, naming, batch contract |

---

## Part 0 — How to use this document

### 0.1 The three audiences

1. **An orchestrating agent** picks a batch from [Part 7](#part-7--the-registry),
   reads the shared *set spec* for that batch, and runs the loop in
   [Part 2](#part-2--the-agentic-generation-procedure). It never invents an
   asset that is not registered here; if it needs one, it adds a registry entry
   first, in the same commit.
2. **A generating agent** receives exactly one registry entry plus its set spec
   and returns one accepted file plus a provenance record. It does not choose
   subjects, palettes, or sizes — those are given.
3. **A human reviewer** reads the registry to know what exists, what is
   outstanding, and why any asset looks the way it does.

### 0.2 The rule that makes this work

> **Every asset is generated from a written spec, and every spec is written
> before generation.** No asset is kept because it "looked good"; it is kept
> because it satisfies the acceptance clause its own entry declares.

This is the same discipline the curriculum uses: content is authored first,
then loaded faithfully. Here, the *image brief* is authored first, then rendered
faithfully. It is what makes a 250-asset set look like one product instead of
250 lucky rolls.

### 0.3 Status vocabulary

| Status | Meaning |
| --- | --- |
| `shipped` | File exists, wired into `manifest.json`, passed acceptance |
| `ready` | Spec complete, not yet generated |
| `draft` | Spec exists but has an open question marked **OPEN:** |
| `blocked` | Needs a decision or upstream content change |
| `lab-owned` | Deliberately drawn in-renderer, not a file |
| `deferred` | Registered so it is not forgotten; explicitly out of current scope |

### 0.4 Scale and the honest ceiling

The registry below fully specifies **~260 assets** across six tiers. A mature
learning product of this size can justify 1000+ once you count per-option icons,
localized variants, seasonal hero swaps, and A/B alternates — [§8.5](#85-how-this-scales-past-1000)
shows exactly which axes multiply and which should never be multiplied.
Everything registered here is deliberately *non-speculative*: each entry names
the file, component, or curriculum block that will consume it.

---

## Part 1 — The proven pipeline

This is not a proposal. Every number below was measured on this machine during
the smoke test that produced `hero-atv-rider`.

### 1.1 Hardware and environment

| Item | Value |
| --- | --- |
| GPU | NVIDIA GeForce RTX 5090 Laptop, **23.9 GB VRAM**, Blackwell `sm_120` |
| Driver | 581.80 |
| Torch | `2.11.0+cu128` — **cu128 or newer is mandatory**; cu124 wheels do not support `sm_120` |
| Env | `D:\imagegen\.venv` (Python 3.12, uv-managed) — deliberately separate from `server/.venv`, which pins **CPU** torch for the Docker image |
| Model cache | `HF_HOME=D:\imagegen\hf` — keep off `C:` (only ~21 GB free there) |
| Cost | **$0 per image, unlimited.** No API credits consumed. |

### 1.2 Models

| Model | Role | Gating |
| --- | --- | --- |
| `stabilityai/stable-diffusion-xl-base-1.0` | Base denoiser, 0 → 0.8 | Ungated |
| `stabilityai/stable-diffusion-xl-refiner-1.0` | Expert refiner, 0.8 → 1.0 | Ungated |
| `black-forest-labs/FLUX.1-dev` / `-schnell` | **Not used** | Gated — returns `GatedRepoError 401` without a HuggingFace token |

If a HF token is ever added, FLUX.1-dev is worth re-evaluating for the
photographic tiers (E-series) only; SDXL's flat-vector behaviour with the
prompt discipline in [Part 4](#part-4--style-law-and-prompt-construction) is
already strong and the whole registry is tuned to it.

### 1.3 Measured generation settings

The **house settings** — use these unless an entry overrides them:

```
steps            90              (SDXL saturates ~50–90; we are not rushed)
guidance_scale   7.5
denoising_split  0.8             (base 0→0.8, refiner 0.8→1.0)
dtype            float16, variant="fp16"
scheduler        pipeline default
resolution       1216 × 832      (landscape) / 1024 × 1024 (square) / 832 × 1216 (portrait)
prompt encoding  compel, truncate_long_prompts=False
```

Measured cost per image at those settings: **~29–30 s**, **14.6 GB peak VRAM**
of 23.9 GB. Compute saturates during denoising; VRAM does not. That headroom is
real capacity — see [§8.4](#84-parallelism-and-throughput).

> **Do not raise resolution to "use more GPU."** SDXL is trained at ~1024²
> and drifts into duplicated subjects (extra wheels, extra limbs) above its
> native buckets. Quality comes from steps, prompt discipline, and seed
> selection. Use the spare VRAM for *parallelism*, not for size.

### 1.4 Scripts

All live in `D:\imagegen\`. Each is single-purpose and re-runnable.

| Script | Purpose |
| --- | --- |
| `gen3.py` | **The generator.** SDXL base+refiner ensemble with compel long-prompt encoding. `--seeds a b c --tag NAME`. Writes `out/<tag>-s<seed>.png` plus a sidecar `.json` recording seed/steps/cfg/size/prompt/negative. |
| `sheet.py` | **Contact sheet.** `--glob "atv-v3-*.png" --cols 2` → one labelled grid image for batch triage. |
| `refine.py` | **img2img refinement.** Keeps composition, fixes detail. Sweeps `--strengths 0.25 0.35 0.45` so the fixed-vs-drifted trade-off is a visual choice. |
| `locate.py` | **Forensics.** Measures the mount border from corner colour and lists saturated connected components with bboxes and areas. Run this *before* retouching anything. |
| `finish2.py` | **Finishing.** Measured crop → surgical inpaint → 4× Lanczos → light unsharp. Deliberately conservative (see [§2.6](#26-the-retouching-discipline)). |
| `export_final.py` | **Delivery.** Supersampled downsample to each width, PNG+WebP+AVIF, plus a paste-ready `<picture>` block with real dimensions and alt text. |
| `zoom.py` | **Detail check.** Magnified crops of the regions most likely to betray the asset (hands, feet, joins, flat areas). |

The sidecar `.json` written by `gen3.py` is the provenance record — it is what
makes any asset reproducible months later. **Never ship an asset whose sidecar
is missing.**

### 1.5 Delivery format ladder

Measured on the 1137×730 master (`hero-atv-rider`):

| Width | PNG | WebP q92 | AVIF q72 |
| --- | --- | --- | --- |
| 1920w | 2031 KB | 183 KB | **102 KB** |
| 1600w | 1570 KB | 144 KB | **81 KB** |
| 1200w | 998 KB | 112 KB | **60 KB** |
| 800w | 488 KB | 68 KB | **38 KB** |
| 400w | 139 KB | 28 KB | **16 KB** |

AVIF is ~55–60 % of WebP and ~5 % of PNG at visually identical quality for flat
art. Ship all three: AVIF first, WebP second, PNG as the universal fallback.

> **R9.2 interaction.** The initial-JS budget is 350 KB gzipped and the app
> currently sits at 126–144 KB. Images are not in that budget, but they *are*
> in the LCP path for `/` and `/course/:moduleId`. Any above-the-fold hero must
> ship AVIF ≤ 120 KB at 1920w and carry explicit `width`/`height`.

---

## Part 2 — The agentic generation procedure

The loop below is what actually produced a usable asset. Its shape matters more
than any single prompt: **generate a spread, triage on a sheet, inspect the
winner at full resolution, fix the named defect, re-verify.**

### 2.1 The loop

```
  ┌─ 1 READ SPEC ────────────────────────────────────────────────┐
  │   registry entry + set spec + style law. Do not proceed       │
  │   while any field is unresolved or marked OPEN:.              │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
  ┌─ 2 COMPOSE PROMPT ───────────────────────────────────────────┐
  │   Part 4 ordering. Verify token count. Never hand-truncate.   │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
  ┌─ 3 GENERATE SPREAD ──────────────────────────────────────────┐
  │   6–8 seeds minimum. One seed is not a sample, it is a bet.   │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
  ┌─ 4 TRIAGE ON A CONTACT SHEET ────────────────────────────────┐
  │   sheet.py. Reject on structural failure only at this stage:  │
  │   wrong count, missing body part, wrong medium, baked border. │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
  ┌─ 5 INSPECT THE WINNER AT 100 % ──────────────────────────────┐
  │   Full-resolution read + zoom.py on the betrayal regions.     │
  │   A thumbnail has never once caught a hand defect.            │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
        defect found? ──yes──▶ 6 CLASSIFY (§2.4) ──▶ back to 2 / 7
                │ no
                ▼
  ┌─ 7 FINISH ───────────────────────────────────────────────────┐
  │   locate.py → measured crop → surgical retouch → supersample  │
  │   → light unsharp. Do-no-harm (§2.6).                         │
  └───────────────────────────┬──────────────────────────────────┘
                              ▼
  ┌─ 8 EXPORT + VERIFY ──────────────────────────────────────────┐
  │   export_final.py, then re-open the delivered file and read   │
  │   it against the entry's acceptance clause. Record provenance.│
  └──────────────────────────────────────────────────────────────┘
```

### 2.2 Non-negotiables

- **The agent must open and look at the image it produced.** Screenshots nobody
  views are QA theatre — the same principle QA-001 applies to the route crawl.
  An asset marked accepted without a full-resolution read is not accepted.
- **Reproduce a defect before fixing it.** Every claimed fix needs a before and
  an after that the agent actually observed.
- **One entry, one deliverable.** A generating agent does not opportunistically
  "also fix" a neighbouring asset.
- **Provenance or it did not happen.** Seed, steps, cfg, size, prompt, negative,
  script version — all in the sidecar.

### 2.3 Roles for a batch run

| Role | Owns | Returns |
| --- | --- | --- |
| **Set lead** | Locks the set spec: palette, canvas, camera, lighting, subject grammar. Renders 2–3 *reference* assets first and gets them accepted. | The frozen set spec + reference files |
| **Generator** | One entry at a time, against the frozen set spec | Accepted file + sidecar |
| **Set critic** | Views the whole batch as one contact sheet after generation | Coherence findings (see [§5.3](#53-set-level-coherence)) |
| **Integrator** | `manifest.json`, `SlotArt` wiring, curriculum `figure` blocks, alt text | A green `tsc`/`eslint`/build and a crawl pass |

The set lead's reference assets are the single highest-leverage step. **Freeze
the look on three images before generating forty.**

### 2.4 Defect classification

When step 5 finds a problem, classify it before acting — the class determines
the fix, and using the wrong tool is how the smoke test briefly destroyed a good
image.

| Class | Symptom | Correct response |
| --- | --- | --- |
| **D1 Structural** | Wrong wheel/limb count, missing body part, subject merged into background | Reject the seed. Do **not** retouch. Strengthen positives *and* negatives, regenerate. |
| **D2 Medium** | Painterly when the spec says flat vector; airbrush, brush texture, speckle spray | Prompt failure. Check the token budget first ([§4.3](#43-the-77-token-trap)) — the style clause may never have reached the model. |
| **D3 Semantic** | Correct drawing of the wrong thing (bare arms when the spec says gloves) | Promote the missed noun to its own clause near the front; add its inverse to negatives. |
| **D4 Compositional** | Baked-in poster border, subject cropped, dead space | Fixable in finishing if the art is intact; otherwise reject the seed. |
| **D5 Blemish** | Isolated speck, stray saturated pixel, small artifact in a flat field | Surgical inpaint of **one** measured window. Never a blanket sweep. |
| **D6 Palette** | Off-brand colour, two elements sharing a colour that must read apart | Re-spec the palette so the separation is *structural* — see [§4.6](#46-when-the-model-refuses). |

### 2.5 What the smoke test actually taught

These are recorded because each one cost a full round, and each will recur.

1. **CLIP truncates at 77 tokens, silently.** In the v2 run, everything from
   `"flat colour fills only"` onward was discarded — every style and colour
   instruction. The images were blamed on seeds for a full round. `compel` fixed
   it by chunking into concatenated embedding windows (231 tokens / 3 windows).
   **Always log the encoded token count.**
2. **Front-load the style anchor.** Even truncated, `"flat vector illustration"`
   as the first three tokens carried the medium. Word order is priority order.
3. **Design the subject to dodge the model's weaknesses.** A **helmeted** rider
   removes faces — the single largest source of generative slop — for free. Prefer
   gloves over bare hands, boots over bare feet, side profiles over three-quarter
   views for machines.
4. **Do not over-retouch.** A "professional" finishing pass that inpainted 400
   connected components smeared white blobs across the fender and shock spring,
   and a bilateral filter softened exactly the hard edges the style depends on.
   The rewrite removed **one** component and skipped denoising entirely, and was
   dramatically better. *Do no harm* outranks *do something*.
5. **Measure, do not infer, crop boxes.** A keyline-based crop cut into the
   helmet and wheels; measuring the mount from the corner pixel colour gave the
   correct inset (top 48, bottom 46, left 38, right 33).
6. **Anti-aliasing is not an artifact.** A speck detector that flags 30–400
   components is detecting pine branches and mountain ridges. Cross-reference
   candidate coordinates against the *known* artifact location before inpainting.
7. **Supersample.** Upscale 4× then downsample to each delivery width; every
   served size resolves from more information than it needs.
8. **Some instructions never land.** Jersey-vs-pants colour separation failed
   across every seed of every round. That is a model limitation, not a prompt
   bug — [§4.6](#46-when-the-model-refuses) says what to do instead.

### 2.6 The retouching discipline

> **Rule: the retoucher's first obligation is to do no harm.**

| Allowed | Forbidden |
| --- | --- |
| Crop from a measured boundary | Crop from an inferred edge |
| Inpaint a named, located window | Blanket component sweeps |
| Lanczos resample | Denoise / bilateral / median on flat art |
| Unsharp ≤ 0.4 amount, ≤ 1.5 px radius | Aggressive sharpening that halos edges |
| Palette *check* | Palette *surgery* on a finished plate |

If the finished file is not visibly better than its input at 100 %, the
finishing pass has failed and must be reverted.

---

## Part 3 — The asset spec schema

Every registry entry uses these fields. A generating agent that cannot fill
`Acceptance` from the entry alone should refuse the job and ask for the spec to
be completed.

| Field | Required | Meaning |
| --- | --- | --- |
| **ID** | ✅ | `TIER-NNN`, stable forever. Referenced by commits and BUILDLOG lines. |
| **Slot / filename** | ✅ | The `manifest.json` slot name, or the exact output path for non-slot assets |
| **Status** | ✅ | [§0.3](#03-status-vocabulary) vocabulary |
| **Medium** | ✅ | `svg-authored`, `diffusion`, `hybrid`, `render-html`, or `lab-owned` ([Part 6](#part-6--medium-decision-svg-vs-diffusion-vs-hybrid)) |
| **Canvas** | ✅ | Intrinsic size and aspect; plus `SlotArt ratio=` when it is a slot |
| **Consumed by** | ✅ | The component, route, or curriculum step id that renders it. **An asset with no consumer does not get built.** |
| **Description** | ✅ | What is depicted, composed, and emphasised — written so two people would draw the same picture |
| **Teaching intent** | ⬤ | For curriculum assets: the one idea the image must carry. Drives acceptance. |
| **Coordinate contract** | ⬤ | For hotspot bases: the exact x/y percentages features must sit under |
| **Palette** | ✅ | Which DESIGN-001 tokens, and which pairs must read apart |
| **Prompt** | ⬤ | For `diffusion`: the full positive, ordered per [§4.2](#42-prompt-ordering) |
| **Negatives** | ⬤ | Entry-specific additions to the [standard negative block](#44-the-standard-negative-block) |
| **Acceptance** | ✅ | Concrete, checkable clauses. "Looks good" is not acceptance. |
| **Alt text** | ✅ | Describes the *teaching content*, not the decoration (DESIGN-001) |
| **Provenance** | ⬤ | Filled after generation: seed, settings, script, date |

### 3.1 Set specs

Formulaic families (icon sets, badge sets) share a **set spec** so the per-asset
entry only carries what is unique. A set spec fixes: canvas, palette, stroke
weight, camera/angle, lighting, background treatment, silhouette weight, and the
shared prompt scaffold. Individual entries then supply one subject line each.

This is what keeps 26 sort-item icons looking like one set instead of 26
unrelated drawings.

---

## Part 4 — Style law and prompt construction

### 4.1 The style law (from DESIGN-001, binding)

- **Direction:** "Field Guide Modern" — a beautifully produced modern field guide
  crossed with a topographic map. Not SaaS, not kids' app, not the three stock AI
  looks (warm-cream + serif + terracotta; black + acid accent; broadsheet hairlines).
- **Signature devices:** the **contour motif** (1 px topographic lines at ~6 %
  ink opacity) and the **trail-blaze marker** (rounded diamond). Used quietly and
  consistently; the boldness budget is spent here and nowhere else.
- **Illustration style:** flat vector, **4–6 brand colours**, visible 1.5 px
  `pine-950` line work, `paper-0` backgrounds — "field guide plate" energy.
  *Exception:* a plate that must match an existing complex scene may carry more.
  `scene-trail-hazards` itself uses 10, so its detail insets match it rather than
  the count — **clause C4 (one object drawn one way) outranks the colour
  budget**, because a learner noticing two different machines is a worse failure
  than a learner never counting hexes. Take the exception only to match a
  neighbour, never to add richness.
- **No photography.** Coherence beats stock photos. This applies to diffusion
  output too: it must read as an illustrated plate, never as a photograph.
- **Every illustration gets alt text describing its teaching content.**

> **Repalette 2026-08-15 — "Fireweed Aurora" (owner directive).** Every hex in
> this document was rewritten in place: pine is now spruce-on-navy (`pine-950`
> = #0D1E2E night navy), `clay-*` is fireweed magenta (#B5446E), `sky-600` is
> aurora green (#1E8A6E). Token NAMES are historical and unchanged. All 171
> SVG assets were recolored by scripted hex swap in the same change; the SDXL
> raster heroes still carry the old palette and are being replaced by the GPT
> generation program (`artgen/gpt-pack/`).

**Palette tokens** (assets are the token layer, so literal hex is correct in
SVG and prompt text — components remain hex-free per ADR-008):

| Token | Hex | Illustration role |
| --- | --- | --- |
| `--ts-pine-950` | `#0D1E2E` | Line work, deepest masses, dark panels |
| `--ts-pine-700` | `#2F6B52` | Primary brand fill |
| `--ts-pine-300` | `#ABCDB8` | Soft fills, mid-ground |
| `--ts-moss-100` | `#ECF3EF` | Ground / app background |
| `--ts-paper-0` | `#F9FCFA` | Plate background |
| `--ts-clay-500` | `#B5446E` | Accent — blaze, focal point. **Sparingly.** |
| `--ts-sky-600` | `#1E8A6E` | Water, info, Ranger identity |
| `--ts-sun-400` | `#DBA12E` | Caution, badge gold |
| `--ts-danger-600` | `#A93226` | Risk semantics |
| `--ts-ink-500` | `#46555A` | Secondary line, shadow |
| `--ts-line-200` | `#D6DFDA` | Hairline |

**Accent discipline:** `clay-500` marks *the one thing the eye should land on*.
An image with three clay elements has no focal point. Most plates use it once.

### 4.2 Prompt ordering

Order is priority. Compose in exactly these seven bands:

```
1  MEDIUM ANCHOR      "flat vector illustration"            ← always first
2  CAMERA / COMP      "clean side profile view"
3  PRIMARY SUBJECT    "one adult rider seated upright on a four-wheeled quad ATV"
4  SUBJECT SPECIFICS  helmet / gloves / boots / posture     ← each its own clause
5  SECONDARY SUBJECT  the machine, its colour and tires
6  ENVIRONMENT        "level dirt trail, a few large flat pine silhouettes"
7  STYLE + PALETTE    fills, edges, outlines, named colours, plate framing
```

Band 4 is where semantic defects (D3) are prevented. Anything that *must* appear
gets its own comma-delimited clause; anything buried inside another clause is
optional to the model.

### 4.3 The 77-token trap

CLIP's text encoder truncates at 77 tokens **and does not error**. A 168-token
prompt silently becomes its first ~77 tokens.

- **Always** encode with `compel` (`truncate_long_prompts=False`), which chunks
  into 77-token windows and concatenates the embeddings.
- **Always** log the resulting token count. `gen3.py` prints
  `compel embeddings: N tokens (N/77 windows) — nothing truncated`.
- Negatives truncate too, and this is easier to miss because a dropped negative
  produces a *plausible* image with a defect you were trying to prevent.
- SDXL has two text encoders; the refiner exposes only `text_encoder_2` and needs
  its own `Compel` instance. Both are wired in `gen3.py`.

### 4.4 The standard negative block

Used by every `diffusion` entry unless overridden. Entry-specific negatives are
*appended*, never substituted.

```
COUNT / ANATOMY
  five wheels, extra wheel, three wheels, missing wheel, duplicate wheels,
  extra limbs, extra fingers, fused fingers, malformed hands, blob hand,
  deformed, disfigured, broken anatomy, twisted arm, floating parts,
  cropped torso, missing legs, missing lower body, half body, floating rider

GEAR (safety-critical — the product must never depict unsafe practice)
  bare arms, bare hands, exposed skin, no gloves, no helmet, unfastened strap,
  sandals, shorts, foot off the peg

MEDIUM
  photograph, photorealistic, 3d render, cgi, ray tracing,
  brush texture, brush strokes, painterly, airbrush, watercolour,
  shading gradient, gradient mesh, soft focus, blurry, glow

NOISE / ARTIFACT
  dust, dust cloud, dirt spray, particles, splatter, speckles, stipple, dots,
  noise, film grain, jpeg artifacts, low resolution, pixelated,
  rainbow speckle, colour noise, stray pixels, confetti

FRAME / CHROME
  watermark, signature, text, letters, logo, ui, frame, border, poster mount

COMPOSITION
  cluttered, busy background, messy lines, sketchy, unfinished,
  muddy colours, oversaturated, neon, lens flare, bokeh, vignette
```

> **The GEAR band is a safety requirement, not an aesthetic one.** Product
> pillar #1 is learner safety integrity — the product never depicts or rewards
> unsafe practice. An asset showing a rider without a helmet is a **P1 defect**
> regardless of how good it looks, unless the entry explicitly specifies a
> negative example (see [§5.4](#54-the-safety-clause)).

### 4.5 Reusable prompt fragments

Copy these verbatim; they are load-bearing and already tuned.

| Fragment | Text |
| --- | --- |
| `STYLE_FLAT` | `flat colour fills, hard crisp vector edges, thick dark outlines, geometric simplified shapes` |
| `STYLE_PLATE` | `modern editorial field guide plate, adobe illustrator vector artwork, screen print poster, generous clean negative space, calm balanced composition` |
| `PALETTE_CORE` | `limited palette of deep spruce green, night navy, fireweed magenta, sage mint, glacier white, charcoal` |
| `GEAR_FULL` | `white full-face motocross helmet with a dark tinted visor, long-sleeve riding jersey, riding pants, black gloves closed around the grips, black over-the-ankle boots planted on the footpegs` |
| `MACHINE_SIDE` | `four-wheeled quad ATV, side profile, four chunky black knobby tires, front and rear cargo racks` |
| `ENV_TRAIL` | `level dirt trail, a few large flat pine tree silhouettes behind, simple layered hills` |

### 4.6 When the model refuses

Some instructions never land no matter how they are phrased. Jersey-vs-pants
colour separation failed across three rounds and every seed.

**Do not keep re-rolling.** Choose one:

1. **Re-spec so the requirement disappears.** A one-piece riding suit is real,
   coherent, and needs no separation. The registry entry changes; the image
   ships.
2. **Separate structurally instead of chromatically.** Put a belt, a jacket hem,
   or a contrasting outline between the two regions so the silhouette reads even
   in one colour.
3. **Move the asset to `svg-authored`.** If the requirement is genuinely
   load-bearing — a diagram where two parts *must* be told apart — hand-authored
   SVG gives absolute control and is the correct medium ([Part 6](#part-6--medium-decision-svg-vs-diffusion-vs-hybrid)).

Record the refusal in the entry's **Provenance** so the next agent does not
re-litigate it.

---

## Part 5 — Acceptance rubric

An asset is accepted when **every** clause below passes *and* its own entry's
`Acceptance` field passes. Checked at 100 % zoom, not on a thumbnail.

### 5.1 Universal clauses (all assets)

| # | Clause | Fail = |
| --- | --- | --- |
| U1 | Reads as the declared **medium** (flat plate, not photo/painting) | P1 |
| U2 | Palette is DESIGN-001 tokens only; **no** stray library greys/blues, no pure `#000`/`#fff` surfaces | P1 |
| U3 | No text, letterforms, watermark, or signature anywhere | P1 |
| U4 | No baked-in frame, border, or poster mount unless the entry asks for one | P1 |
| U5 | No stray specks, colour noise, or artifacts in flat fields | P2 |
| U6 | Line weight consistent with the set spec | P2 |
| U7 | `clay-500` used once, as the focal accent | P2 |
| U8 | Alt text present, describes teaching content, not decoration | P1 |
| U9 | Sidecar provenance recorded | P1 |
| U10 | Legible at its smallest intended render size | P2 |

### 5.2 Subject clauses (assets depicting riders or machines)

| # | Clause | Fail = |
| --- | --- | --- |
| S1 | Machine has **exactly four wheels**, correctly placed | P1 |
| S2 | Rider wears helmet, gloves, long sleeves, long pants, over-ankle boots | P1 |
| S3 | Every limb present, attached, plausibly jointed; hands read as gloved hands | P1 |
| S4 | Feet on footpegs where the pose implies it | P2 |
| S5 | Rider silhouette separable from the machine | P2 |
| S6 | Machine anatomy plausible: bars, seat, racks, suspension in sane relationships | P2 |

### 5.3 Set-level coherence

Run once per batch, on a contact sheet of the whole set:

| # | Clause |
| --- | --- |
| C1 | Viewed together, the set reads as one product by one hand |
| C2 | Stroke weight and corner radius consistent across the set |
| C3 | Backgrounds treated identically (same plate ground, same edge quiet) |
| C4 | No two assets in a set disagree on how the same object is drawn (an ATV drawn two ways is a set failure even if both are good) |
| C5 | Accent placement rhythm consistent — the eye lands in the same *kind* of place |

C4 is the one that most often fails silently. The set lead's reference assets
exist to prevent it.

### 5.4 The safety clause

> Product pillar #1: **the product never rewards or glamorizes risk.**

| # | Clause | Fail = |
| --- | --- | --- |
| SF1 | No airborne machine, wheelie, jump, drift, or stunt posture | P1 |
| SF2 | No rider without complete gear, in any asset, unless it is an entry explicitly registered as a negative example | P1 |
| SF3 | No passenger on a single-rider machine unless registered as a negative example | P1 |
| SF4 | Negative examples are visually marked as such (`danger-600` accent, ✗ treatment) and never used decoratively | P1 |
| SF5 | No depiction of riding on pavement as normal practice (Module 6's entire thesis) | P1 |
| SF6 | Speed is never the subject; motion lines and dust plumes glamorize — omit | P2 |

This rubric applies to **every tier**, including marketing. A hero image that
sells excitement by showing an unhelmeted rider mid-jump would contradict the
curriculum it is advertising.

#### 5.4.1 The calmer-than-the-prose test

For any asset depicting an incident or a hazard, the operative check is not
"is this acceptable" but:

> **Is the picture calmer than the words it sits beside?**

`scenario-silent-radio` illustrates prose that says the rider is *"holding their
wrist, pale."* The plate shows a seated figure, helmet on, machine small and
muted down-trail — it reads closer to a trailside stop than a crash. That is the
correct direction. **The reverse — art more vivid than the text — is an
automatic stop**, because the learner came to the picture through the sentence,
and a picture that escalates is inviting spectacle the curriculum refused.

This test also decides *placement*: the same lane declined to show
`hero-graduate` ("the summit reached") on the assessment **locked** state,
because promising a summit to someone with modules left is a reward the learner
has not earned. Ask what an asset *claims* about the viewer's state, not only
what it depicts.

---

## Part 6 — Medium decision: SVG vs diffusion vs hybrid

Choosing wrong is expensive. The decision is mechanical:

```
Does the asset carry exact coordinates, or must a specific element be
selectable / animated / recoloured at runtime?
        │
        ├── YES ──▶ svg-authored        (or lab-owned if fully interactive)
        │
        └── NO ──▶ Does the asset make a SPATIAL CLAIM?   ◀── see §6.5
                   (a junction, a comparison, a specific
                    staging, a this-not-that relationship)
                        │
                        ├── YES ──▶ svg-authored
                        │
                        └── NO ──▶ Does it need scene richness, depth, or
                                   atmosphere that would take 300+ hand-
                                   authored SVG paths?
                                        │
                                        ├── YES ──▶ diffusion
                                        │
                                        └── NO ──▶ svg-authored
```

### 6.5 The spatial-claim rule (learned the expensive way)

> **Diffusion renders beautiful generic scenes in the house style. It does not
> honour a specific spatial claim.**

C-050…C-055 were originally specced `diffusion`. Twenty-four candidates were
generated at house settings and **all six entries failed**, in a consistent and
instructive way:

| Asked for | Got (all 4 seeds) |
| --- | --- |
| A trail **junction**: gentle switchbacks left, steep shortcut right, off-camber traverse midway | One beautiful winding trail. No junction, no comparison, no traverse. |
| A machine **lying on its side**, rider seated on the ground holding a wrist | A rider riding normally, upright, in every seed |
| Riders **stopped on the near bank** of a fast opaque creek, two already across | A landscape. Two seeds put people in **boats**. |

The output was not bad art — several plates were genuinely lovely flat-vector
landscapes. It was **the wrong picture, drawn well**, which is the most
expensive failure mode because it survives a thumbnail triage.

**The rule:** if the asset's teaching value depends on *this thing being here
and that thing being there*, the medium is `svg-authored`. Scene richness is not
the deciding question — **spatial specificity is**. A single-subject hero (one
rider, one machine, side profile, "make it look good") is exactly what diffusion
excels at, which is why the `hero-atv-rider` smoke test succeeded and this batch
did not.

**Corollary for safety-critical assets:** anything governed by [§5.4](#54-the-safety-clause)
should default to `svg-authored` regardless. When the requirement is *what must
NOT appear* — no blood, no drama, helmet on — you need absolute control, not a
sampler.

The rejected landscapes are retained at `D:\imagegen\out\C-050..C-055-scenarios\`
as candidate backdrops for Tier E, where genericness is acceptable. They are not
registered assets and must not be pressed into curriculum use.

### 6.6 The dividing line, measured twice more

§6.5 was written off one batch. Two later batches confirmed it and sharpened it
into a rule you can apply *before* generating.

**Confirmation 1 — `hero-m6-roads`.** The brief: a trail *meeting* a paved road,
machine stopped at the boundary. Eight seeds across two prompt orderings failed
in both directions:

| Prompt led with | Result |
| --- | --- |
| the rider | A rider on a dirt trail. **No road at all**, four seeds. |
| the road | A convincing paved road. **The machine vanished**, four seeds. |

The model renders *nouns*, never the *relation between them*. Leading a token
band only changes which noun survives.

**Confirmation 2 — lesson cards.** Four cards were rendered and compared against
the shipped SVGs at 96 px, the size `LessonRow` actually uses. **Three of the
four became the same picture** — a white quad on a forest trail — because their
distinguishing content was structural (an inspection loop, a stop bar, a tipped
machine beside an intact helmet). The one that succeeded was the helmet: a
single object, no relation to render.

> **The line: diffusion draws SUBJECTS. Vector draws RELATIONS.**
>
> Ask what the asset would lose if you could only show one object with no
> arrangement. Lose nothing → `diffusion`. Lose the point → `svg-authored`.

This also explains why the two media split cleanly by *slot family* rather than
by taste:

| Family | Medium | Because |
| --- | --- | --- |
| Heroes | `diffusion` | A mood and a subject. No relation to state. |
| Keylist figures | `svg-authored` | The arrangement **is** the teaching. |
| Hotspot bases | `svg-authored` | Markers land on exact percentages ([§7.1 A-008](#a-008--scene-atv-anatomy--coordinate-contract)). |
| Lesson cards | `svg-authored` | Must differentiate 22 lessons at 96 px. |
| Sort / match icons | `svg-authored` | 40 px. Nothing survives but a silhouette. |
| Glyphs, badges | `svg-authored` | Tinted at runtime via `currentColor`. |

**A corollary about counts.** Diffusion cannot count either. "A helmet, gloves
and boots" produced a 30–40 item catalogue on every seed tried. Treat a stated
quantity exactly like a spatial claim: if the number carries meaning, author it.

### 6.1 The comparison

| Dimension | `svg-authored` | `diffusion` |
| --- | --- | --- |
| Coordinate precision | Exact | Approximate — cannot guarantee a feature at 22 %/72 % |
| File size | 1–6 KB | 16–102 KB (AVIF) |
| Scaling | Infinite | Fixed raster ladder |
| Runtime recolour | Yes (CSS vars) | No |
| Scene richness | Expensive | Cheap and excellent |
| Iteration cost | Minutes of authoring | ~30 s per spread |
| Consistency across a set | Total control | Requires a frozen set spec |
| Marginal cost | $0 | $0 |

### 6.2 Standing assignments

| Asset kind | Medium | Why |
| --- | --- | --- |
| Hotspot bases | `svg-authored` | Coordinate contract is absolute |
| Lab scenes | `lab-owned` | Interactive; the renderer draws them |
| Badges | `svg-authored` | Must read at 48 px; needs earned/unearned recolour |
| Icons (≤ 64 px) | `svg-authored` | Diffusion cannot hold a readable 48 px silhouette |
| Certificate seal | `svg-authored` | Print + grayscale + exact geometry |
| State art (404/locked) | `svg-authored` | Small, schematic, recoloured |
| Module heroes | **`hybrid`** | See [§6.3](#63-the-hybrid-tier) |
| Landing / marketing heroes | `diffusion` | Richness is the point |
| Scenario / story vignettes | `diffusion` | Atmosphere carries the narrative |
| Content figures (diagrams) | `svg-authored` | They are diagrams, not scenes |
| Content figures (situations) | `diffusion` | They are scenes, not diagrams |
| OG / social cards | `render-html` | Text composition — see [§6.4](#64-render-html) |

### 6.3 The hybrid tier

The six module heroes currently ship as hand-authored SVG plates and they are
correct and coherent. The smoke test proved diffusion can produce a *richer*
hero. Both are legitimate; the choice is a design decision, not a technical one.

**Recommendation:** keep the SVG plates as the in-app module heroes (they sit
next to diagrams and match them), and generate diffusion heroes as the
**wide/social/marketing** variants of the same subjects, where richness helps and
nothing needs to match a diagram. This is registered as tier B-01x and B-05x
respectively, so both exist and neither is wasted.

### 6.4 render-html

For anything with **text** — OG cards, certificate previews, email headers — do
not generate the text. Compose it in HTML with the real fonts and screenshot it
with Playwright at 2× DPI. This is already proven in-repo: the visual crawl
drives Playwright, and the certificate print sheet is an HTML composition.

Generated letterforms are the single most reliable "AI slop" tell, and the
standard negative block bans text for exactly this reason. Text arrives by
composition, never by generation.

---

## Part 7 — THE REGISTRY

### 7.0 Tier map and counts

| Tier | Name | Count | Status summary |
| --- | --- | --- | --- |
| **A** | Core slots (DESIGN-002) | 27 | 26 `shipped`, 1 `lab-owned` |
| **B** | Structural product art | 83 | `ready` |
| **C** | Curriculum figures | 95 | `ready` — the largest untapped value |
| **D** | UI, state, and moment art | 26 | `ready` |
| **E** | Marketing, social, and share | 24 | `ready` |
| **F** | Print, email, and platform | 12 | mixed `ready` / `deferred` |
| | **Total registered** | **267** | |

**ID scheme:** `TIER-NNN`. IDs are permanent. A retired asset keeps its ID and
gains status `deferred` with a reason; IDs are never reused.

---

### 7.1 Tier A — Core slots

These are the 27 slots declared in `DESIGN-002 §Illustration slots` and tracked
in `web/src/assets/manifest.json`. **26 are shipped** as hand-authored SVG
plates; one is deliberately lab-owned. They are registered here because their
*contracts* (especially coordinates) are binding on everything downstream, and
because several have registered upgrade paths in Tier B/E.

**Set spec — `SET-A-PLATE`**

| Property | Value |
| --- | --- |
| Medium | `svg-authored` |
| Ground | `paper-0` `#F9FCFA`, quiet edges so any `object-contain` ratio letterboxes invisibly |
| Line | 1.5 px effective at authored viewBox scale, `pine-950` |
| Colours | ≤ 6 tokens per plate |
| Devices | Contour field at ~6 % opacity where a background is needed; clay blaze as the focal mark |
| Constraints | Self-contained (no external refs, no fonts, no `<text>`); unique id prefixes so plates are safe to inline |
| Budget | Plates ≤ 25 KB, badges ≤ 8 KB (actual: max 5.6 KB / 1.2 KB) |

#### A-001 · `hero-landing`

- **File:** `web/src/assets/svg/hero-landing.svg` · **Status:** `shipped` · **Medium:** `svg-authored`
- **Consumed by:** `LandingPage` hero, composed to bleed from the right of a `pine-950` `ContourPanel`
- **Canvas:** landscape plate; presented at `ratio="3 / 2"` and cropped to `5 / 2` in the banner slot — composed with quiet edges so both crops work
- **Description:** A helmeted rider seated on a utility ATV on a blazed trail, drawn as a flat field-guide plate. Contour lines behind; clay waypoint blazes leading the eye along the trail toward the rider. The rider is calm and upright — this image sells *judgment*, not excitement.
- **Palette:** `pine-950` line, `pine-700`/`pine-300` masses, `moss-100` ground, `clay-500` blazes (focal), `paper-0` plate
- **Acceptance:** U1–U10, S1–S6, SF1–SF6. Must survive being cropped to a 5:2 banner without losing the rider or the blaze line.
- **Alt:** *"A helmeted rider seated on a utility ATV on a blazed trail, drawn as a flat field-guide plate with contour lines and waypoint blazes."*
- **Upgrade path:** [E-001](#e-001--e-003--marketing-heroes-3) registers a diffusion-rendered marketing variant of the same subject.

#### A-002 … A-007 · Module heroes

One per module. Shared spec: landscape plate, presented at `ratio="4 / 3"` on
`/course/:moduleId` and `5 / 2` on the dashboard Continue card. Each must state
its module's thesis in one image, with no text.

| ID | Slot | Module | Description (shipped) | Focal accent |
| --- | --- | --- | --- | --- |
| A-002 | `hero-m1-mindset` | 1 · The Rider's Mindset | Rider stands at a trail junction; a scan line traces the blazed left route while an unmarked route fades right — choosing the line before riding it | Clay blaze on the chosen route |
| A-003 | `hero-m2-machine` | 2 · Know Your Machine | Side view of a utility ATV as a field-guide plate, with callout ticks at handlebars, rear rack, front tire, footwells | Clay tick on the walkaround start point |
| A-004 | `hero-m3-gear` | 3 · Gear Up | Flat-lay plate of the kit — full-face helmet, padded gloves, over-ankle boots — arranged like museum specimens | Clay on the helmet |
| A-005 | `hero-m4-terrain` | 4 · Reading the Terrain | Hillside as nested contour rings, switchback trail climbing to a summit, caution cues on the steep face | Clay caution cue |
| A-006 | `hero-m5-environment` | 5 · Weather, Environment & Emergencies | Storm front crossing a valley trail, map-style: cold-front line, rain over the west ridge, compass rose, scale bar | Clay compass needle |
| A-007 | `hero-m6-roads` | 6 · Roads, Rules & Other People | Bird's-eye of a trail meeting a paved road at a marked crossing; rider stopped square at the stop bar, sight lines drawn both ways | Clay stop bar |

- **Status:** all `shipped` · **Acceptance:** U1–U10, C1–C5 as a six-plate set, SF1–SF6
- **Set clause:** the six read as one series — same plate ground, same line weight, same accent rhythm. Verified on a six-up contact sheet, not individually.

#### A-008 · `scene-atv-anatomy` — **coordinate contract**

- **File:** `web/src/assets/svg/scene-atv-anatomy.svg` · **Status:** `shipped` · **Medium:** `svg-authored`
- **Consumed by:** step `m2-l1-s2` (`hotspot_list`, 8 markers) — **and nothing else**
- **Canvas:** **500 × 300 (5:3)**. `SlotArt ratio="5 / 3"` is **mandatory** — any other ratio letterboxes the plate and drifts every marker off its feature. This exact bug shipped once and was caught in Wave 2 (`3/2` → markers ~2–3 % low).
- **Description:** Side view of a single-rider utility ATV with every system legible and separable: low-pressure knobby tires, front brake caliper, coil-over suspension, engine mass, frame tube, footwell running boards, handlebars with control cluster, front and rear cargo racks.
- **Coordinate contract — features MUST sit under these percentages:**

  | Hotspot | x % | y % | Feature that must be there |
  | --- | --- | --- | --- |
  | `tires` | 22 | 72 | Front tire sidewall/tread |
  | `handlebars` | 55 | 22 | Bar + control cluster |
  | `brakes` | 30 | 62 | Brake caliper / disc |
  | `suspension` | 38 | 58 | Coil-over spring |
  | `engine` | 48 | 50 | Engine / fuel mass |
  | `footwells` | 62 | 68 | Running board / peg |
  | `racks` | 82 | 38 | Rear cargo rack |
  | `chassis` | 58 | 55 | Frame tube |

- **Acceptance:** overlay dots at all eight percentages; **every dot must land on the feature it names.** This is a scripted check, not a judgement call.
- **Change control:** these percentages are authored curriculum (`content/curriculum/module-02-*.md`) and are **off-limits**. If a marker misses, the *art* moves.

#### A-009 · `scene-trail-hazards` — **coordinate contract**

- **File:** `web/src/assets/svg/scene-trail-hazards.svg` · **Status:** `shipped` · **Medium:** `svg-authored`
- **Consumed by:** step `m4-l1-s2` (`hotspot_list`, 7 markers)
- **Canvas:** **500 × 300 (5:3)**, `ratio="5 / 3"` mandatory
- **Description:** A mid-morning forest trail dipping through a drainage, broadcasting seven readable cues. The teaching intent is *cue reading, not obstacle spotting* — each hazard must be recognisable by its **cue** (a colour change, a shadow, a texture), not by being labelled.
- **Coordinate contract:**

  | Hotspot | x % | y % | Cue that must be legible |
  | --- | --- | --- | --- |
  | `crest` | 16.6 | 11.4 | Trail rises and vanishes — the vanishing point itself |
  | `side_slope` | 18.9 | 46.6 | Off-camber: far edge lower than near, vegetation leaning |
  | `shadow_rut` | 40 | 62 | Linear shadows aligned with the trail |
  | `wet_clay` | 44.9 | 84.6 | Darker smoother band at the low point |
  | `loose_over_hard` | 74.2 | 54.2 | Uniform sparkle, scattered stones at the edge |
  | `deadfall` | 79.1 | 31.5 | Horizontal line breaking vertical texture, part-screened by brush |
  | `soft_edge` | 67.7 | 83.5 | Crumbled edge line, exposed roots, cracks parallel to the edge |

- **Acceptance:** seven-dot overlay check, all on-feature. Additionally: a viewer who has read `m4-l1-s1` should be able to name at least five cues *without* the markers on.

#### A-010 · `scene-walkaround-top` — lab-owned

- **Status:** `lab-owned` (deliberate) · **Consumed by:** step `m2-l3-s2` (`lab_objective`, `lab: walkaround`)
- **Why no file:** the walkaround lab authors its own top-down machine inline as SVG because the five T-CLOC zones are **interactive drop regions** — they need hit areas, hover states, and settle animation. A static plate cannot provide those.
- **Note:** the step payload still declares `config.assetSlot: "scene-walkaround-top"`; the renderer ignores it by design and `SlotArt` keeps the designed placeholder for any other surface that requests the slot. Recorded in `manifest.json` as `status: "lab-owned"`.
- **Do not "fix" this by generating a plate.**

#### A-011 · `scene-helmet-fit`

- **Status:** `shipped` · **Medium:** `svg-authored` · **Consumed by:** *currently unreferenced* — see [C-013](#c-013--helmet-mechanism-diagram)
- **Description:** Cross-section of a helmet on a rider's head showing shell, impact liner, and comfort padding as three distinct layers, strap V fastened under the ear, and a two-finger brow-gap check drawn at the rim.
- **Teaching intent:** the helmet works by **crushing** — the liner is the mechanism, the shell only distributes. Every fit rule in `m3-l1-s1` falls out of that.
- **Action:** this plate exists but no curriculum block renders it. [C-013](#c-013--helmet-mechanism-diagram) registers the `figure` block that should consume it. **A shipped asset with no consumer is waste** — wire it or retire it.

#### A-012 · `scene-crossing`

- **Status:** `shipped` · **Medium:** `svg-authored` · **Consumed by:** *currently unreferenced* — see **C-011** in the keylist table below
- **Description:** Bird's-eye view of an ATV stopped square behind a stop bar at a road crossing, sight lines swept both ways along the road, a vehicle approaching from the left.
- **Teaching intent:** square, stopped, and *looking* — the three things `m6-l2-s1` says a good crossing is.
- **Action:** wire into `m6-l2-s1` per **C-011** in the keylist table.

#### A-013 · `scene-loading-cargo`

- **Status:** `shipped` · **Medium:** `svg-authored` · **Consumed by:** *currently unreferenced* — see [C-014](#c-014--load-height-comparison)
- **Description:** Rear-view **comparison** plate: a low, centred, strapped case with a low centre of gravity beside a tall loose stack whose high CoG tips the machine.
- **Teaching intent:** same kilograms, worse geometry. Directly serves the `heavy_high` sort item in `m6-l2-s2`.
- **Safety note:** this is a registered **negative example** (the tall stack). Per SF4 it must be visually marked as the wrong option — `danger-600` accent on the tipping side.

#### A-014 … A-022 · Badge set

**Set spec — `SET-A-BADGE`:** square, must read at **48 px and 96 px**, emblem
bold and centred because the art sits inside a blaze-diamond frame
(`BadgeMedal`). Earned = full colour; unearned = grayscale ghost, handled by the
component. ≤ 8 KB each (actual max 1.2 KB).

| ID | Slot | Badge | Emblem | Trigger |
| --- | --- | --- | --- | --- |
| A-014 | `badge-b-mindset` | Clear Eyes | Eye with a trail blaze for a pupil | Complete M1 |
| A-015 | `badge-b-mechanic` | Walkaround Ready | Wrench crossed over a tire | Complete M2 |
| A-016 | `badge-b-geared` | Geared Up | Full-face helmet | Complete M3 |
| A-017 | `badge-b-terrain` | Terrain Reader | Eye scanning contour lines | Complete M4 |
| A-018 | `badge-b-prepared` | Storm Smart | Storm cloud read with a compass | Complete M5 |
| A-019 | `badge-b-roadwise` | Road Wise | Marked road-crossing sign | Complete M6 |
| A-020 | `badge-b-journal` | Field Scribe | Field notebook and pen | All 6 artifacts complete |
| A-021 | `badge-b-scholar` | Sharp Eye | Checkmark striking a target | 10 checkpoint first-try bests |
| A-022 | `badge-b-graduate` | Sightline Graduate | Summit flag over the range, flanked by laurels | Certificate issued |

- **Status:** all `shipped` · **Acceptance:** U1–U10 plus legibility at 48 px (verified on a 48 px contact strip, not by scaling down mentally) and C1–C5 as a nine-badge set.

#### A-023 · `empty-journal`

- **Status:** `shipped` · **Consumed by:** `EmptyState` on `/journal` when the learner has no artifacts
- **Description:** An open, blank field notebook with ruled pages, a bookmark ribbon, and a pen lying ready. Inviting, not sad — the DESIGN-005 copy says "As you work through the course you'll build…", so the art should feel *about to be filled*.

#### A-024 · `empty-tutor`

- **Status:** `shipped` · **Consumed by:** first-run intro card on `/tutor` and the Ranger slide-over
- **Description:** Ranger's campaign hat beside a compass with its needle set — ready for a question. Establishes Ranger's identity without anthropomorphising a face.

#### A-025 · `state-404`

- **Status:** `shipped` · **Consumed by:** the `*` route, and the lesson-not-found branch of `LessonPage` (wired in Wave 3 after an adversarial pass found it drawing `state-locked` instead)
- **Description:** A dotted route running off the torn edge of a trail map; the signpost's second board hangs askew, pointing nowhere.
- **Contract:** `state-404` means *nothing here*; `state-locked` means *blocked, but real*. **They are not interchangeable** — that confusion was a shipped defect.

#### A-026 · `state-locked`

- **Status:** `shipped` · **Consumed by:** locked module page, locked lesson `module_locked` envelope, locked assessment
- **Description:** A padlocked gate across the trail; beyond it the route continues, faded, toward the next blaze. The faded continuation is the point — the content is *earned*, not absent.

#### A-027 · `cert-seal`

- **Status:** `shipped` · **Consumed by:** `/certificate` diploma layout and the print stylesheet
- **Description:** Circular seal — rope border, pine ring, clay trail blaze bearing a summit line at the centre.
- **Extra acceptance:** must hold structure under a **grayscale** filter (verified — many printers are mono) and at print DPI. This is why it is `svg-authored` and not diffusion.

---

### 7.2 Tier B — Structural product art

Art bound to product structure rather than to curriculum prose: one per lesson,
per level, per artifact, per activity type, per section, per XP event. These are
the assets that turn text-only surfaces (`LessonRow`, `JournalCard`, `StepRail`,
the Recent-XP feed, `SourceChip`) into something with visual rhythm.

Every entry names its consuming component. **None of these is decorative.**

#### B-001 … B-022 · Lesson cards (22)

**Set spec — `SET-B-LESSON`**

| Property | Value |
| --- | --- |
| Medium | `svg-authored` |
| Canvas | 320 × 180 (16:9), rendered 96–160 px wide in `LessonRow`, full width on the module page |
| Consumed by | `LessonRow` (new leading thumbnail) and `/course/:moduleId` lesson list |
| Composition | **One object, one idea, centred, generous margin.** These are small — a scene will read as mud. |
| Colour | Module's hero accent + 2 supporting tokens. Each module's 3–4 lessons share a tint so the module reads as a family. |
| Line | 1.5 px `pine-950`, simplified — no interior detail below ~6 px |
| Accent | One `clay-500` element only |
| Acceptance | Legible at **96 px wide**; C1–C5 within its module; the four lessons of a module must be distinguishable from each other at 96 px |

| ID | Slot | Lesson | Subject (one object, one idea) |
| --- | --- | --- | --- |
| B-001 | `lesson-m1-l1` | Why Riders Crash | Six small blaze marks in a row, one clay — the short list as a set |
| B-002 | `lesson-m1-l2` | Judgment Under Pressure | A creek line with a stopped machine on the bank, three riders already across |
| B-003 | `lesson-m1-l3` | Your Risk Profile | An open notebook page with four ruled entries, one clay |
| B-004 | `lesson-m2-l1` | Anatomy of an ATV | Machine silhouette with eight tick marks around it |
| B-005 | `lesson-m2-l2` | Controls & What They Do | Handlebar cluster in isolation — thumb throttle, lever, kill switch |
| B-006 | `lesson-m2-l3` | The Pre-Ride Walkaround | A dotted loop path circling a machine, five clay stops |
| B-007 | `lesson-m2-l4` | Fit Is a Hard Rule | Rider silhouette against a machine with reach/stance measure lines |
| B-008 | `lesson-m3-l1` | The Helmet | Helmet in profile with the liner layer exposed as a band |
| B-009 | `lesson-m3-l2` | Head to Toe | Three stacked columns holding gear silhouettes |
| B-010 | `lesson-m3-l3` | Your Gear Card | A card with five checkbox rows, one clay |
| B-011 | `lesson-m4-l1` | Terrain Talks | Trail receding to a vanishing point with a far/near/sides scan arc |
| B-012 | `lesson-m4-l2` | The Stability Envelope | Rear-view machine with a plumb line inside a support rectangle |
| B-013 | `lesson-m4-l3` | Hazard Decisions | A junction: gentle switchback left, steep shortcut right |
| B-014 | `lesson-m4-l4` | Terrain Checkpoint | A single clay blaze on a contour ring — module close |
| B-015 | `lesson-m5-l1` | Conditions Change Everything | One trail drawn twice, dry and wet, side by side |
| B-016 | `lesson-m5-l2` | Before You Go | Three objects: map, phone with a clock, small pack |
| B-017 | `lesson-m5-l3` | When Things Go Wrong | A machine on its side with an untouched helmet beside it — calm, not gory |
| B-018 | `lesson-m5-l4` | Environment Checkpoint | Clay blaze over a cold-front line |
| B-019 | `lesson-m6-l1` | Why Pavement Says No | A knobby tire above a hard road surface, contact patch squirming |
| B-020 | `lesson-m6-l2` | Crossings, Passengers & Loads | Bird's-eye stop bar with a square crossing arrow |
| B-021 | `lesson-m6-l3` | Sharing the Outdoors | Trail with a hiker, a horse, and a machine at courteous spacing |
| B-022 | `lesson-m6-l4` | Capstone — The Ride Plan | A folded plan sheet with six filled sections |

> **B-017 safety note.** Depict aftermath *soberly*: machine down, gear intact,
> no injury depicted, no blood, no drama. The lesson is about the thinking in
> the first minutes, not about the crash. SF6 applies — no motion lines.

#### B-023 … B-029 · Level emblems (7)

**Set spec — `SET-B-LEVEL`:** circular, 128 × 128, sits inside the level ring on
`/progress` and the dashboard greeting. Progression must be **legible as a
sequence** — a learner should see that Wayfinder outranks Greenhorn without
reading the label. Increasing structural complexity, not increasing colour
saturation. `svg-authored`.

| ID | Slot | Level | XP | Emblem |
| --- | --- | --- | --- | --- |
| B-023 | `level-1-trailhead` | Trailhead | 0 | A single trailhead post with one blaze |
| B-024 | `level-2-greenhorn` | Greenhorn | 100 | Post plus first trail segment |
| B-025 | `level-3-pathfinder` | Pathfinder | 250 | Trail forking, the blazed branch chosen |
| B-026 | `level-4-trailhand` | Trailhand | 450 | Trail with three blazes and a contour band |
| B-027 | `level-5-ridge-runner` | Ridge Runner | 700 | Ridge line profile with the trail along its spine |
| B-028 | `level-6-wayfinder` | Wayfinder | 1000 | Compass rose over a contour field |
| B-029 | `level-7-trail-boss` | Trail Boss | 1400 | Summit marker over the full range, laurel-free (that is the graduate badge's device) |

- **Acceptance:** shown in sequence on one strip, the seven read as ascending. No level uses gold except B-029's summit mark (gold is the badge language; levels are pine/clay).

#### B-030 … B-035 · Journal artifact covers (6)

**Set spec — `SET-B-ARTIFACT`:** 240 × 160, drawn as a **notebook page**
consistent with `JournalCard`'s ruled paper treatment. Consumed by `JournalCard`
on `/journal` and the header of `/journal/:artifactType`. Each shows the
artifact's *own* structure, so a learner recognises the card before reading it.

| ID | Slot | Artifact | Module | Cover |
| --- | --- | --- | --- | --- |
| B-030 | `artifact-risk-profile` | `risk_profile` | M1 | Four ruled entries, the second marked clay (the "likely leak") |
| B-031 | `artifact-inspection-log` | `inspection_log` | M2 | Five zone rows in T-CLOC order with tick boxes |
| B-032 | `artifact-gear-card` | `gear_card` | M3 | A pocket card with five gear glyphs |
| B-033 | `artifact-hazard-brief` | `hazard_brief` | M4 | Three hazard entries each with a small cue mark |
| B-034 | `artifact-readiness-plan` | `readiness_plan` | M5 | Contact line, clock, kit list |
| B-035 | `artifact-ride-plan` | `ride_plan` | M6 | A seven-section folded sheet — visibly the biggest, it is the capstone |

- **Acceptance:** the six sit together on `/journal` for a graduate; C1–C5 as a set. B-035 must read as the culmination of the other five.

#### B-036 … B-042 · Corpus topic marks (7)

**Set spec — `SET-B-TOPIC`:** 24 × 24 monochrome glyphs, `svg-authored`,
consumed by `SourceChip` in the tutor so a learner can scan which *kind* of
knowledge an answer drew on. Must read at 16 px. Single-colour (inherits
`currentColor`) — no fills, stroke only, 1.5 px.

| ID | Slot | Topic | Chunks | Glyph |
| --- | --- | --- | --- | --- |
| B-036 | `topic-mindset` | `mindset` | 3 | Eye over a fork in a line |
| B-037 | `topic-machine` | `machine` | 5 | Wheel with a wrench notch |
| B-038 | `topic-gear` | `gear` | 3 | Helmet outline |
| B-039 | `topic-terrain` | `terrain` | 4 | Three contour arcs |
| B-040 | `topic-environment` | `environment` | 3 | Cloud over a ridge line |
| B-041 | `topic-roads` | `roads` | 7 | Crossing bars |
| B-042 | `topic-general` | `general` | 8 | Open book / compass hybrid |

- **Consumed by:** `SourceChip`, and the Ranger-themes section of `/instructor` (which already buckets tutor questions by corpus topic).

#### B-043 … B-054 · Activity type marks (12)

**Set spec — `SET-B-RENDERER`:** 20 × 20 stroke glyphs matching Lucide's 1.5 px
weight so they sit beside real Lucide icons without clashing. Consumed by
`ActivityHost`'s step header and the `StepRail`. Purpose: a learner glancing at
the rail can tell a reading step from a scenario.

| ID | Slot | Renderer | Count in course | Glyph |
| --- | --- | --- | --- | --- |
| B-043 | `act-content` | `content` | 18 | Stacked text lines |
| B-044 | `act-prediction-reveal` | `prediction_reveal` | 4 | Covered card lifting |
| B-045 | `act-multiple-choice` | `multiple_choice` | — | Three options, one ticked |
| B-046 | `act-sort-categorize` | `sort_categorize` | 3 | Items falling into two bins |
| B-047 | `act-match` | `match` | 2 | Two columns joined by a line |
| B-048 | `act-hotspot-list` | `hotspot_list` | 2 | Frame with a pulsing point |
| B-049 | `act-branching-decision` | `branching_decision` | 3 | Path forking twice |
| B-050 | `act-structured-response` | `structured_response` | — | Ruled box with a pen |
| B-051 | `act-journal-builder` | `journal_builder` | 6 | Notebook with a plus |
| B-052 | `act-reflection` | `reflection` | 5 | Thought arc over a line |
| B-053 | `act-lab-objective` | `lab_objective` | 2 | Slider over a shape |
| B-054 | `act-checkpoint` | `checkpoint` | 14 | Flag on a post |

#### B-055 … B-060 · Section arc marks (6)

**Set spec — `SET-B-SECTION`:** 20 × 20 stroke glyphs for the six-section arc
(SPEC-000). Consumed by `StepRail`'s section group headers and
`SectionInterstitial`. The arc is fixed and ordered, so the six should feel like
a **journey**, reading left to right.

| ID | Slot | Section | Glyph |
| --- | --- | --- | --- |
| B-055 | `section-briefing` | Briefing | Trailhead post |
| B-056 | `section-learn` | Learn | Open field guide |
| B-057 | `section-try` | Try | Boot print on trail |
| B-058 | `section-debrief` | Debrief | Backward glance arc |
| B-059 | `section-journal` | Journal | Pen on a ruled line |
| B-060 | `section-checkpoint` | Checkpoint | Blaze on a post |

#### B-061 … B-068 · App icon and favicon set (8)

**Set spec — `SET-B-ICON`:** the blaze mark alone — the product's signature
device — on `pine-950`. **No wordmark below 128 px** (it becomes mud). Currently
the app ships an inline SVG data-URI favicon; this set replaces it properly.

| ID | File | Size / purpose |
| --- | --- | --- |
| B-061 | `favicon.svg` | Scalable, primary for modern browsers |
| B-062 | `favicon-32.png` | 32 × 32 classic |
| B-063 | `favicon-16.png` | 16 × 16 — blaze only, no interior detail |
| B-064 | `apple-touch-icon.png` | 180 × 180, safe-area inset, opaque background |
| B-065 | `icon-192.png` | 192 × 192 PWA maskable |
| B-066 | `icon-512.png` | 512 × 512 PWA maskable |
| B-067 | `mask-icon.svg` | Monochrome Safari pinned tab |
| B-068 | `og-default-v2.png` | 1200 × 630 fallback social card — see [E-010 … E-024](#e-010--e-024--per-route-og-cards-15) |

- **Acceptance:** B-063 checked at actual 16 px in a real browser tab, not zoomed. Maskable icons verified against the 40 % safe zone.

**Status: produced.** Delivered to `web/public/`, wired in `web/index.html` plus
`site.webmanifest`. These are static files served from the origin root, **not
`SlotArt` slots** — deliberately absent from `manifest.json`, since nothing
resolves them at runtime and the §10.4 lint would report all eight as orphaned.

The mark is the blaze with a `paper-0` **sightline cut through it**. Four
candidates were rendered and compared at true 16 px before choosing:

| Candidate | Verdict at 16 px |
| --- | --- |
| Bare tile + blaze | Reads, but is only "an orange diamond" |
| Blaze over a `pine-300` horizon | **Fails** — the horizon becomes a muddy smear; works at 180, dies at 16 |
| Blaze alone, no tile | No tile presence, and it duplicates the hotspot activity's own interactive marker |
| **Blaze + `paper-0` cut** ✔ | The only one whose *second* element survives — `paper-0` on `clay-500` is a large enough contrast jump to hold one device pixel |

Three geometries ship, because a single file is wrong on two platforms:

- `favicon.*` — rounded tile, **transparent outside the corner radius**. Rendered
  on an opaque page it bakes white corner pixels that halo on a dark tab strip.
- `apple-touch-icon` — **square, opaque, no pre-rounding.** iOS applies its own
  superellipse mask; a pre-rounded icon is rounded twice and shows corner fringe.
- `icon-192/512` — **maskable**: ground bleeds to the edge, mark inside the 80 %
  safe circle. Verify by circle-cropping the PNG, not by eye.

Two defects were caught by measuring rather than looking, and both are general:

1. **Chromium bakes LCD subpixel antialiasing into any text-bearing PNG.**
   `og-default` measured 912 pixels of >40 RGB channel spread on a two-colour
   card — visible as red/blue fringes. `-webkit-font-smoothing` does not reach
   SVG `<text>`. The fix is the Part 1 supersample: render ×3, Lanczos down.
   After: **0 pixels**. Any future `render-html` asset must do this.
2. `mask-icon` was authored with a **sharp** diamond while every other instance
   of the mark is rounded — clause C4, one object drawn two ways. Rounded.

#### B-069 … B-078 · XP event marks (10)

**Set spec — `SET-B-XP`:** 16 × 16 glyphs, `clay-500`, consumed by the Recent-XP
feed on the dashboard and `/progress`. Currently every row shows the same
generic mark; these let a learner scan *what kind* of progress they made.

| ID | Slot | Event | XP | Glyph |
| --- | --- | --- | --- | --- |
| B-069 | `xp-step-complete` | `step_complete` | 5 | Single blaze |
| B-070 | `xp-lesson-complete` | `lesson_complete` | 25 | Blaze with a ring |
| B-071 | `xp-checkpoint-first-try` | `checkpoint_first_try` | 15 | Flag with a spark |
| B-072 | `xp-module-complete` | `module_complete` | 75 | Badge outline |
| B-073 | `xp-journal-artifact` | `journal_artifact_complete` | 30 | Notebook page |
| B-074 | `xp-scenario-best-path` | `scenario_best_path` | 10 | Fork with the best line lit |
| B-075 | `xp-lab-objectives` | `lab_objectives_met` | 20 | Three ticked objectives |
| B-076 | `xp-capstone` | `capstone_complete` | 100 | Folded plan sheet |
| B-077 | `xp-final-assessment` | `final_assessment_passed` | 150 | Summit marker |
| B-078 | `xp-tutor-first` | `tutor_first_question` | 5 | Ranger hat, small |

> **SF-adjacent constraint.** No XP mark may imply speed, streaks, or ranking
> (SPEC-009 forbidden signals). No stopwatches, no flames, no leaderboard motifs,
> no "3× combo" language. These glyphs describe *what was learned*, never *how
> fast*.

#### B-079 … B-083 · Remaining structural (5)

| ID | Slot | Consumed by | Description |
| --- | --- | --- | --- |
| B-079 | `empty-progress` | `EmptyState` on `/progress`, zero XP | An odometer at zero on a field-guide plate — matches DESIGN-005 copy *"No miles on the odometer yet"* |
| B-080 | `empty-instructor` | `EmptyState` on `/instructor`, no learners | An empty trail register book — matches *"No learner data yet"* |
| B-081 | `state-403` | Non-instructor hitting `/instructor` | A staff-only trail gate with a warden's post. Distinct from `state-locked` (which promises *later*); this one means *not yours* |
| B-082 | `hero-assessment` | `/assessment` intro state | A summit approach: the final ridge with the marker visible ahead |
| B-083 | `hero-graduate` | Dashboard graduate variant | The summit reached, range spread below, one blaze planted |

---

### 7.3 Tier C — Curriculum figures

> **The finding that produced this tier.** SPEC-007 §1 defines a
> `{type:'figure', assetSlot, caption}` block for the `content` renderer. The
> authored curriculum uses it **zero times** across all 18 content steps. There
> are 12 keylists, 19 callouts, and 46 named terms carrying the entire teaching
> load in prose alone. This is the single largest visual-quality opportunity in
> the product.

#### 7.3.0 The restraint rule

More figures is not better. DESIGN-001 caps the lesson stage at a 760 px reading
measure, and a figure every two hundred words fatigues rather than teaches.

> **Rule: at most one figure per step, and only where the figure carries
> information the prose cannot.**

A figure earns its place when it shows **structure** (an ordering, a mechanism,
a spatial relationship, a comparison). It does not earn its place by decorating
a paragraph. Entries below that fail this test are registered `deferred` with
the reason recorded, so the decision is visible rather than forgotten.

#### C-001 … C-012 · Keylist diagrams (12) — **highest value in the tier**

**Set spec — `SET-C-KEYLIST`**

| Property | Value |
| --- | --- |
| Medium | `svg-authored` — these are diagrams; precision and runtime recolour matter |
| Canvas | 720 × 400 (9:5), rendered at the 760 px stage measure |
| Consumed by | A new `figure` block in the step that owns the keylist |
| Composition | The keylist's **structure made spatial** — a set, a sequence, a hierarchy, or a cycle. Never a bulleted list redrawn as pictures. |
| Text | **None.** The `figure` block's `caption` carries words; the plate carries structure. Terms map to positions the prose has already named in order. |
| Accent | `clay-500` on the single most consequential element |
| Acceptance | A learner who has read the step can point to each keylist term's position without a legend |

| ID | Step | Keylist | Terms | Structure the plate must show |
| --- | --- | --- | --- | --- |
| C-001 | `m1-l1-s3` | The six decisions behind most serious crashes | 6 | **A set, not a ranking** — six equal blaze marks around a single rider silhouette, each touching it. The prose is explicit that there is no single villain, so no element may dominate. |
| C-002 | `m1-l2-s1` | The three leaks | 3 | **Three drains from one vessel** — group gravity, familiarity discount, sunk momentum draining a "judgment" reservoir. Equal weight, different mechanisms. |
| C-003 | `m2-l3-s1` | T-CLOC | 5 | **An ordered loop** — five zones as stations around a machine, walked in fixed order, arrow returning to the start. Order is the whole point ("ritual is what makes it reliable"). |
| C-004 | `m2-l4-s1` | The fit checks | 4 | **Four pass/fail gates** — reach, stance, leverage, class as measure lines against a rider-on-machine silhouette. Gates, not a spectrum. |
| C-005 | `m3-l1-s1` | Consequences of the mechanism | 4 | **One mechanism, four consequences** — the crushable liner at centre, four rules radiating from it. The causal arrow must be visible: mechanism → rules. |
| C-006 | `m4-l2-s1` | Everything this one model explains | 4 | **One model, four applications** — CoG-over-support at centre; slopes, side-hills, rider position, and loads as four cases around it. |
| C-007 | `m5-l1-s1` | The four families | 4 | **Two attack the trail, two attack the rider** — water and light on one side, cold/heat and dust on the other, split by what they degrade. |
| C-008 | `m5-l2-s1` | The before-you-go trio | 3 | **Three artifacts, two on paper one on the rack** — plan, contact, kit. Drawn as objects, laid out in the driveway before the ride. |
| C-009 | `m5-l3-s1` | Stop — Assess — Communicate | 3 | **A strict sequence** — three numbered stages left to right, each gated by the last. The only keylist in the course that is genuinely ordinal. |
| C-010 | `m6-l1-s2` | Why the machine itself objects | 3 | **Three engineering facts, one conclusion** — deforming tire, locked rear axle, high CoG, all arrows converging on "pavement". |
| C-011 | `m6-l2-s1` | Anatomy of a good crossing | 4 | **A plan view with four annotations** — stop, look both ways, square and brisk, individually. **Consumes [A-012](#a-012--scene-crossing)** rather than new art. ⚠️ See the reconciliation note below. |
| C-012 | `m6-l3-s1` | The three standards | 3 | **Three commitments** — zero impairment, generous yield, stay-on-trail, drawn as three trail signs at one junction. |

> **C-011 resolves an orphan.** `scene-crossing` (A-012) shipped in Wave 2 and is
> referenced by nothing. This entry is the `figure` block that makes it earn its
> place. [C-013](#c-013--helmet-mechanism-diagram) and
> [C-014](#c-014--load-height-comparison) do the same for the other two orphans.

> **⚠️ Reconciliation — two plates were generated that cannot be wired.**
> This table specifies C-005 → `m3-l1-s1` and C-011 → `m6-l2-s1`. Wave V1 had
> already wired `scene-helmet-fit` and `scene-crossing` into *those same two
> steps*, and [§7.3.0](#7300-the-restraint-rule) permits only one figure per
> step. The generation batch drew `keylist-helmet-consequences` and
> `keylist-good-crossing` anyway, because the batch brief was written from this
> table without re-checking V1's result. Both plates exist, are house-quality,
> and have **no consumer**.
>
> **Resolution:** both are marked `deferred` in `manifest.json` with a reason,
> not deleted — the art is sound and a future step may earn it. C-011's registry
> row is retained as the *wiring* record for A-012 (which is what actually
> renders at `m6-l2-s1`); the drawn plate is a separate, unused artifact.
>
> **The lesson, which is the point of recording it:** a batch brief must be
> generated from the registry's *current* state, not from a reading taken before
> an earlier wave landed. Two plates of wasted effort is cheap; the same mistake
> across a 40-asset batch would not be. [§8.3](#83-batch-procedure) step 1 now
> means "lock the set spec **and re-verify every entry's consumer is still
> free**".

##### C-013 · Helmet mechanism diagram
*(cross-reference target for A-011)*

- **ID:** C-013 · **Step:** `m3-l1-s1` · **Status:** `ready`
- **Consumes existing art:** [A-011 `scene-helmet-fit`](#a-011--scene-helmet-fit) — no new plate needed
- **Action:** add a `figure` block to `m3-l1-s1` after the mechanism paragraph,
  `assetSlot: "scene-helmet-fit"`, caption: *"The liner is the mechanism. Shell
  distributes, liner crushes, and every fit rule follows from that."*
- **Why this matters:** the step's entire argument is *"everything else about
  helmets falls out of this"*, and the plate that shows the layers already
  exists, unused.

##### C-014 · Load height comparison
*(cross-reference target for A-013)*

- **Step:** `m6-l2-s2` (before the sort) or `m6-l2-s1` · **Status:** `ready`
- **Consumes existing art:** [A-013 `scene-loading-cargo`](#a-013--scene-loading-cargo)
- **Caption:** *"Same kilograms, different geometry. Height is the variable the rack limit does not print."*
- **Registered negative example:** the tall loose stack must carry the SF4 marking.

#### C-020 … C-038 · Callout vignettes (19)

**Set spec — `SET-C-CALLOUT`:** 400 × 240 (5:3) small plates, sitting inside the
`CalloutCard` beside its 3 px semantic bar. Medium varies by variant — `story`
callouts are scenes (`diffusion` suits them), `caution` callouts are diagrams
(`svg-authored`). Accent must match the callout's semantic colour, not the
global clay: tip → `pine-700`, caution → `sun-400`, story → `sky-600`,
risk → `danger-600`.

**`story` callouts (4) — `ready`, these are the narrative moments**

| ID | Step | Callout | Vignette |
| --- | --- | --- | --- |
| C-020 | `m1-l1-s1` | "The pattern" | A search-and-rescue volunteer's view: a trail, a machine, and the recurring short list implied by what is *missing* (no helmet on the ground beside it) |
| C-021 | `m2-l3-s1` | "Why it works" | The same machine on two mornings, side by side; one small difference (a fresh drip) visible only because the ritual made you look |
| C-022 | `m5-l2-s1` | "The check-in that worked" | Two places at once: a rider warm beside a dead machine at dusk, and a lit window in town with the plan on the table |
| C-023 | `m6-l3-s1` | "Why the counting signal exists" | A narrow trail meeting; lead rider holding up three fingers, three machines behind |

**`caution` callouts (5) — `ready`, these mark real limits**

| ID | Step | Callout | Plate |
| --- | --- | --- | --- |
| C-024 | `m2-l3-s1` | "The awareness line" | Three concentric scopes: what this course teaches / what the manual gives / what hands-on training gives |
| C-025 | `m2-l4-s1` | "The pattern worth naming plainly" | A too-large machine against a small rider, the four fit gates all failing at once |
| C-026 | `m4-l2-s1` | "What this model is" | The lab's clean support diagram beside a real slope's messy variables, marked *concept model* |
| C-027 | `m5-l3-s1` | "The boundary, plainly" | A line between "scene safety and basic aid" and "professional care" |
| C-028 | `m6-l1-s2` | "And then there's traffic" | The road environment as the added hazard: mass and closing speed the trail never produces |

**`tip` callouts (10) — mostly `deferred`**

| ID | Step | Callout | Decision |
| --- | --- | --- | --- |
| C-029 | `m1-l1-s3` | "Why decisions, not skills?" | `deferred` — argument is verbal, no structure to show |
| C-030 | `m1-l2-s1` | "The out-loud rule" | `ready` — a speech mark on a trail, the one tip with a memorable device |
| C-031 | `m1-l3-s1` | "How to answer well" | `deferred` — writing advice; prose is the right medium |
| C-032 | `m3-l1-s1` | "Eyes too" | `deferred` — covered by A-011 in the same step; one figure per step (§7.3.0) |
| C-033 | `m3-l2-s2` | "Habit 1 — gear lives together" | `ready` — one hook by the door holding the whole every-ride set |
| C-034 | `m3-l2-s2` | "Habit 2 — gear gets the walkaround too" | `deferred` — same step as C-033 |
| C-035 | `m4-l1-s1` | "Cues, not objects" | `ready` — the same trail drawn twice: novice sees obstacles, expert sees cues |
| C-036 | `m5-l1-s1` | "The condition question" | `deferred` — one question, no structure |
| C-037 | `m6-l2-s1` | "The category-and-authority pattern" | `ready` — a rule-category funnel ending at "your local authority" |
| C-038 | `m6-l4-s1` | "The standard" | `deferred` — capstone briefing already carries B-022 |

> Six of ten tip callouts are `deferred` **on purpose**. Registering them with a
> stated reason is the point: the next agent does not re-open a closed question,
> and a reviewer can see the restraint was deliberate rather than an oversight.

#### C-040 … C-043 · Prediction reveal plates (4)

**Set spec — `SET-C-REVEAL`:** these render *after* the learner commits, in the
reveal panel. They pay off the curiosity gap, so they must show the **answer's
mechanism**, not restate the question. 640 × 360. `svg-authored`.

| ID | Step | Question | Reveal plate |
| --- | --- | --- | --- |
| C-040 | `m1-l1-s2` | Which factor shows up most often? | Six factors as overlapping circles — the reveal is that they *cluster and compound*, not that one wins |
| C-041 | `m2-l2-s2` | Closed throttle on a hill? | Engine-braking force diagram: drag arrow opposing motion, sized between "coast" and "stop" |
| C-042 | `m3-l1-s2` | The dropped helmet | The liner in cross-section with a single crush cell spent — invisible from outside, which is the whole answer |
| C-043 | `m6-l1-s1` | Why is pavement a problem? | The three-part stack: tire, axle, CoG — all pointing the same way |

#### C-050 … C-055 · Branching scenario moments (6)

**Set spec — `SET-C-SCENARIO`:** the "field report" card at the head of each
`branching_decision`, plus one plate per decision node. 960 × 540. Sober, never
dramatic (SF6).

> **Medium changed `diffusion` → `svg-authored` on 2026-08-06.** All six were
> generated at house settings across 24 candidates and all six failed: every
> entry here makes a **spatial claim** (a junction, a downed machine, riders
> stopped on one bank) and diffusion will not honour one. See
> [§6.5](#65-the-spatial-claim-rule-learned-the-expensive-way). C-054 and C-055
> additionally fall under [§5.4](#54-the-safety-clause), which now defaults to
> `svg-authored` on its own.

| ID | Step / node | Scene |
| --- | --- | --- |
| C-050 | `m1-l2-s2` header | Late afternoon, four riders, a spring-melt creek running fast and opaque, two already across on the far bank |
| C-051 | `m1-l2-s2` node 2 | The same crossing after dark, headlights lit: the far pair waiting on their bank, the near two stopped, every beam dying on black water |
| C-052 | `m4-l3-s1` header | A junction: gentle switchbacks descending left, a steep damp grass shortcut dropping right with an off-camber traverse midway |
| C-053 | `m4-l3-s1` node 2 | The switchback midway: a short off-camber wet stretch where spring water crosses |
| C-054 | `m5-l3-s2` header | A climb, a machine on its side at the outside of a bend, engine still running, a rider sitting beside it holding a wrist |
| C-055 | `m5-l3-s2` node 2 | The same scene, engines off, one bar of signal on a phone, 40 minutes of trail to the trailhead |

> **C-054 / C-055 handling.** The only incident depictions in the product. Sober
> and clinical: gear intact, no injury shown, no blood, no expression of pain,
> no motion or impact lines. The teaching subject is the **thinking**, and the
> art must not invite spectacle. Escalate to human review before shipping.

#### C-070 … C-095 · Sort item icons (26)

**Set spec — `SET-C-SORT`:** 64 × 64 icons on the draggable cards in
`sort_categorize`. Purpose is functional, not decorative — a learner dragging 11
cards scans faster with icons, and the tap-to-assign path (R3.3) benefits most.
`svg-authored`, 2 px stroke at 64 px, single accent per icon, **no text**.

**M3-L2 · "Sort the gear" (11 items, 3 categories)**

| ID | Item | Category | Icon |
| --- | --- | --- | --- |
| C-070 | Rated, fitted helmet — fastened | Every ride | Full-face helmet, strap fastened |
| C-071 | Goggles or face shield | Every ride | Goggles |
| C-072 | Over-the-ankle boots | Every ride | Boot above ankle line |
| C-073 | Riding gloves | Every ride | Glove |
| C-074 | Long sleeves and long pants | Every ride | Sleeve + trouser leg |
| C-075 | Chest/roost protector | Conditions | Chest plate |
| C-076 | High-visibility layer or flag | Conditions | Whip flag |
| C-077 | Weather layers | Conditions | Stacked shell + insulation |
| C-078 | Loose scarf, drawstrings, straps | Never | Dangling strap near a wheel, `danger-600` |
| C-079 | Sandals or flip-flops | Never | Sandal, `danger-600` |
| C-080 | Both-ears headphones | Never | Headphones with a struck-through ear, `danger-600` |

**M5-L1 · "Condition to adjustment" (8 items)**

| ID | Item | Category | Icon |
| --- | --- | --- | --- |
| C-081 | Third in a dry-day group, dust | Slow / add space | Machine in a dust cone |
| C-082 | Overnight rain, wooded roots | Slow / add space | Wet root band |
| C-083 | First frost, shaded corners white | Slow / add space | Frost patch in shade |
| C-084 | Loop 40 min behind, sunset fixed | Reroute / reschedule | Clock against a setting sun |
| C-085 | Thunderstorm line mid-ride | Reroute / reschedule | Front line with rain |
| C-086 | Creek higher and faster than seen | Reroute / reschedule | Swollen crossing |
| C-087 | Cold drizzle, clumsy hands | Tend the rider | Hand on a lever, cold marks |
| C-088 | Hot afternoon, headache, no water | Tend the rider | Sun with an empty bottle |

**M6-L2 · "Passengers & cargo calls" (7 items)**

| ID | Item | Category | Icon |
| --- | --- | --- | --- |
| C-089 | Child behind you on a single-rider ATV | Unsafe | Two figures on a one-seat machine, `danger-600` |
| C-090 | Passenger on a labelled two-up machine | Sound | Two-seat machine, both geared |
| C-091 | Fencing gear within posted rack limits | Sound | Strapped low load with a limit tag |
| C-092 | Tall heavy cooler high on the rear rack | Needs a check | High load with a CoG arrow, `sun-400` |
| C-093 | Towing a small utility trailer, first time | Needs a check | Machine + trailer with a hitch query |
| C-094 | Toddler on the operator's lap | Unsafe | Lap position over the controls, `danger-600` |
| C-095 | Loose tools in the front basket | Needs a check | Unsecured tools bouncing, `sun-400` |

> **Colour is doing teaching work here.** Unsafe items carry `danger-600`,
> check-first items carry `sun-400`, sound practice stays neutral. That is a
> deliberate reinforcement of the sort's own categories — and it means the icons
> must **not** be recoloured by the drag interaction.

#### C-100 … C-110 · Match pair icons (11)

**Set spec — `SET-C-MATCH`:** 48 × 48 on the left column of `match`. Same
construction as `SET-C-SORT` at smaller size.

**M2-L2 · "Match the controls" (6)**

| ID | Control | Icon |
| --- | --- | --- |
| C-100 | Thumb throttle | Thumb lever on a bar end |
| C-101 | Front brake lever | Hand lever |
| C-102 | Rear/foot brake | Foot pedal |
| C-103 | Engine stop switch | Toggle with a stop bar |
| C-104 | Gear selector / range | Gate with H pattern |
| C-105 | Body position | Rider silhouette shifting weight — *the invisible control*, so draw the rider, not a part |

**M5-L2 · "Plan element to failure prevented" (5)**

| ID | Element | Icon |
| --- | --- | --- |
| C-106 | Turnaround time | Clock with a return arrow |
| C-107 | Off-ride contact with check-in | Person + phone at a window |
| C-108 | Water and food beyond the plan | Bottle + ration |
| C-109 | Signal-free navigation | Paper map + compass |
| C-110 | Warmth for an unplanned wait | Folded layer |

#### C-120 … C-134 · Hotspot detail insets (15)

**Set spec — `SET-C-HOTSPOT-INSET`:** 320 × 240 plates shown in the hotspot side
panel (desktop) / bottom sheet (mobile) alongside each hotspot's description.
The base scene shows *where*; the inset shows *what you are looking at*. This is
the highest-value addition to the two hotspot activities, which currently render
text only in the panel.

**On `scene-atv-anatomy` (8) — `m2-l1-s2`**

| ID | Hotspot | Inset |
| --- | --- | --- |
| C-120 | Tires & wheels | Tire cross-section showing the low-pressure carcass deforming around ground |
| C-121 | Handlebars & controls | Bar cluster from the rider's view |
| C-122 | Brakes | Caliper and disc, lever linkage implied |
| C-123 | Suspension | Coil-over through its travel, tire staying in contact |
| C-124 | Engine & fuel | Engine mass with fuel and oil check points marked |
| C-125 | Footwells & pegs | Boot on peg with the footwell guarding the wheel |
| C-126 | Racks & cargo points | Rack with a limit tag and low-centred load |
| C-127 | Frame & chassis | Frame tube skeleton with the load path highlighted |

**On `scene-trail-hazards` (7) — `m4-l1-s2`**

| ID | Hotspot | Inset — must isolate **the cue** |
| --- | --- | --- |
| C-128 | Blind crest | The vanishing point itself, sight distance marked |
| C-129 | Off-camber section | Cross-section: far edge lower, vegetation leaning |
| C-130 | Shadowed ruts | Linear shadow across a rut, with a light-crossing read |
| C-131 | Dark wet patch | Colour change at the low point, water collecting |
| C-132 | Gravel over hardpack | Loose layer over hard base, marbles at the edge |
| C-133 | Downed limb | Horizontal break in vertical texture, part-screened |
| C-134 | Undercut soft edge | Edge in section: crumbled lip, exposed roots, water beneath |

- **Acceptance for the whole set:** each inset must be recognisable as a zoom of
  the base scene — same drawing conventions, same line weight, same palette
  (clause C4). A learner should never wonder whether the inset shows a different
  machine.

---

### 7.4 Tier D — UI, state, and moment art

Art that belongs to the application rather than the curriculum: transitions,
celebrations, failure states, and the tutor's identity.

#### D-001 … D-006 · Section interstitial backdrops (6)

**Set spec — `SET-D-INTERSTITIAL`:** full-bleed backdrops for
`SectionInterstitial`, the 320 ms moment between sections. DESIGN-004 specifies
"contour lines translate slowly behind the section title fade". Currently one
generic contour field serves all six; a per-section backdrop makes the arc feel
like a journey. **Very low contrast** — the section title sits on top and must
stay ≥ 4.5:1. `svg-authored`, 1600 × 900, ≤ 8 % ink opacity.

| ID | Section | Backdrop motif |
| --- | --- | --- |
| D-001 | Briefing | Contours at a trailhead, tightly spaced — about to begin |
| D-002 | Learn | Open contour field, calm and even |
| D-003 | Try | Contours steepening, terrain becoming consequential |
| D-004 | Debrief | Contours opening out, looking back down |
| D-005 | Journal | Contours crossed by faint ruled notebook lines |
| D-006 | Checkpoint | Contours converging on a single blaze |

- **Acceptance:** with the section title composited on top, contrast ≥ 4.5:1 in
  every case; `prefers-reduced-motion` renders these static without loss (they
  carry no meaning in motion).

#### D-007 … D-011 · Celebration moments (5)

DESIGN-004 names the choreographed moments. These are their art.

| ID | Slot | Moment | Description | Constraint |
| --- | --- | --- | --- | --- |
| D-007 | `moment-lesson-complete` | Lesson complete screen | A blaze newly planted beside the trail, the route continuing | Quiet. A lesson is a step, not a triumph |
| D-008 | `moment-module-complete` | Module complete moment (R2.6) | The module's badge settling into a blaze-shaped frame, with the next module's ridge visible ahead | "Worth a screenshot" per R2.6 |
| D-009 | `moment-level-up` | Level-up toast | The level ring completing, next trail title implied | 5 s dwell, non-blocking |
| D-010 | `moment-badge-earned` | Badge award | A badge seating into the shelf | Reuses the earned badge art, adds the frame |
| D-011 | `moment-certificate` | Certificate issued | The seal pressing into the sheet — the one 900 ms draw-in DESIGN-004 permits | Once, on issue only |

> **SPEC-009 forbidden signals apply.** No confetti, no fireworks, no streak
> counters, no speed praise, no ranking. The celebration vocabulary is
> **trail progress**: blazes planted, ground covered, summits reached.

#### D-012 … D-016 · Error and edge states (5)

| ID | Slot | State | DESIGN-005 copy it accompanies | Description |
| --- | --- | --- | --- | --- |
| D-012 | `state-offline` | Network down banner | *"You're offline. Sightline Safety Academy will reconnect automatically."* | A trail sign with the next marker fogged out — temporary, not broken |
| D-013 | `state-error-500` | API 500 toast | *"Something broke on our side. Your progress up to now is saved."* | A washed-out bridge with the trail intact both sides — *our* problem, your ground is safe |
| D-014 | `state-tutor-timeout` | Ranger timeout bubble | *"That one took too long on my end. Ask again — I'm still here."* | Ranger's hat on a post beside a cold campfire — waiting, still present |
| D-015 | `state-rate-limited` | Rate-limited inline | *"Too many attempts. Take a breather — try again in about 10 minutes."* | A closed gate with a clock — reopening, not refusing |
| D-016 | `state-assessment-locked` | `/assessment` locked | Names the remaining modules | The summit visible above an unclimbed section of trail |

- **Voice constraint (DESIGN-005):** *"direction, not mood; errors never
  apologize twice or get vague."* The art must not be sad, cute, or apologetic.
  No frowning faces, no broken robots, no shrugging mascots.

#### D-017 … D-019 · Grounding label marks (3)

Consumed by `GroundingLabel` in the tutor. ADR-005 makes honest grounding a
first-class product behaviour, and these three marks carry it visually. 12 × 12,
`svg-authored`. The existing implementation uses a filled/half/outline dot; this
set formalises it.

| ID | Slot | Grounding | Label text | Mark |
| --- | --- | --- | --- | --- |
| D-017 | `grounding-curriculum` | `curriculum` | "From the course" | Filled `pine-700` dot |
| D-018 | `grounding-mixed` | `mixed` | "Course + Ranger's knowledge" | Half-filled dot |
| D-019 | `grounding-general` | `general` | "Ranger's general knowledge — not covered in the course" | Open `sky-600` ring |

- **Acceptance:** the three are distinguishable at 12 px **and in grayscale**
  (the distinction is load-bearing honesty, so it must not depend on colour alone
  — an accessibility requirement, not a nicety).

#### D-020 … D-022 · Tutor identity (3)

| ID | Slot | Consumed by | Description |
| --- | --- | --- | --- |
| D-020 | `ranger-avatar` | `ChatMessage` ranger bubbles | The ranger-hat glyph, 24 × 24, readable at 16 px. Never a face — Ranger is a guide, not a character |
| D-021 | `ranger-typing` | Pending answer bubble | Three-dot pulse in the ranger bubble (DESIGN-004 moment 6); static under reduced motion |
| D-022 | `ranger-offline` | Offline-mode header badge (R5.5) | Hat with a small unlit lantern — honest about reduced capability, not broken |

#### D-023 … D-026 · Remaining UI (4)

| ID | Slot | Consumed by | Description |
| --- | --- | --- | --- |
| D-023 | `triage-shield` | Triage message eyebrow in the tutor | A small shield mark in `sun-400` — marks a boundary answer without scolding |
| D-024 | `suggestion-spark` | `SuggestionButtons` | A small blaze-spark leading each follow-up |
| D-025 | `instructor-funnel` | `/instructor` module funnel header | A trail narrowing through six gates |
| D-026 | `account-export` | `/account` data-export action | A pack being loaded — *your data leaves with you* |

---

### 7.5 Tier E — Marketing, social, and share

The only tier where `diffusion` is the default medium, because richness is the
product here and nothing must match a diagram.

> **SF clauses apply with full force.** Marketing is where the temptation to
> show a machine mid-air is strongest, and where doing so would most directly
> contradict the course being sold. Product pillar #1 outranks conversion.

#### E-001 … E-003 · Marketing heroes (3)

**Set spec — `SET-E-HERO`:** `diffusion`, house settings, generated as a spread
of 8 seeds and triaged per [Part 2](#part-2--the-agentic-generation-procedure).
The proven `hero-atv-rider` from the smoke test is the reference for this set —
its accepted prompt is in [Appendix B](#appendix-b--the-reference-prompt).

| ID | File | Canvas | Use | Composition |
| --- | --- | --- | --- | --- |
| E-001 | `marketing-hero-wide` | 1216 × 832 → 1920w ladder | Landing hero, right-bleed | Rider seated upright, side profile, level trail, generous left space for the headline to sit over |
| E-002 | `marketing-hero-square` | 1024 × 1024 | Social profile, app store | Tighter crop of the same subject; machine and rider fill the frame |
| E-003 | `marketing-hero-portrait` | 832 × 1216 | Mobile hero, story format | Vertical: trail receding upward behind the rider |

- **Shared acceptance:** U1–U10, S1–S6, SF1–SF6. Left third of E-001 must stay
  quiet enough for `paper-0` display type at ≥ 4.5:1.
- **Delivery:** full AVIF/WebP/PNG ladder per [§1.5](#15-delivery-format-ladder);
  AVIF ≤ 120 KB at 1920w (LCP path).

#### E-004 … E-009 · Module social cards (6)

`diffusion` rich variants of the six module subjects, 1200 × 630, for sharing a
module. Distinct from the in-app SVG heroes (A-002…A-007) — same subject,
different medium, different job. See [§6.3](#63-the-hybrid-tier).

| ID | File | Module |
| --- | --- | --- |
| E-004 | `social-m1-mindset` | The Rider's Mindset |
| E-005 | `social-m2-machine` | Know Your Machine |
| E-006 | `social-m3-gear` | Gear Up |
| E-007 | `social-m4-terrain` | Reading the Terrain |
| E-008 | `social-m5-environment` | Weather, Environment & Emergencies |
| E-009 | `social-m6-roads` | Roads, Rules & Other People |

#### E-010 … E-024 · Per-route OG cards (15)

**Medium: `render-html`** — every one of these carries text, and generated
letterforms are the most reliable slop tell ([§6.4](#64-render-html)). Compose
in HTML with the real self-hosted fonts, screenshot with Playwright at 1200 × 630,
2× DPI. The crawl harness already does exactly this kind of driving.

**Template:** `pine-950` contour panel, Bricolage display line, Inter sub-line,
blaze mark, and the route's own art inset at right.

| ID | Route | Card headline | Art inset |
| --- | --- | --- | --- |
| E-010 | `/` | "Ride like you've thought it through." | E-001 |
| E-011 | `/login` | "Welcome back" | Blaze only |
| E-012 | `/register` | "Start the course" | E-001 crop |
| E-013 | `/verify/:code` | "Verified completion" | A-027 `cert-seal` |
| E-014 | `/dashboard` | "Basecamp" | B-083 |
| E-015 | `/course` | "Six modules, one trail" | Trail map motif |
| E-016 | `/course/:moduleId` | Module title (dynamic) | That module's A-00x hero |
| E-017 | `/learn/:lessonId` | Lesson title (dynamic) | That lesson's B-0xx card |
| E-018 | `/journal` | "Your field journal" | A-023 |
| E-019 | `/journal/:artifactType` | Artifact title (dynamic) | That artifact's B-03x cover |
| E-020 | `/progress` | "Miles on the trail" | Level emblem |
| E-021 | `/assessment` | "The final assessment" | B-082 |
| E-022 | `/certificate` | "The whole trail, ridden" | A-027 |
| E-023 | `/tutor` | "Meet Ranger" | A-024 |
| E-024 | `/instructor` | "Course staff" | D-025 |

- **Dynamic entries** (E-016, E-017, E-019) are *templates*, not files: one
  renderer that takes a title and an art slot. Registering them as three entries
  rather than 22 + 6 is deliberate — see [§8.5](#85-how-this-scales-past-1000).
- **Note:** `/account` gets no OG card by design (private surface), and
  `/learn/:lessonId` cards should render only for unlocked content.

---

### 7.6 Tier F — Print, email, and platform

| ID | Asset | Medium | Status | Notes |
| --- | --- | --- | --- | --- |
| F-001 | `cert-seal-print` | `svg-authored` | `ready` | 600 dpi variant of A-027; **grayscale-verified** — many printers are mono |
| F-002 | `cert-border` | `svg-authored` | `ready` | Inner rule frame for the diploma, print-safe margins (A4 + Letter) |
| F-003 | `cert-guilloche` | `svg-authored` | `ready` | Fine contour-derived security pattern at ≤ 4 % opacity. Decorative provenance, **not** a security claim |
| F-004 | `cert-watermark` | `svg-authored` | `deferred` | Only if forgery ever becomes a real concern; `/verify/:code` is the actual mechanism |
| F-005 | `rideplan-header` | `svg-authored` | `ready` | Printed Ride Plan header (DESIGN-003 §Journal specifies print for `ride_plan`) |
| F-006 | `rideplan-section-marks` | `svg-authored` | `ready` | Seven small marks for the capstone's seven sections |
| F-007 | `rideplan-checklist` | `svg-authored` | `ready` | Field-usable checkbox row treatment for the printed plan |
| F-008 | `rideplan-fold` | `svg-authored` | `deferred` | Fold guides for a pocket-format plan — nice, not needed |
| F-009 | `email-header` | `render-html` | `deferred` | Email infrastructure is a NON_GOALS §2 exclusion; registered so the asset is not forgotten when password reset lands post-launch |
| F-010 | `email-badge-earned` | `render-html` | `deferred` | Same |
| F-011 | `email-certificate` | `render-html` | `deferred` | Same |
| F-012 | `print-stylesheet-marks` | `svg-authored` | `ready` | Print-only rules and marks consumed by the shared `.ts-print-sheet` class |

> **F-009…F-011 are deliberately `deferred`, not omitted.** NON_GOALS §2 excludes
> email infrastructure from this build and README lists password reset as the
> first post-launch item. Registering the assets now means that when email
> arrives, its visual language is already decided rather than improvised.

---

### 7.7 Tier G — Field practice (games) and range art

Registered 2026-08-16 on integration of the GPT art pack (gpt-pack batches
01–10). The games section (`/games`, DESIGN-004 §Play) was built after the
original registry; these are its slots. Medium is `raster` (GPT Image via the
gpt-pack, reviewed against the §5 rubric, AVIF/WebP/PNG ladder) throughout.

| ID | Slot | Consumed by | Description |
| --- | --- | --- | --- |
| G-001 | `games-hero` | `GamesPage` header band, dark right-bleed | A practice range in a clearing: parked machine, marker-loop course, magenta start marker |
| G-002 | `games-card-sharp-round` | `GameCard` art thumb (sharp round) | Three fanned field cards, front one carrying a blaze with a checkmark |
| G-003 | `games-card-walkaround` | `GameCard` art thumb (walkaround order) | Top-down machine circled by a dashed five-stop loop, start stop magenta |
| G-004 | `games-card-replays` | `RangeHeader` medallion on `/games/replay/*` | A trail looping back to a magenta blaze — ride it again |
| G-005 | `games-empty` | `GamesPage` nothing-playable state | Blank diamond markers stacked against a post, waiting to be planted |
| G-006 | `games-locked` | `GamesPage` all-locked state | A gated range, marker outlines faded beyond the fence |
| G-007 | `moment-clean-run` | `CleanRun` banner default art (hunt/sort/match/order cleans) | A row of magenta targets along a trail, every one lit |
| G-008 | `moment-perfect-round` | `CleanRun` on `RoundPage` (perfect round) | One large magenta blaze with a checkmark over a calm range |
| G-009 | `og/og-games.png` | Static file in `web/public/og/` — per-route OG wiring pending (see E-010…E-024) | Night range with glowing markers, quiet left field for overlay type |

**R-001 … R-006 · Per-module range cards.** Square blaze-diamond emblems, one
per module, consumed by `GamesPage`'s module section headers (dynamic slot
`range-${moduleId}`). The diamond frame is part of the design (U4 exemption by
entry): they are range *badges*, not plates.

| ID | Slot | Emblem |
| --- | --- | --- |
| R-001 | `range-m1` | Forking trail |
| R-002 | `range-m2` | Utility ATV in profile |
| R-003 | `range-m3` | Full-face helmet |
| R-004 | `range-m4` | Nested contour rings |
| R-005 | `range-m5` | Cold front over rain |
| R-006 | `range-m6` | Road crossing, plan view |

---

## Part 8 — Execution plan

### 8.1 Ordering principle

Batch by **set**, never by tier and never by module. A set shares a set spec, so
generating it together is what produces coherence (clause C4). Generating
"everything for Module 3" mixes four sets and guarantees drift.

### 8.2 Waves

| Wave | Batch | Count | Why first / notes |
| --- | --- | --- | --- |
| **V1** | Wire the three orphans — C-013 (uses A-011), C-011 (uses A-012), C-014 (uses A-013) | 0 new | **Highest ROI in the whole document: three shipped plates currently render nowhere.** Pure integration, no generation. |
| **V2** | C-001…C-012 keylist diagrams | 12 | The largest teaching gain per asset. Freeze `SET-C-KEYLIST` on C-003 (T-CLOC) as the reference. |
| **V3** | C-120…C-134 hotspot insets | 15 | Upgrades the two showcase hotspot activities; must match existing base scenes exactly (C4). |
| **V4** | C-070…C-110 sort + match icons | 37 | One set spec, highly formulaic, ideal for parallel generation. |
| **V5** | B-043…B-060 activity + section marks | 18 | Small, formulaic, immediately visible in `StepRail`. |
| **V6** | B-001…B-022 lesson cards | 22 | Freeze on one module's four, then fan out. |
| **V7** | B-023…B-042, B-069…B-083 level/artifact/topic/XP | 40 | Independent sets, parallelisable. |
| **V8** | D-001…D-026 UI and moment art | 26 | Needs the app running to judge in situ. |
| **V9** | E-001…E-009 marketing (diffusion) | 9 | The tier the local pipeline was proven on. |
| **V10** | E-010…E-024 OG cards (`render-html`) | 15 | Depends on V9 art for insets. |
| **V11** | B-061…B-068 icons, F-001…F-012 print | 20 | Platform polish; F items need print proofs. |

### 8.2.1 The consumer audit — run this BEFORE briefing any wave

This registry specifies **259 rows**. That is a catalogue of what a course like
this *could* show, written before the product was fully wired. It is not a work
order, and treating it as one produces assets nothing renders.

After V1–V11 the manifest holds **172 slots (169 real), and every consumer that
requests art gets real art — zero missing slots, zero placeholders rendering
anywhere.** So run this audit and let it, not the row count, decide the work:

```
for every candidate row:
  1. Name the exact consumer — file and line. No consumer, no asset.
  2. Is that consumer FREE?
       occupied by an existing slot        -> SKIP (duplicate)
       occupied by a DESIGN spec           -> SKIP (displacing spec'd rendering
                                              with decoration is a design change,
                                              not an asset)
       the surface does not exist yet      -> SKIP (building art plus the surface
                                              to hold it is inventing scope)
  3. Does NON_GOALS bar it?
  4. Does the asset CLAIM something untrue? (see 5.4.1)
```

Applied to everything outstanding, the honest result was **8 assets, not 87**:

| Rows | Disposition |
| --- | --- |
| B-061…B-068 icons | **BUILD** — consumer verified free and genuinely learner-visible |
| C-020…C-038 callout vignettes (19) | SKIP — `CalloutCard` renders the DESIGN-002 3 px bar + semantic icon. That consumer is occupied by a spec, and these callouts carry the most careful prose in the course (§5.4.1) |
| D-012…D-016 state art (5) | SKIP — no such surfaces. Offline is an `OfflineBanner`, which is the *correct smaller* design; there is no 500 / rate-limit / timeout page |
| D-017…D-022 tutor art (6) | SKIP — occupied: `GroundingLabel` (DESIGN-002 dot + exact label), hat-glyph Ranger avatar, `TypingBubble` |
| E-001…E-003 marketing hero (3) | SKIP — occupied, the landing page already renders `hero-landing` |
| E-004…E-009 social cards (6) | SKIP — NON_GOALS §2 bars sharing feeds |
| F-003, F-004 guilloche + watermark | **REFUSE** — guilloche and watermarks are anti-counterfeiting ornament from government credentials. This certificate is explicitly *not* a licence and ships a disclaimer saying so. The art would contradict the copy. Same test as §5.4.1: ask what an asset **claims**, not what it depicts |
| F-009…F-011 email art (3) | SKIP — NON_GOALS §2 bars email infrastructure |

> **The count in this document is a ceiling, not a target.** A registry row is a
> hypothesis that art would help *somewhere*; the audit is what tests it. The
> governing rule is NON_GOALS' own: *every hour spent must move a learner-visible
> or tutor-visible outcome.* Shipping 87 unrendered files would move none.

### 8.3 Batch procedure

For each batch the orchestrator:

1. **Locks the set spec** and has the set lead render 2–3 references.
2. **Gets the references accepted** against [Part 5](#part-5--acceptance-rubric) — including C1–C5 between the references themselves. *Nothing else generates until this passes.*
3. **Fans out** one entry per generator, set spec frozen and attached.
4. **Runs the set critic** over the completed batch as one contact sheet.
5. **Integrates** per [Part 9](#part-9--integration) in a single commit.
6. **Records** one BUILDLOG line: batch, count, and any spec deviation.

### 8.4 Parallelism and throughput

Measured: ~30 s and 14.6 GB peak for one 90-step SDXL spread member on 23.9 GB.

- **Two concurrent pipelines fit in VRAM** (2 × 14.6 GB exceeds 23.9 GB — so
  *not* two full base+refiner pairs; run two processes sharing one loaded model,
  or serialise). The honest answer: **one model resident, batched prompts** is
  the throughput win, not two models.
- A batch of 8 seeds ≈ **4 minutes**. A 37-icon set at 6 seeds each ≈ **1.9 hours**
  of GPU time — but `svg-authored` sets (which most icons are) take zero GPU and
  are bounded by authoring, not compute.
- **The bottleneck is review, not generation.** Every asset needs a human-or-agent
  full-resolution read. Plan roughly **2–4 minutes of review per asset**; a
  37-asset batch is a ~2-hour review session regardless of how fast the GPU is.

> Do not let generation throughput outrun review capacity. Unreviewed assets are
> exactly the "screenshots nobody views" failure QA-001 warns about, and they
> will ship defects.

### 8.5 How this scales past 1000

The registry is ~265. Legitimate multipliers, in the order they should be taken:

| Axis | Multiplier | Legitimate? |
| --- | --- | --- |
| Delivery formats × widths | ×15 per raster asset (3 formats × 5 widths) | **Yes** — automatic, `export_final.py` handles it. This alone takes ~50 diffusion assets to ~750 files. |
| Dynamic OG templates rendered per entity | 22 lessons + 6 modules + 6 artifacts = 34 renders from 3 templates | **Yes** — templates, not assets. Register the template. |
| Per-option icons for all 39 MC options | ×39 | **No.** Knowledge-check options are prose arguments; icons would trivialise them and slow reading. |
| Per-corpus-chunk art (33 chunks) | ×33 | **No.** Chunks are tutor retrieval units, never rendered as cards. |
| Seasonal / weather hero variants | ×4 | **Only if** a real surface swaps them. No speculative variants. |
| Localised text-bearing art | ×N locales | **No** — NON_GOALS §2 excludes i18n. Text lives in HTML, so this axis is empty by construction. |
| A/B alternates for marketing | ×2 on E-001…E-009 | **Only with** a real experiment running. |

**The discipline that keeps this sane:** *files* may multiply freely (formats,
widths, template renders); *assets* may not. The registry counts assets. A build
that counts files and celebrates "1,200 assets" has learned nothing.

---

## Part 9 — Integration

Generation is half the job. An asset is not done until it renders in the app.

### 9.1 Wiring a slot asset

1. Write the SVG to `web/src/assets/svg/<slot>.svg`, or the raster ladder to `web/public/img/`.
2. Add the entry to `web/src/assets/manifest.json`:
   ```json
   "slot-name": {
     "status": "real",
     "file": "svg/slot-name.svg",
     "alt": "Describes the teaching content, not the decoration."
   }
   ```
3. `SlotArt` resolves it automatically — it eagerly globs `../assets/svg/*.svg`
   and reads `manifest.json` as the single source of truth. **No component change
   is needed** for a new slot.
4. Choose the render `ratio`. Default `3 / 2`; hotspot bases **must** be `5 / 3`.

### 9.2 Wiring a curriculum figure (Tier C)

Content is code (ADR-006), so a figure is a **content edit** parsed by the seed
pipeline, not a component change:

```json
{"type": "figure", "assetSlot": "keylist-tcloc", "caption": "Five zones, walked in the same order every ride — the order is what makes it a ritual."}
```

- Insert into the step's `blocks` array at the position the prose has earned it.
- The seed parser validates block shape and **fails loud** on a malformed payload
  — a content typo breaks the build rather than silently dropping a figure.
- Re-seed happens automatically on boot when the content hash changes
  (`course_meta.version`); `SEED_FORCE=1` forces it.
- **The `content/` directory is authored curriculum.** Adding a figure block is a
  content change and needs the same care as changing prose: one BUILDLOG line,
  and never alter the surrounding authored text to suit an image.

### 9.3 Alt text is not optional

DESIGN-001 requires alt text describing teaching content; R9.3 and the QA-004
keyboard/a11y pass both check it. The rule:

| Bad | Good |
| --- | --- |
| "ATV illustration" | "Side view of a utility ATV with its systems labelled: low-pressure tires, brake caliper, suspension, engine, frame, footwells, and racks." |
| "Diagram" | "Five T-CLOC zones arranged as a loop walked in fixed order, returning to the start." |
| "Decorative image" | (Then it should be `alt=""` and `aria-hidden` — and probably should not exist.) |

`BadgeMedal` is the correct existing pattern: decorative `alt=""` images inside
an `aria-hidden` span, wrapped by a `figure[role="img"][aria-label]` that carries
the real description once.

### 9.4 Performance gates

- Above-the-fold raster: **AVIF ≤ 120 KB at 1920w**, explicit `width`/`height`,
  `fetchpriority="high"`, **not** lazy.
- Below the fold: `loading="lazy" decoding="async"`.
- SVG plates: inline only when they need runtime recolour; otherwise `<img>` so
  they stay cacheable and out of the JS bundle.
- R9.2's 350 KB initial-JS budget is currently at 126–144 KB. **Do not inline SVG
  into components** casually — that moves image bytes into the JS budget.

---

## Part 10 — Verification

### 10.1 Per-asset gate

Every asset, before its status becomes `shipped`:

- [ ] Opened and read at **100 %** — not a thumbnail
- [ ] `zoom.py` run on its betrayal regions (hands, feet, joins, flat fields, small text-adjacent areas)
- [ ] Universal clauses U1–U10 pass
- [ ] Subject clauses S1–S6 pass (if it depicts a rider or machine)
- [ ] Safety clauses SF1–SF6 pass
- [ ] Its own entry's `Acceptance` field passes
- [ ] Alt text written and reviewed
- [ ] Sidecar provenance recorded
- [ ] Smallest intended render size checked **at that size**

### 10.2 Per-batch gate

- [ ] Contact sheet of the whole set reviewed for C1–C5
- [ ] Coordinate contracts re-verified by dot overlay (hotspot bases only)
- [ ] `manifest.json` audit: every `real` slot has a file that exists and non-empty alt
- [ ] `npx tsc --noEmit`, `npx eslint src`, `npm run build` clean
- [ ] Bundle delta checked against R9.2

### 10.3 Crawl integration

The visual crawl (QA-001, `qa/visual_crawl.py`) is already the product's primary
quality instrument and it photographs every route in every state. **New art
lands in the crawl automatically** — no manifest change is needed on the QA side.

After any asset batch:

1. Boot the stack with `FIXTURES=1`, run the crawl.
2. Review the run as a numbered pass with a `REVIEW.md`, exactly as
   `artifacts/crawl/pass-*/` already does.
3. A new asset that degrades a screen is a **P1** and reverts.

This also catches the failure mode a per-asset gate cannot: art that is fine
alone and wrong in place — too heavy behind text, wrong crop at a real ratio,
or fighting an adjacent component.

### 10.4 The scripted checks worth having

Cheap, deterministic, and inside the QA-003 budget because they are **not tests
of the app** — they are asset lint:

| Check | Rule |
| --- | --- |
| Manifest integrity | Every `status: real` slot has an existing file and non-empty alt |
| Orphan detection | Every `real` slot is referenced by some component, page, or curriculum payload |
| Coordinate contract | Dot overlay on hotspot bases lands on-feature |
| Palette conformance | Every colour in an SVG is a DESIGN-001 token (± anti-aliasing) |
| Budget | Plates ≤ 25 KB, badges ≤ 8 KB, hero AVIF ≤ 120 KB at 1920w |
| Text ban | No `<text>` elements in any plate |

> **Orphan detection would have caught three shipped-but-unused plates**
> (A-011, A-012, A-013) months earlier. It is six lines of script.

---

## Appendix A — Measured settings reference

Verbatim, from the run that produced the accepted asset.

```
GPU              RTX 5090 Laptop, 23.9 GB, sm_120 (Blackwell), driver 581.80
torch            2.11.0+cu128          # cu124 will NOT run on sm_120
env              D:\imagegen\.venv     # separate from server/.venv (CPU torch)
HF_HOME          D:\imagegen\hf        # keep off C:

base             stabilityai/stable-diffusion-xl-base-1.0
refiner          stabilityai/stable-diffusion-xl-refiner-1.0
dtype            float16, variant="fp16"
steps            90
guidance_scale   7.5
denoising_split  0.8
resolution       1216 x 832
prompt encoder   compel, truncate_long_prompts=False
                 -> 231 tokens / 3 windows for the reference prompt

measured         ~29-30 s per image, 14.6 GB peak VRAM
refinement       img2img on the refiner, strength swept 0.25 / 0.35 / 0.45
                 -> 0.35 chosen (cleanest lines, boot definition gained)
finishing        measured crop -> 1 surgical inpaint -> Lanczos x4 -> unsharp 0.35 / 1.2 px
                 NO bilateral, NO denoise, NO palette surgery
export           AVIF q72 + WebP q92 + PNG, widths 1920/1600/1200/800/400
```

## Appendix B — The reference prompt

The accepted prompt from the smoke test. Use it as the starting scaffold for
every `SET-E-HERO` entry; change the subject bands (3–6), keep the rest.

**Positive** (bands per [§4.2](#42-prompt-ordering)):

```
flat vector illustration, clean side profile view,
one adult rider seated upright on a four-wheeled quad ATV,
full body visible from helmet to boots,
white full-face motocross helmet with a dark tinted visor,
deep spruce green long-sleeve riding jersey,
charcoal black riding pants clearly darker than the jersey,
black gloves closed around the handlebar grips,
black boot planted flat on the footpeg, knee bent,
the machine is deep spruce green and glacier white with four black knobby tires,
level dirt trail, a few large flat pine tree silhouettes behind,
flat colour fills, hard crisp vector edges, thick dark outlines,
limited palette of deep spruce green, night navy, fireweed magenta, sage mint, glacier white, charcoal,
geometric simplified shapes, modern editorial field guide plate,
adobe illustrator vector artwork, screen print poster,
generous clean negative space, calm balanced composition
```

**Negative:** the [standard block](#44-the-standard-negative-block) verbatim.

**Known limitation carried by this prompt:** the jersey/pants colour separation
clause **does not land** — SDXL renders the rider as one colour across every seed
tried. [§4.6](#46-when-the-model-refuses) applies; the accepted asset ships a
coherent one-piece rust riding suit. Do not spend rounds re-litigating this.

## Appendix C — Failure catalogue

Every failure observed during the smoke test, with its tell and its fix. Check
here **before** diagnosing a new problem.

| # | Failure | Tell | Fix |
| --- | --- | --- | --- |
| F1 | Silent prompt truncation | Style instructions ignored; images look "generic" no matter the seed | `compel`; log token count |
| F2 | Extra wheels / limbs | Count is wrong on inspection, often missed on a thumbnail | Reject the seed; state counts positively **and** negatively |
| F3 | Painterly instead of flat | Airbrushed edges, brush texture, speckle | Check F1 first — the style clause probably never arrived |
| F4 | Bare hands / missing gear | Semantic miss on a safety-critical noun | Promote to its own clause near the front; add the inverse to negatives |
| F5 | Baked poster border | A beige/white mount inside the image | Measure the mount from corner colour and crop; do not infer from a keyline |
| F6 | Rainbow/colour speckle | Small saturated blob in a flat field | Locate with connected components, inpaint **one** window |
| F7 | Over-retouching | White smears; edges gone soft; worse than the input | Revert. Remove exactly one located component; never blanket-sweep; never bilateral |
| F8 | Crop beheading the subject | Helmet or wheels clipped | Measure from the mount, not the keyline |
| F9 | Anti-aliasing read as artifacts | Detector reports 30–400 "specks" | Cross-reference against the known artifact coordinate; AA is not an artifact |
| F10 | Colour separation refused | Two regions stay one colour across all seeds | Re-spec structurally, or move to `svg-authored` |
| F11 | Model gated | `GatedRepoError 401` | Use SDXL; FLUX needs a HF token |
| F12 | Broken package metadata | `Invalid version: None` on import | A stale `*.dist-info` without `METADATA` — remove it and reinstall. Caused by installing while another process holds the DLLs |
| F13 | **Spatial claim ignored** | A beautiful, coherent image that is simply *the wrong picture* — no junction where a junction was asked for, an upright machine where a downed one was asked for | Not a prompt bug. Re-spec to `svg-authored` per [§6.5](#65-the-spatial-claim-rule-learned-the-expensive-way). Survives thumbnail triage, so catch it by checking the entry's `Acceptance` clauses explicitly rather than asking "does this look good" |
| F14 | compel dual-encoder padding crash | `AttributeError: 'EmbeddingsProviderMulti' object has no attribute 'empty_z'` from `pad_conditioning_tensors_to_same_length` | Only fires when prompt and negative land in a **different** number of 77-token windows — so a hand-tuned prompt of similar length to its negative hides the bug. Pad manually with the encoding of `""`; see `gen_batch.py:pad_pair` |

## Appendix D — Coordinate contracts (consolidated)

The only assets in the product where art must satisfy numbers. These
percentages are **authored curriculum** and are off-limits — if a marker misses,
the art moves.

**`scene-atv-anatomy`** (A-008) — 500 × 300, `ratio="5 / 3"`, step `m2-l1-s2`

```
tires (22,72)   handlebars (55,22)   brakes (30,62)    suspension (38,58)
engine (48,50)  footwells (62,68)    racks (82,38)     chassis (58,55)
```

**`scene-trail-hazards`** (A-009) — 500 × 300, `ratio="5 / 3"`, step `m4-l1-s2`

```
crest (16.6,11.4)     side_slope (18.9,46.6)  shadow_rut (40,62)
wet_clay (44.9,84.6)  loose_over_hard (74.2,54.2) deadfall (79.1,31.5)
soft_edge (67.7,83.5)
```

> **2026-08-21 — `scene-trail-hazards` re-measured.** The hunt base became a GPT raster (batch 13) cropped 5:3 from the top of a 1536×1024 source. Six of the seven percentages above were re-measured to the new plate's features (`shadow_rut` unchanged) and written into `m4-l1-s2` by owner decision, recorded in BUILDLOG. The crop (0,0,1536,922) and these numbers are now one contract: change either and re-measure the other.

> The `3 / 2` vs `5 / 3` ratio bug shipped once and drifted every marker ~2–3 %
> off its feature. It was caught by a playthrough, not by a unit test. The dot
> overlay in [§10.4](#104-the-scripted-checks-worth-having) is the cheap guard.

## Appendix E — Naming and index conventions

**File naming**

```
<family>-<subject>[-<variant>].<ext>
  hero-m4-terrain.svg          slot art, family "hero"
  badge-b-scholar.svg          slot art, family "badge", uses the SPEC-009 badge id
  keylist-tcloc.svg            curriculum figure
  sort-gear-helmet.svg         set + activity + item
  hero-atv-rider-1600w.avif    raster ladder: intrinsic width descriptor
```

- Slot names in `manifest.json` are the **contract**; filenames follow them.
- Raster widths use the `NNNNw` descriptor so `srcset` is unambiguous.
- Never encode a *use* in a name (`hero-landing`, not `hero-top-of-homepage`) —
  uses change, subjects do not.

**Registry index**

| Range | Tier | Count |
| --- | --- | --- |
| A-001 … A-027 | Core slots | 27 |
| B-001 … B-083 | Structural | 83 |
| C-001 … C-134 | Curriculum figures | 95 |
| D-001 … D-026 | UI / state / moment | 26 |
| E-001 … E-024 | Marketing / social | 24 |
| F-001 … F-012 | Print / email / platform | 12 |
| | **Total** | **267** |

> C-series IDs are **sparse by design** — gaps at C-015…C-019, C-039, C-044…C-049,
> C-056…C-069, C-096…C-099, C-111…C-119 leave room for each set to grow without
> renumbering. 95 entries occupy the C-001…C-134 range.

## Appendix F — Machine-readable batch contract

This document is the specification; an orchestrator turns a slice of it into a
job. Deriving this by hand for each batch is fine — the point is that a
generating agent receives **exactly** these fields and nothing else, so its
output is determined by the spec rather than by its own taste.

```jsonc
{
  "batch": "V2-keylists",
  "setSpec": {
    "id": "SET-C-KEYLIST",
    "medium": "svg-authored",
    "canvas": { "w": 720, "h": 400, "ratio": "9 / 5" },
    "ground": "#F9FCFA",
    "line": { "weight": 1.5, "color": "#0D1E2E" },
    "palette": ["#0D1E2E","#2F6B52","#ABCDB8","#ECF3EF","#F9FCFA","#B5446E"],
    "accent": { "token": "clay-500", "hex": "#B5446E", "maxUses": 1 },
    "textAllowed": false,
    "budgetKB": 25,
    "referenceAssets": ["C-003"]          // frozen look; generate these FIRST
  },
  "entries": [
    {
      "id": "C-003",
      "slot": "keylist-tcloc",
      "outPath": "web/src/assets/svg/keylist-tcloc.svg",
      "consumedBy": { "step": "m2-l3-s1", "block": "figure" },
      "teachingIntent": "Order is the mechanism — a fixed walk turns the rider into a change detector.",
      "structure": "ordered-loop",
      "elements": [
        "T — Tires & wheels", "C — Controls & cables", "L — Lights & electrics",
        "O — Oil & fuel", "C — Chassis"
      ],
      "accentOn": "the start station, to show where the loop begins",
      "acceptance": [
        "five stations legible, in fixed order",
        "return arrow closes the loop",
        "no text glyphs anywhere",
        "a reader of m2-l3-s1 can name each station by position"
      ],
      "alt": "Five T-CLOC zones arranged as a loop walked in fixed order around a machine, returning to the start."
    }
    // … one object per registry entry in the batch
  ],
  "gates": {
    "universal": ["U1","U2","U3","U4","U5","U6","U7","U8","U9","U10"],
    "subject":   [],                       // no riders/machines in this set
    "safety":    ["SF1","SF2","SF3","SF4","SF5","SF6"],
    "setLevel":  ["C1","C2","C3","C4","C5"]
  },
  "onFailure": "return the defect classified per §2.4; do not ship a partial"
}
```

**Field contract for a generating agent**

| Given | The agent must NOT |
| --- | --- |
| `setSpec` | Alter canvas, palette, line weight, or accent budget |
| `teachingIntent` | Substitute its own interpretation of what the image teaches |
| `elements` | Add, drop, or reorder elements |
| `acceptance` | Declare success without checking every clause |
| `alt` | Ship without it |

If any field is missing or ambiguous, the correct response is to **stop and ask
for the spec to be completed** — not to fill the gap with a guess. A guess that
looks fine is how a set drifts.

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-08-06 | Created. 267 assets registered across six tiers. Pipeline, agentic procedure, acceptance rubric, and failure catalogue derived from the `hero-atv-rider` smoke test on the local RTX 5090 SDXL pipeline. Three orphaned shipped plates found (A-011 `scene-helmet-fit`, A-012 `scene-crossing`, A-013 `scene-loading-cargo`) — shipped in Wave 2, referenced by nothing — and wired via C-013 / C-011 / C-014 respectively. SPEC-007's `figure` block found to be used **zero** times across 18 content steps, which is what Tier C exists to fix. |
| 2026-08-16 | **GPT art pack integrated** (gpt-pack batches 01–10, 99 images, each reviewed against §5 at full size). 83 slots now `raster` ladders: all 9 heroes re-rendered (A-001…A-007, B-082/083 — A-007 finally renders the trail-meets-road relationship §6.5 said diffusion couldn't), 20/22 lesson cards, 13/15 hotspot insets, 5/6 scenario plates, 11 callout vignettes (C-020…C-030, C-035 — the first Tier C figures to ship), moments D-007…D-011, states D-012…D-016 (D-016 replaces the greyed summit-approach on the locked assessment per §5.4.1), new Tier G (games) + R-series range cards (§7.7). Marketing E-001…E-009 + G-009 exported to `web/public/og/` as files; per-route OG wiring still pending (E-010…E-024 `render-html`). **Six rejects, re-roll queued:** C-033 (brand letterforms, U3), C-037 (unreadable at 5:3), B-005 (two-panel mud at 96 px), B-006 (four T-CLOC stops — contradicts the five the course teaches and G-003 draws), C-127 (metallic greys, U2), C-055 (phone-screen letterforms, U3). Their slots keep the shipped SVGs. C-054 reviewed against §5.4.1 and shipped: seated rider, helmet on, gear intact — calmer than its prose. Vite `assetsInlineLimit: 0`: 472 KB of base64 plates left the JS bundle (§9.4 enforced by config, not convention). |
| 2026-08-21 | **Batch 13 integrated — modules 3–6 figure plates.** Eleven GPT images (Codex $imagegen, `artgen/incoming/batch-13/`) reviewed at full size against Part 5 and the batch-13 checklist; all eleven accepted with residuals recorded in each manifest note. Slots now raster: A-011 `scene-helmet-fit`, A-009 `scene-trail-hazards` (coordinate contract re-measured, Appendix D), C-006 `keylist-stability-model`, C-007 `keylist-four-families`, C-008 `keylist-before-you-go`, C-055 `scenario-one-bar` (the batch-11 re-roll, finally), C-010 `keylist-pavement-physics`, A-012 `scene-crossing`, A-013 `scene-loading-cargo` (5:2 crop for the host slot), C-012 `keylist-three-standards`, C-009 `keylist-stop-assess-communicate` (raster fallback; the animated SVG in `artgen/VISUAL_AUDIT_M3-M6.md` §5.9 remains the intended end state). Six keylist+figure pairs (C-006/007/008/010/011/012) became `hotspot_figure` blocks on the `keylist-tcloc` pattern: terms and details verbatim, medallion centres measured, no magenta in the art. Retired SVGs kept in `svg/`. Verified on the production build: lint 217/212/0/0, tsc + vite clean, seed tests green, 30 step screenshots (desktop + mobile) reviewed, zero page errors. Audit and prompt pack: `artgen/VISUAL_AUDIT_M3-M6.md`, `artgen/gpt-pack/batches/batch-13-images-only.md`. |
