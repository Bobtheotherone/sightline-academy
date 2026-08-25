import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { matchPath, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Map,
  NotebookPen,
  Target,
  TrendingUp,
  Compass,
  LogOut,
  UserRound,
  BarChart3,
} from "lucide-react";
import { canViewInstructor } from "../lib/api";
import { AppFooter } from "./AppFooter";
import { BlazeMarker } from "./BlazeMarker";
import { Logo } from "./Logo";
import { OfflineBanner } from "./OfflineBanner";
import { Popover } from "./Popover";
import { SlideOver } from "./Modal";
import { Button } from "./Button";
import { Skeleton, SkeletonGroup } from "./Skeleton";
import { useSession } from "../lib/session";
import { useApiError } from "../lib/useApiError";

// Lazy so the shared chat surface (markdown renderer included) stays out of the
// shell bundle until the slide-over first opens.
const TutorChat = lazy(() => import("../pages/tutor/TutorChat"));

/* `desktopOnly` keeps the mobile tab bar at its designed four stops
 * (DESIGN-003 §Responsive) — Practice is reachable from module pages there. */
const NAV = [
  { to: "/course", label: "Course", icon: Map },
  { to: "/games", label: "Practice", icon: Target, desktopOnly: true },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/tutor", label: "Ranger", icon: Compass },
];

function topLinkClass(isActive: boolean) {
  return `rounded-pill px-3.5 py-2 text-sm font-medium transition-colors duration-(--ts-dur-fast) ${
    isActive
      ? "bg-pine-100 text-pine-950"
      : "text-ink-500 hover:bg-moss-100 hover:text-pine-950"
  }`;
}

/** Sticky chrome earns its shadow once the page has moved (DESIGN-004). */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function UserMenu() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const onApiError = useApiError();
  if (!user) return null;
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "S";

  const item =
    "flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-sm font-medium text-pine-950 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100";

  return (
    <Popover
      trigger={
        <button
          type="button"
          aria-label={`Account menu for ${user.displayName}`}
          className="grid size-9 place-items-center rounded-full bg-pine-700 font-display text-sm font-bold text-paper-0 transition-all duration-(--ts-dur-fast) hover:brightness-95"
        >
          {initial}
        </button>
      }
      className="w-56"
    >
      <div className="border-b border-line-200 px-3 pt-1 pb-2.5">
        <p className="truncate text-sm font-semibold text-pine-950">{user.displayName}</p>
        <p className="truncate text-xs text-ink-500">{user.email}</p>
      </div>
      <div className="pt-1.5">
        <button type="button" className={item} onClick={() => navigate("/account")}>
          <UserRound className="size-4 text-ink-500" strokeWidth={1.5} aria-hidden />
          Account
        </button>
        {canViewInstructor(user.role) && (
          <button type="button" className={item} onClick={() => navigate("/instructor")}>
            <BarChart3 className="size-4 text-ink-500" strokeWidth={1.5} aria-hidden />
            Instructor view
          </button>
        )}
        <button
          type="button"
          className={item}
          onClick={() =>
            logout.mutate(undefined, {
              onSuccess: () => navigate("/login"),
              onError: onApiError,
            })
          }
        >
          <LogOut className="size-4 text-ink-500" strokeWidth={1.5} aria-hidden />
          Log out
        </button>
      </div>
    </Popover>
  );
}

/** The Ranger slide-over reachable from anywhere in the app shell. It hosts the
 * same chat surface as /tutor; opened from a lesson it passes the lessonId so
 * learner context flows into answers (SPEC-008 §Learner context). */
function RangerSlideOver({
  open,
  onOpenChange,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** The "Ask Ranger" button that opened us — focus returns there on close. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const location = useLocation();
  const lessonMatch = matchPath("/learn/:lessonId", location.pathname);
  return (
    <SlideOver
      open={open}
      onOpenChange={onOpenChange}
      title="Ranger"
      onCloseAutoFocus={(event) => {
        // Controlled open (no Dialog.Trigger): send focus back to the opener
        // ourselves so keyboard users don't drop to <body> (QA-004).
        event.preventDefault();
        triggerRef.current?.focus();
      }}
    >
      {open && (
        <Suspense
          fallback={
            <SkeletonGroup label="Opening Ranger" className="flex flex-col gap-4 p-4">
              <Skeleton className="h-16 w-3/5 self-end rounded-md" />
              <Skeleton className="h-28 w-4/5 self-start rounded-md" />
            </SkeletonGroup>
          }
        >
          <TutorChat variant="slideOver" lessonId={lessonMatch?.params.lessonId} />
        </Suspense>
      )}
    </SlideOver>
  );
}

/** App chrome (DESIGN-003): top nav ≥1024px, bottom tab bar below. */
export function AppShell() {
  const [rangerOpen, setRangerOpen] = useState(false);
  const rangerButtonRef = useRef<HTMLButtonElement>(null);
  const scrolled = useScrolled();

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header
        className={`sticky top-0 z-30 border-b border-line-200 bg-paper-0/85 backdrop-blur-chrome transition-shadow duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
          scrolled ? "shadow-2" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-6 lg:px-12">
          <Logo to="/dashboard" />
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => topLinkClass(isActive)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {/* Hidden below sm: the bottom tab bar already carries Ranger there */}
            <span className="hidden sm:block">
              <Button
                ref={rangerButtonRef}
                variant="secondary"
                size="s"
                iconLeft={<Compass className="size-4" strokeWidth={1.5} aria-hidden />}
                onClick={() => setRangerOpen(true)}
              >
                Ask Ranger
              </Button>
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      {/* The tab-bar clearance is paid INSIDE the footer, not below it: on the
       * shell wrapper it left every mobile route ending on bare ground under
       * the footer band (DESIGN-006 §Depth — no route ends mid-air). */}
      <AppFooter variant="app" className="pb-16 lg:pb-0" />

      {/* Bottom tab bar < 1024px (DESIGN-003 §Responsive) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line-200 bg-paper-0/85 backdrop-blur-chrome lg:hidden"
      >
        {NAV.filter((item) => !item.desktopOnly).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-(--ts-dur-fast) ${
                isActive ? "text-pine-700" : "text-ink-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid place-items-center rounded-pill px-4 py-0.5 transition-colors duration-(--ts-dur-fast) ${
                    isActive ? "bg-pine-100" : ""
                  }`}
                >
                  <Icon className="size-5" strokeWidth={1.5} aria-hidden />
                </span>
                {label}
                <span className="grid h-3 place-items-center">
                  {isActive && <BlazeMarker state="active" size="s" />}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <RangerSlideOver
        open={rangerOpen}
        onOpenChange={setRangerOpen}
        triggerRef={rangerButtonRef}
      />
    </div>
  );
}
