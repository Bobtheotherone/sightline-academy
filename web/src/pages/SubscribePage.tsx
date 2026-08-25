import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import { useApiError } from "../lib/useApiError";
import { Reveal } from "../activities/motion";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";

/** Money formatting from cents, so the page never hardcodes a price. */
function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

const INCLUDED = [
  "Six modules, twenty-two lessons, about five hours",
  "Ranger, the safety tutor that knows the course inside out",
  "A field journal you keep — ride plans, gear checks, readiness",
  "A verifiable certificate when you finish",
];

/**
 * The paywall (SPEC-012). Reached when the API answers 402, or from the
 * account page.
 *
 * Payment happens on Stripe's own hosted page: this component's only job is to
 * fetch a redirect URL and navigate to it. No card field is ever rendered
 * here, which is what keeps card data out of this application entirely.
 */
export default function SubscribePage() {
  const { user } = useSession();
  const onApiError = useApiError();

  const planQuery = useQuery({ queryKey: ["plan"], queryFn: api.plan });
  const statusQuery = useQuery({ queryKey: ["billingStatus"], queryFn: api.billingStatus });

  const checkout = useMutation({
    mutationFn: api.startCheckout,
    onSuccess: (res) => {
      if (res.url) {
        // Full navigation, not a client route: the destination is Stripe.
        window.location.href = res.url;
      }
    },
    onError: onApiError,
  });

  const plan = planQuery.data;
  const access = statusQuery.data?.access;
  const alreadyIn = access?.allowed === true;

  return (
    <div className="mx-auto max-w-page px-6 py-10 lg:px-12">
      <Reveal>
        <p className="ts-eyebrow text-clay-500">Course access</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-pine-950">
          {alreadyIn ? "You're all set" : "Start the course"}
        </h1>
        <p className="mt-3 max-w-prose text-ink-500">
          {alreadyIn
            ? "Your access is active. Everything below is already unlocked."
            : "One subscription opens every module, the tutor, the journal and the certificate."}
        </p>
      </Reveal>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <Reveal index={1}>
          <Card padding="l" bordered>
            {planQuery.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : plan ? (
              <>
                {plan.launchSaleActive && plan.launchCents < plan.standardCents && (
                  <p className="ts-eyebrow text-clay-500">Launch price</p>
                )}
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold text-pine-950">
                    {usd(plan.activeCents)}
                  </span>
                  <span className="text-ink-500">/ month</span>
                </p>
                {plan.launchSaleActive && plan.launchCents < plan.standardCents && (
                  <p className="mt-1.5 text-sm text-ink-500">
                    <span className="line-through">{usd(plan.standardCents)}/mo</span> after the
                    launch period. Cancel any time.
                  </p>
                )}

                <ul className="mt-6 space-y-2.5">
                  {INCLUDED.map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm text-ink-700">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-pine-700" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {alreadyIn ? (
                    <Button variant="secondary" size="l" disabled>
                      Access active
                    </Button>
                  ) : plan.billingAvailable ? (
                    <Button
                      size="l"
                      variant="accent"
                      loading={checkout.isPending}
                      onClick={() => checkout.mutate()}
                    >
                      Continue to secure checkout
                    </Button>
                  ) : (
                    <p className="rounded-sm bg-paper-100 p-4 text-sm text-ink-500">
                      Checkout isn't switched on yet. Nothing has been charged — please
                      check back shortly.
                    </p>
                  )}
                </div>

                <p className="mt-4 flex items-start gap-2 text-xs text-ink-500">
                  <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Payment is handled by Stripe on their own secure page. Your card details
                    are never sent to, or stored by, Sightline.
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-500">Pricing is unavailable right now.</p>
            )}
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Card padding="l">
            <h2 className="font-display text-lg font-bold text-pine-950">
              What happens to my progress?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">
              Nothing is lost. Your account, journal, XP and any lessons you have already
              finished stay exactly where they are — a subscription unlocks the course, it
              does not reset it. If you cancel, you keep access until the end of the period
              you have paid for.
            </p>

            {user?.isStaff && (
              <p className="mt-5 rounded-sm bg-moss-100 p-4 text-sm text-pine-900">
                You're signed in as {user.role}. Staff accounts have full access without a
                subscription — you should not be seeing a charge prompt.
              </p>
            )}

            {access?.reason === "expired" && (
              <p className="mt-5 rounded-sm bg-paper-100 p-4 text-sm text-ink-700">
                Your previous subscription has ended. Starting a new one picks up exactly
                where you left off.
              </p>
            )}

            <p className="mt-6 text-sm text-ink-500">
              Questions first?{" "}
              <Link to="/account" className="rounded-sm text-pine-700 hover:underline">
                Manage your account
              </Link>
              .
            </p>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
