# DESIGN-005 — Empty, Loading, Error States

R9.1: zero browser-default surfaces. Every state below is designed copy +
composition. Voice: direction, not mood; errors never apologize twice or get
vague.

## Empty states (EmptyState component; copy is final — use as written)
| Surface | Heading | Body | Action |
| --- | --- | --- | --- |
| Journal (no artifacts) | "Your field journal is empty" | "As you work through the course you'll build a risk profile, a gear card, an inspection log, and more — they all live here." | "Start Module 1" |
| Tutor first-run | "Meet Ranger" | "Ask anything about ATV or road safety. Ranger knows this course inside out — and plenty beyond it, and will tell you which is which." | 3 suggested prompts |
| Progress (no XP) | "No miles on the odometer yet" | "Complete your first lesson to start earning XP." | "Go to the course" |
| Instructor (no learners) | "No learner data yet" | "Stats appear once the first learners register and start Module 1." | — |
| Search-empty patterns | n/a in this build | | |

## Loading
- Per-page skeletons mirroring real layout (Dashboard: greeting bar + continue
  card block + three tiles; Lesson: rail + stage block; Tutor: two message
  blocks). Appear only after 150ms delay (avoid flash).
- Tutor answer pending: Ranger typing bubble (DESIGN-004).

## Errors (copy final)
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
"Invalid".
