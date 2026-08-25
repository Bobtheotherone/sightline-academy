import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Logo } from "./Logo";

const FINE_PRINT =
  "Sightline ATV Safety Academy is an online awareness and judgment course. It is not a license, legal certification, or a substitute for hands-on rider training.";

const FINE_PRINT_SHORT =
  "Not a license or a substitute for hands-on rider training.";

/**
 * The page anchor (DESIGN-002/003 v2). `marketing` is the full dark contour
 * band that ends the public pages; `app` is the one-line hairline footer every
 * authenticated page ends with — no page stops mid-air.
 */
export function AppFooter({
  variant = "app",
  className = "",
}: {
  variant?: "marketing" | "app";
  className?: string;
}) {
  return variant === "marketing" ? (
    <MarketingFooter className={className} />
  ) : (
    <SlimFooter className={className} />
  );
}

function MarketingFooter({ className }: { className: string }) {
  return (
    <footer
      className={`relative isolate overflow-hidden bg-pine-950 text-paper-0 ${className}`}
    >
      <div
        className="ts-contour-dark ts-contour-drift pointer-events-none absolute -inset-x-[10%] -inset-y-[15%] -z-10"
        aria-hidden
      />
      <div className="mx-auto max-w-wide px-6 py-16 lg:px-12 lg:py-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-8">
            {/* Was a hand-rolled copy of the wordmark, which meant the
                subtitle and the descender spacing had to be fixed twice and
                could drift apart. It renders the shared lockup now. */}
            <Logo size="l" onDark showMarker={false} />
            <p className="mt-5 max-w-xs text-sm text-paper-0/75">
              A self-paced ATV and road safety course. Judgment first —
              because most crashes are decided before the wheels turn.
            </p>
          </div>

          <FooterNav title="The course">
            <FooterAnchor href="/#trail-heading">The six modules</FooterAnchor>
            <FooterAnchor href="/#ranger-heading">
              Ranger, the safety tutor
            </FooterAnchor>
            <FooterAnchor href="/#honest-heading">
              Honest expectations
            </FooterAnchor>
          </FooterNav>

          <FooterNav title="Account">
            <FooterLink to="/register">Create an account</FooterLink>
            <FooterLink to="/login">Log in</FooterLink>
            <FooterLink to="/verify/sample">Verify a certificate</FooterLink>
          </FooterNav>

          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-paper-0/60 uppercase">
              The fine print
            </p>
            <p className="mt-4 max-w-xs text-sm text-paper-0/70">{FINE_PRINT}</p>
          </div>
        </div>

        <div className="mt-14 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-paper-0/15" />
          <span className="ts-blaze" />
          <span className="ts-blaze ts-blaze--muted" />
          <span className="ts-blaze" />
          <span className="h-px flex-1 bg-paper-0/15" />
        </div>

        <div className="mt-8 flex flex-col gap-2 font-mono text-xs text-paper-0/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sightline ATV Safety Academy</p>
          <p>Ride like you've thought it through.</p>
        </div>
      </div>
    </footer>
  );
}

function SlimFooter({ className }: { className: string }) {
  return (
    <footer className={`border-t border-line-200 bg-paper-50/80 ${className}`}>
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 lg:px-12">
        <Logo />
        <p className="font-mono text-xs text-ink-500">{FINE_PRINT_SHORT}</p>
        <Link
          to="/verify/sample"
          className="rounded-sm font-mono text-xs text-pine-700 underline-offset-4 transition-colors duration-(--ts-dur-fast) hover:underline"
        >
          Verify a certificate
        </Link>
      </div>
    </footer>
  );
}

function FooterNav({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="text-xs font-semibold tracking-[0.08em] text-paper-0/60 uppercase">
        {title}
      </p>
      <ul className="mt-4 flex flex-col gap-2.5 text-sm">{children}</ul>
    </nav>
  );
}

const LINK_CLASS =
  "rounded-sm text-paper-0/80 underline-offset-4 transition-colors duration-(--ts-dur-fast) hover:text-paper-0 hover:underline";

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <Link to={to} className={LINK_CLASS}>
        {children}
      </Link>
    </li>
  );
}

/** Same-document fragment links: the landing sections, reachable from any
 * public page (the browser handles the scroll natively). */
function FooterAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a href={href} className={LINK_CLASS}>
        {children}
      </a>
    </li>
  );
}
