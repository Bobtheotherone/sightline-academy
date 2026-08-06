# ADR-006 — Content as Code

**Status:** Accepted

## Decision

All curriculum and corpus content lives as structured Markdown in `content/`,
versioned in git, parsed into the DB by a deterministic seed pipeline at boot
(when the course tables are empty or `SEED_FORCE=1`). There is no CMS, no admin
content editor, no content stored only in a database.

The authoring format (front-matter + fenced `activity` JSON blocks + section
markers) is defined once in `CURRICULUM/CURRICULUM-000-overview.md §Authoring
format` and the seed parser conforms to it exactly. The parser fails loudly on
malformed content at boot — a content typo should break the build, not silently
drop a lesson.

## Why

v1 lost its content because it lived in an un-versioned DB export. Content in
git is diffable, reviewable by the professor, and can never be lost. It also
makes the RAG corpus and the curriculum share one workflow.
