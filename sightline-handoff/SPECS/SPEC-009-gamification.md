# SPEC-009 — Gamification, XP, Badges, Certificate

Gamification makes progress *visible and meaningful*. It never manufactures
pressure. The v1 safety-XP philosophy survives intact.

## XP rules (server-authoritative, `services/xp.py` — unit-tested per QA-003)

| Event | XP | Fires when |
| --- | --- | --- |
| `step_complete` | 5 | Any required step completes (once per step) |
| `lesson_complete` | 25 | Lesson completes |
| `checkpoint_first_try` | 15 | Checkpoint MC best answer on first attempt |
| `module_complete` | 75 | Module completes |
| `journal_artifact_complete` | 30 | Artifact reaches complete |
| `scenario_best_path` | 10 | branching_decision traversed with all-best choices at least once (revisits count) |
| `lab_objectives_met` | 20 | lab_objective completes |
| `capstone_complete` | 100 | Ride Plan complete |
| `final_assessment_passed` | 150 | Final ≥80% |
| `tutor_first_question` | 5 | First-ever tutor message (once per account) |

**Forbidden signals — enforced in code (throw if metadata contains them):**
`speed`, `time_to_complete`, `fastest`, `streak`, `rank`, `leaderboard`,
`risky_choice_bonus`. XP is never awarded for choosing a `risky` branch option
and never scaled by completion time. There is no public ranking of any kind.

## Levels
Level thresholds: cumulative 0 / 100 / 250 / 450 / 700 / 1000 / 1400 with trail
titles: Trailhead, Greenhorn, Pathfinder, Trailhand, Ridge Runner, Wayfinder,
Trail Boss. Level ring + title on Dashboard; level-up gets a designed toast
moment (DESIGN-004), never a blocking modal.

## Badges (awarded automatically; art via slot names, DESIGN-002)
| Badge id | Name | Trigger |
| --- | --- | --- |
| `b-mindset` | Clear Eyes | Complete Module 1 |
| `b-mechanic` | Walkaround Ready | Complete Module 2 |
| `b-geared` | Geared Up | Complete Module 3 |
| `b-terrain` | Terrain Reader | Complete Module 4 |
| `b-prepared` | Storm Smart | Complete Module 5 |
| `b-roadwise` | Road Wise | Complete Module 6 |
| `b-journal` | Field Scribe | All 6 journal artifacts complete |
| `b-scholar` | Sharp Eye | 10 checkpoint first-try bests |
| `b-graduate` | Sightline Safety Academy Graduate | Certificate issued |

## Certificate (R6.2)
- Issued on final-assessment pass; code = 10-char crockford-base32, unique.
- Certificate page: full-bleed designed layout (DESIGN-003 §Certificate) with
  name, course title, date, code, verification URL, and this exact disclaimer:
  > "Sightline Safety Academy is an online awareness and judgment course. This certificate
  > recognizes completion of the Sightline Safety Academy ATV & Road Safety Course. It is not a license,
  > legal certification, or a substitute for hands-on rider training. For
  > hands-on training, seek a qualified in-person course in your region."
- Print stylesheet (A4/Letter, no chrome). `/verify/:code` (public) confirms
  validity with name + date only.
