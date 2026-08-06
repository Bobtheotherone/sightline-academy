# KICKOFF PROMPT

Paste everything inside the fence below as the first message to the build agent
(Claude Code or equivalent), with the `sightline-handoff/` folder present in
the workspace. It is intentionally short: its whole job is to hand authority to
the folder.

```text
You are building Sightline Safety Academy, a world-facing online ATV & road safety learning
platform with an integrated RAG AI tutor. A complete, pre-decided handoff
package is in ./sightline-handoff — treat it as the single source of truth
and authority for this build.

Do this, in order:

1. Read ./sightline-handoff/START_HERE.md and follow its reading order in
   full before writing any code. The ADRs in DECISIONS/ are settled — do not
   relitigate them. NON_GOALS.md is binding.

2. Orchestrate the build exactly per AGENT_OPERATIONS.md: its lanes, waves,
   budgets, and anti-stall directives. Create BUILDLOG.md at the repo root in
   your first commit and keep it to one line per decision or deviation — that
   file is the entire governance system; build no other process.

3. Content is provided, not invented: seed CURRICULUM/ and RAG_CORPUS/corpus/
   verbatim through the pipelines specified in SPEC-003 and ADR-004/ADR-006.
   Copy the STARTER/ files to their destinations listed in STARTER/README.md;
   they are binding reference implementations, not suggestions.

4. Visual quality is a hard requirement, verified continuously: after every UI
   milestone run the screenshot crawl (STARTER/visual_crawl.py against
   STARTER/route-manifest.json), open and review the images against
   DESIGN-003 and DESIGN-006, fix what looks unfinished, and re-crawl. A
   screen that fails the anti-generic checklist is not done.

5. Verification is capped by QA-003: smoke tests, the user-journey tests in
   QA-002, the six tutor acceptance questions in SPEC-008, the safety-triage
   fixtures shipped inside STARTER/safety_policy.json, and the visual crawl.
   Nothing beyond that budget.

6. The app must run keyless (extractive tutor fallback per ADR-005 /
   STARTER/tutor_pipeline.py) and fully via docker compose up per SPEC-012.
   Definition of done for the whole project is at the end of START_HERE.md —
   meet it, demo it, stop.

If a spec answers a question, that is the answer. If specs are silent, make
the smallest choice consistent with the ADRs, log one BUILDLOG line, and keep
moving. Do not stop to ask questions; do not invent scope; do not add
processes. Begin with Wave 0.
```

## Notes for the human launching this

- If your build tool supports a working-directory argument, launch it at the
  repo root with `sightline-handoff/` already unzipped inside.
- If you want to supply an Anthropic API key for the live tutor, set
  `ANTHROPIC_API_KEY` in the environment per SPEC-012 before the build's Wave 1
  — but the build must not require it (keyless mode is a hard requirement).
- Mid-build check-ins: ask the agent for `BUILDLOG.md` and the latest
  `qa/crawl-runs/` folder. Those two artifacts are the honest state of the
  build.
