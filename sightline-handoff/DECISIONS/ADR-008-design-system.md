# ADR-008 — Design System Source of Truth

**Status:** Accepted

## Decision

The visual identity is fully specified in `DESIGN/DESIGN-001-brand-and-tokens.md`
and the machine-readable `STARTER/design-tokens.css`. Implementation rules:

- Tokens file is imported once; **no raw hex values in components** — Tailwind
  is configured to expose the tokens (CSS variables) as theme colors.
- Components are built once in `web/src/components/` per DESIGN-002's inventory
  and reused; pages compose components. Any visual pattern used twice becomes a
  component.
- Typography: display face **Bricolage Grotesque**, body **Inter**, data/mono
  **JetBrains Mono** — self-hosted via `@fontsource` packages (no external font
  CDN at runtime).
- The look is NOT any stock template look: DESIGN-006 contains the concrete
  anti-generic rubric the Design QA lane enforces on every crawl.

## Why

A single token source + component inventory is what makes "polished everywhere"
achievable by parallel lanes: polish applied at the system level propagates to
every page, and pages built by different lanes still look like one product.
