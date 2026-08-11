import { useEffect, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { AppFooter } from "./AppFooter";
import { Logo } from "./Logo";
import { OfflineBanner } from "./OfflineBanner";

/**
 * Minimal public chrome: wordmark + login/register links (SPEC-010) over the
 * marketing footer, which the shell mounts once for every public route so no
 * page ends mid-air (DESIGN-002 §AppFooter, DESIGN-006 §Depth).
 */
export function PublicShell() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header
        className={`sticky top-0 z-30 border-b border-line-200 bg-paper-0/85 backdrop-blur-chrome transition-shadow duration-(--ts-dur-fast) ease-(--ts-ease-out) ${
          scrolled ? "shadow-2" : ""
        }`}
      >
        <div className="mx-auto flex h-16 max-w-page items-center justify-between px-6 lg:px-12">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-sm px-3 py-2 text-sm font-medium text-pine-700 transition-colors duration-(--ts-dur-fast) hover:bg-moss-100"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-sm border border-pine-700 bg-pine-700 px-3.5 py-2 text-sm font-medium text-paper-0 transition-all duration-(--ts-dur-fast) ease-(--ts-ease-out) hover:-translate-y-px hover:brightness-95 hover:shadow-glow-clay"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      <AppFooter variant="marketing" />
    </div>
  );
}
