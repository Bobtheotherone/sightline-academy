# DESIGN-005 — Empty, Loading, Error States (v2)

> **v2 supersedes v1** (2026-08-10, owner directive). The copy tables below are
> **retained verbatim from v1** — the words shipped, they're right, and R9.1
> (zero browser-default surfaces) still governs. What v2 rewrites is the
> *presentation law* around them: states are staged with the same depth and
> choreography as the rest of the product, so an empty page still feels like a
> designed place, never a dead end.

## Presentation law (new)

- Every EmptyState composition: art rises first (`Reveal`), heading and body
  stagger after, action last. The art sits free on the ground wash (no box).
- Empty surfaces still compose their band: header cluster + EmptyState in the
  content slot — the chrome never collapses to a lonely centered card.
- Skeletons: layout-shaped, appear after 150ms, reserve real height (the CLS
  fix is law), shimmer 1.6s, and hand off to content with a 240ms crossfade —
  content never pops in over a collapsed gap.
- Error surfaces are calm: semantic tint ground (`danger-100`/`sun-100`) +
   icon, no full-red panels, no shake except form submit-with-error (once).
- Offline banner slides down/up at `base` (never pops), auto-dismisses on
  reconnect.

## Empty states (EmptyState component; copy final — use as written)

| Surface | Heading | Body | Action |
| --- | --- | --- | --- |
| Journal (no artifacts) | "Your field journal is empty" | "As you work through the course you'll build a risk profile, a gear card, an inspection log, and more — they all live here." | "Start Module 1" |
| Tutor first-run | "Meet Ranger" | "Ask anything about ATV or road safety. Ranger knows this course inside out — and plenty beyond it, and will tell you which is which." | 3 suggested prompts |
| Progress (no XP) | "No miles on the odometer yet" | "Complete your first lesson to start earning XP." | "Go to the course" |
| Instructor (no learners) | "No learner data yet" | "Stats appear once the first learners register and start Module 1." | — |

## Loading

- Per-page skeletons mirroring real layout (Dashboard: greeting bar + continue
  block + bento tiles; Lesson: rail + stage block; Tutor: two message blocks).
- Tutor answer pending: Ranger typing bubble (DESIGN-004).

## Errors (copy final — retained verbatim)

| Case | Treatment |
| --- | --- |
| Network down | Top banner: "You're offline. Sightline Safety Academy will reconnect automatically." (auto-retry ping; banner dismisses itself) |
| API 500 | Toast: "Something broke on our side. Your progress up to now is saved." + incident id small print |
| Evidence save failed after retry | Inline on the step footer: "That answer didn't save — check your connection and try again." (Continue stays disabled) |
| Tutor timeout | Ranger bubble: "That one took too long on my end. Ask again — I'm still here." with a retry button |
| Login wrong creds | Inline: "That email and password don't match." |
| Rate limited | Inline: "Too many attempts. Take a breather — try again in about 10 minutes." |
| 404 | Page: "This trail doesn't exist." + "Back to your dashboard" |
| Locked module direct visit | Page: "You haven't unlocked this yet" + "Finish <module title> first — you're <n> lessons away." + link |
| Delete account modal | Title "Delete your account?" Body: "This permanently removes your progress, journal, XP, and certificate eligibility. There's no undo." Confirm requires typed email. Buttons: "Delete forever" (danger) / "Keep my account" |

## Form validation

Inline under field, on blur + on submit; error color danger-600 with icon;
messages name the fix ("Password needs at least 10 characters"), never just
"Invalid". One shake on submit-with-error, then still.
