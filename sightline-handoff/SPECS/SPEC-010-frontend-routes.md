# SPEC-010 — Frontend Route Manifest

Every route the app has. This table IS the crawl target list — it is mirrored in
machine-readable form at `STARTER/route-manifest.json`, which the visual crawl
consumes. Add a route → update both in the same commit.

## Public shell (minimal chrome: logo, login/register links)

| Route | Page | Key states to verify |
| --- | --- | --- |
| `/` | Landing | default; scrolled (module overview + tutor teaser sections) |
| `/login` | Login | default; invalid credentials; rate-limited |
| `/register` | Register | default; validation errors; duplicate email |
| `/verify/:code` | Certificate verify | valid; invalid code |

## App shell (top nav: Course, Journal, Progress, Ranger; user menu; tutor slide-over trigger)

| Route | Page | Key states to verify |
| --- | --- | --- |
| `/dashboard` | Dashboard | first-run (0 progress); mid-course ("Continue" card, recent XP); graduate |
| `/course` | Course map | mixed locked/unlocked; all complete |
| `/course/:moduleId` | Module overview | not-started; partial; complete (badge shown); locked (direct-URL visit shows designed locked state) |
| `/learn/:lessonId` | Lesson player | each of the 12 renderers (route to instances listed in route-manifest.json); continue-disabled state; section interstitial; lesson-complete screen |
| `/journal` | Field Journal | empty; 2 drafts; all complete |
| `/journal/:artifactType` | Artifact detail | draft; complete; ride_plan with prefills |
| `/progress` | Progress & badges | early; late (badges earned, level ring) |
| `/assessment` | Final assessment | locked; intro; in-progress; results pass; results fail (module review interstitial) |
| `/certificate` | Certificate | issued; not-yet (designed "finish the course" state); print preview |
| `/tutor` | Ranger full page | first-run intro; active conversation (incl. all four grounding/triage message treatments); offline-mode header; long history scroll |
| `/account` | Account | default; delete-confirm modal |
| `/instructor` | Instructor overview | with data; non-instructor visit (designed 403) |
| `*` | Not found | designed 404 with way back |

## Cross-cutting states (crawl captures on representative routes)
- Loading skeletons (throttled network), error toast (killed API), network-down
  banner, mobile 375px versions of: dashboard, course, one lesson w/ sort
  activity, journal, tutor.
