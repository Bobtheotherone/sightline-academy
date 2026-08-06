# RAG_CORPUS — Ranger's Knowledge Base

This folder is the tutor's retrieval corpus. Copy `corpus/` verbatim to
`content/corpus/` (ADR-006); `server/app/ingest/ingest.py` loads it into the
ChromaDB collection `sightline_corpus` (ADR-004). **Do not re-chunk these
files** — each file is one deliberately-sized chunk (150–400 words), authored so
that any single chunk is a coherent, self-contained answer ingredient.

## File schema (BINDING)

Each `corpus/*.md` file:

```
---
id: unique-slug            # becomes the Chroma document id
title: Human title         # shown as a SourceChip label in the tutor UI
topic: one-of-topic-list   # used by topic-dedupe in retrieval shaping (ADR-004)
tags: [comma, list]        # free keywords, embedded with the body
module_refs: [m1-...]      # [] allowed — general chunks beyond the curriculum
source_basis: short note   # provenance of the safety practice, for humans
---
Body: 150–400 words of original prose. No headings, no lists deeper than one
level, no images. Written to be quotable by an LLM in one or two sentences.
```

Topics in use: `mindset`, `machine`, `gear`, `terrain`, `environment`,
`roads`, `general`. Retrieval shaping keeps ≤2 chunks per topic (ADR-004), so
topics are how we prevent six near-duplicate machine chunks from crowding out a
relevant roads chunk.

## Coverage map

- Curriculum-aligned chunks carry `module_refs` and let Ranger cite the course
  (`curriculum` grounding, SPEC-008).
- General chunks (`module_refs: []`) extend Ranger beyond the course — road
  sharing from the driver's side, maintenance between rides, group riding,
  stewardship — so honest `general`/`mixed` grounding labels still come with
  substance instead of a shrug.
- Nothing in this corpus contains operating technique instruction, stunt
  content, or jurisdiction-specific legal claims. If you add chunks (allowed,
  BUILDLOG it), hold that line and stay inside the schema.

## Acceptance tie-in

SPEC-008's six acceptance questions assume this corpus: T-CLOC (Q1) must
retrieve `tclot-walkaround` category content; pavement-why (Q3) must retrieve
the roads chunks. If you rename ids, update nothing else — ids are only surfaced
to humans through SourceChips and ingest logs.
