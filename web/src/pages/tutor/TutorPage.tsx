/* /tutor — the full-height Ranger chat page (DESIGN-003 §Tutor). The chat
 * surface itself is shared with the AppShell slide-over (TutorChat). v2: the
 * conversation column stays at the 760px reading measure and the page ground
 * carries the contour texture, so wide viewports read as textured margins
 * rather than blank ones.
 *
 * Height containment starts at lg — exactly where the bottom tab bar stops.
 * Below it the column flows in the document like every other route, so the
 * shell's tab-bar clearance still lands under the AppFooter instead of the
 * chat over-committing the shell column and pushing the footer behind the bar.
 */
import TutorChat from "./TutorChat";

export default function TutorPage() {
  return (
    <div className="ts-contour flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lesson flex-col px-6 pt-6 lg:min-h-0 lg:flex-1">
        <TutorChat variant="page" className="lg:min-h-0 lg:flex-1" />
      </div>
    </div>
  );
}
