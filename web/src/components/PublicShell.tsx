import { Link, Outlet } from "react-router-dom";
import { Logo } from "./Logo";
import { OfflineBanner } from "./OfflineBanner";

/** Minimal public chrome: wordmark + login/register links (SPEC-010). */
export function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header className="border-b border-line-200 bg-paper-0">
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
              className="rounded-sm border border-pine-700 bg-pine-700 px-3.5 py-2 text-sm font-medium text-paper-0 transition-all duration-(--ts-dur-fast) hover:brightness-95"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
