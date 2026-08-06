import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Map, NotebookPen, TrendingUp, Compass, LogOut, UserRound, BarChart3 } from "lucide-react";
import { Logo } from "./Logo";
import { OfflineBanner } from "./OfflineBanner";
import { Popover } from "./Popover";
import { SlideOver } from "./Modal";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { SlotArt } from "./SlotArt";
import { useSession } from "../lib/session";
import { useApiError } from "../lib/useApiError";

const NAV = [
  { to: "/course", label: "Course", icon: Map },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/tutor", label: "Ranger", icon: Compass },
];

function topLinkClass(isActive: boolean) {
  return `rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-(--ts-dur-fast) ${
    isActive ? "bg-pine-300/30 text-pine-950" : "text-ink-500 hover:bg-moss-100 hover:text-pine-950"
  }`;
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
        {user.role === "instructor" && (
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

/** The Ranger slide-over reachable from anywhere in the app shell. */
function RangerSlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  return (
    <SlideOver open={open} onOpenChange={onOpenChange} title="Ranger">
      <div className="flex h-full flex-col justify-center">
        <EmptyState
          art={<SlotArt slot="empty-tutor" ratio="5 / 3" />}
          heading="Meet Ranger"
          body="Ask anything about ATV or road safety. Ranger knows this course inside out — and plenty beyond it, and will tell you which is which."
          action={
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate("/tutor");
              }}
            >
              Ask Ranger
            </Button>
          }
        />
      </div>
    </SlideOver>
  );
}

/** App chrome (DESIGN-003): top nav ≥1024px, bottom tab bar below. */
export function AppShell() {
  const [rangerOpen, setRangerOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col pb-16 lg:pb-0">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-line-200 bg-paper-0">
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
            <Button
              variant="secondary"
              size="s"
              iconLeft={<Compass className="size-4" strokeWidth={1.5} aria-hidden />}
              onClick={() => setRangerOpen(true)}
              className="hidden sm:inline-flex"
            >
              Ask Ranger
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      {/* Bottom tab bar < 1024px (DESIGN-003 §Responsive) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line-200 bg-paper-0 lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors duration-(--ts-dur-fast) ${
                isActive ? "text-pine-700" : "text-ink-500"
              }`
            }
          >
            <Icon className="size-5" strokeWidth={1.5} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <RangerSlideOver open={rangerOpen} onOpenChange={setRangerOpen} />
    </div>
  );
}
