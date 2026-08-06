# ADR-004 — RAG Architecture

**Status:** Accepted

## Decision

- **Corpus:** `content/corpus/*.md`, each file = one knowledge doc with YAML
  front-matter (id, title, topic, tags, module_refs, source_basis). Docs are
  pre-chunked by authorship (150–400 words each) — the ingester does NOT
  re-split them; one file = one Chroma document. (RAG_CORPUS/README.md defines
  the schema.)
- **Ingestion:** `server/ingest/ingest.py` — parse front-matter, embed with
  all-MiniLM-L6-v2, upsert into Chroma collection `sightline_corpus` with
  metadata `{topic, tags, module_refs, title}`. Idempotent (stable IDs from
  front-matter `id`); run at container start when the collection count doesn't
  match the corpus file count, and runnable manually.
- **Retrieval:** query embedding → top-k (k=6) similarity search → keep results
  above a *soft* floor (distance-based; tune once, record in BUILDLOG) → dedupe
  by topic to at most 2 chunks per topic → pass up to 4 chunks to generation.
- **Context assembly:** system prompt (STARTER/tutor_system_prompt.md) +
  curriculum map (module/lesson titles, auto-generated at boot) + learner
  position (current module/lesson, if authenticated) + retrieved chunks with ids
  + last 10 conversation turns.
- **Generation:** provider adapter (ADR-001). Response is shaped into
  `{answer_markdown, sources[], grounding: "curriculum"|"general"|"mixed", suggestions[]}`.

## Why

Authored chunks beat automatic splitting for a corpus this size (quality and
citability). Local embeddings keep the loop offline-capable. The soft floor +
"grounding" field implements ADR-005: low retrieval relevance changes the
*labeling* of the answer, never whether the tutor helps.
