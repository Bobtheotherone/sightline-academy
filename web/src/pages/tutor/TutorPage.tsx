/* /tutor — the full-height Ranger chat page (DESIGN-003 §Tutor). The chat
 * surface itself is shared with the AppShell slide-over (TutorChat).
 */
import TutorChat from "./TutorChat";

export default function TutorPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-6 pt-6">
      <TutorChat variant="page" className="flex-1" />
    </div>
  );
}
