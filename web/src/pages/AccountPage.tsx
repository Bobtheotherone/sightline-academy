import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { api, type MeResponse } from "../lib/api";
import { useSession } from "../lib/session";
import { useApiError } from "../lib/useApiError";
import { levelTitle } from "../lib/modules";
import { CountUp, Reveal } from "../activities/motion";
import { useToast } from "../components/Toast";
import { BlazeMarker } from "../components/BlazeMarker";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Modal } from "../components/Modal";

/** Form measure left, hint/meta column right — the shared account-card grid. */
const FIELD_GRID = "mt-4 grid items-start gap-x-8 gap-y-5 sm:grid-cols-[minmax(0,22rem)_1fr]";
const HINT_COLUMN = "text-sm text-ink-500 sm:border-l sm:border-line-200 sm:pl-8";

function DisplayNameSection() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onApiError = useApiError();
  const [name, setName] = useState(user?.displayName ?? "");
  const [error, setError] = useState<string | undefined>();

  const save = useMutation({
    mutationFn: (displayName: string) => api.updateMe({ displayName }),
    onSuccess: (res) => {
      queryClient.setQueryData<MeResponse | null>(["me"], (prev) =>
        prev ? { ...prev, user: res.user } : prev,
      );
      toast({ variant: "success", title: "Display name updated." });
    },
    onError: onApiError,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError("Display name needs at least 2 characters");
    if (trimmed.length > 40) return setError("Display name maxes out at 40 characters");
    setError(undefined);
    save.mutate(trimmed);
  };

  return (
    <Card padding="m">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-lg font-bold">Display name</h2>
        <p className="font-mono text-xs text-ink-500">{name.trim().length}/40</p>
      </div>
      {/* The form keeps its reading measure; the freed width carries the hint
       * column, so the card composes to both edges instead of trailing off. */}
      <form onSubmit={submit} className={FIELD_GRID}>
        <div className="flex flex-col gap-4">
          <Input
            label="Display name"
            value={name}
            maxLength={40}
            error={error}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" loading={save.isPending} className="self-start">
            Save name
          </Button>
        </div>
        <p className={HINT_COLUMN}>
          This is what the course calls you — your dashboard greeting and anywhere Sightline
          addresses you by name. Between 2 and 40 characters, and you can change it whenever you
          like.
        </p>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const { toast } = useToast();
  const onApiError = useApiError();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | undefined>();

  const change = useMutation({
    mutationFn: () => api.changePassword({ current, next }),
    onSuccess: () => {
      setCurrent("");
      setNext("");
      toast({
        variant: "success",
        title: "Password changed.",
        description: "Other devices have been logged out.",
      });
    },
    onError: onApiError,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 10) return setError("Password needs at least 10 characters");
    setError(undefined);
    change.mutate();
  };

  return (
    <Card padding="m">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-lg font-bold">Password</h2>
        <p className="font-mono text-xs text-ink-500">10 characters minimum</p>
      </div>
      <form onSubmit={submit} className={FIELD_GRID}>
        <div className="flex flex-col gap-4">
          <PasswordInput
            label="Current password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            showStrength
            value={next}
            error={error}
            onChange={(e) => setNext(e.target.value)}
          />
          <Button type="submit" loading={change.isPending} className="self-start">
            Change password
          </Button>
        </div>
        <p className={HINT_COLUMN}>
          Changing your password signs you out everywhere else — every other device has to log in
          again. Sightline never emails your password and Ranger will never ask you for it.
        </p>
      </form>
    </Card>
  );
}

const EXPORT_CONTENTS = [
  "Account details and level",
  "Lesson and module progress",
  "Every journal artifact",
  "The full XP ledger and badges",
  "Your Ranger conversation history",
];

function DataSection() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const onApiError = useApiError();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [error, setError] = useState<string | undefined>();

  const del = useMutation({
    mutationFn: () => api.deleteAccount({ confirmEmail: confirmEmail.trim().toLowerCase() }),
    onSuccess: () => {
      logout.mutate(undefined, { onSettled: () => navigate("/") });
    },
    onError: onApiError,
  });

  const confirm = () => {
    if (confirmEmail.trim().toLowerCase() !== user?.email) {
      setError("Type the email on this account to confirm");
      return;
    }
    setError(undefined);
    del.mutate();
  };

  return (
    <Card padding="m">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-lg font-bold">Your data</h2>
        <p className="font-mono text-xs text-ink-500">JSON export · permanent delete</p>
      </div>
      <div className={FIELD_GRID}>
        <div>
          <p className="text-sm text-ink-500">
            Everything Sightline Safety Academy stores about you — progress, journal, XP, tutor
            history — is yours to download or delete.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={api.exportUrl}
              download
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-pine-700 bg-paper-0 px-4 text-sm font-medium text-pine-700 transition-all duration-(--ts-dur-fast) hover:bg-moss-100"
            >
              <Download className="size-4" strokeWidth={1.5} aria-hidden />
              Export my data
            </a>
            <Button variant="danger" onClick={() => setOpen(true)}>
              Delete account
            </Button>
          </div>
        </div>
        <div className={HINT_COLUMN}>
          <p className="ts-eyebrow">In the export</p>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {EXPORT_CONTENTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <BlazeMarker state="done" size="s" className="mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setConfirmEmail("");
            setError(undefined);
          }
        }}
        title="Delete your account?"
        description="This permanently removes your progress, journal, XP, and certificate eligibility. There's no undo."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Type your email to confirm"
            type="email"
            placeholder={user?.email}
            value={confirmEmail}
            error={error}
            onChange={(e) => setConfirmEmail(e.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Keep my account
            </Button>
            <Button variant="danger" loading={del.isPending} onClick={confirm}>
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}


/**
 * Subscription state and the two hosted actions (SPEC-012).
 *
 * Both buttons hand off to Stripe rather than rendering any billing UI here:
 * "manage" opens Stripe's billing portal, where changing a card, downloading
 * invoices and cancelling all live. Nothing about a payment method is stored
 * in, or passes through, this application.
 */
function SubscriptionSection() {
  const { user } = useSession();
  const onApiError = useApiError();

  const statusQuery = useQuery({ queryKey: ["billingStatus"], queryFn: api.billingStatus });
  const planQuery = useQuery({ queryKey: ["plan"], queryFn: api.plan });

  const portal = useMutation({
    mutationFn: api.billingPortal,
    onSuccess: (res) => {
      window.location.href = res.url;
    },
    onError: onApiError,
  });

  const status = statusQuery.data;
  const access = status?.access;
  const plan = planQuery.data;

  // Staff read the course by role, so a billing card would be noise at best
  // and an invitation to pay for something they already have at worst.
  if (user?.isStaff) {
    return (
      <Card padding="l">
        <h2 className="font-display text-lg font-bold">Course access</h2>
        <p className="mt-3 text-sm text-ink-500">
          Your <strong>{user.role}</strong> account has full access to the course. There is
          nothing to subscribe to and nothing to pay.
        </p>
      </Card>
    );
  }

  const price =
    plan && plan.activeCents > 0
      ? `$${(plan.activeCents / 100).toFixed(plan.activeCents % 100 === 0 ? 0 : 2)}/mo`
      : null;

  const periodEnd = access?.currentPeriodEnd
    ? new Date(access.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  let headline = "No subscription yet";
  let detail = "Start one to open the course. Your progress so far is kept either way.";
  if (access?.reason === "comp") {
    headline = "Complimentary access";
    detail = "Access to this course was granted to you directly. There is nothing to pay.";
  } else if (access?.reason === "paywall_disabled") {
    headline = "Open access";
    detail = "The course is currently open — no subscription is needed.";
  } else if (access?.status === "active") {
    headline = access.cancelAtPeriodEnd ? "Active — ending soon" : "Active";
    detail = access.cancelAtPeriodEnd
      ? `Cancelled. You keep full access until ${periodEnd ?? "the end of the period"}.`
      : periodEnd
        ? `Renews ${periodEnd}${price ? ` at ${price}` : ""}.`
        : "Your subscription is active.";
  } else if (access?.status === "past_due") {
    headline = "Payment needs attention";
    detail =
      "The last payment didn't go through. You still have access — update your card to keep it.";
  } else if (access?.reason === "expired") {
    headline = "Subscription ended";
    detail = "Start a new one whenever you like; everything you finished is still here.";
  }

  return (
    <Card padding="l">
      <h2 className="font-display text-lg font-bold">Subscription</h2>
      <div className={FIELD_GRID}>
        <div>
          <p className="font-medium text-pine-950">{headline}</p>
          <p className="mt-1.5 text-sm text-ink-500">{detail}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {access?.allowed && status?.hasStripeCustomer && (
              <Button
                variant="secondary"
                loading={portal.isPending}
                onClick={() => portal.mutate()}
              >
                Manage or cancel
              </Button>
            )}
            {!access?.allowed && (
              <Link to="/subscribe">
                <Button variant="accent">Start the course</Button>
              </Link>
            )}
          </div>
        </div>
        <p className={HINT_COLUMN}>
          Payments and invoices are handled by Stripe. Cancelling stops the next charge and
          leaves your access running until the period you have already paid for ends.
        </p>
      </div>
    </Card>
  );
}

export default function AccountPage() {
  const { user } = useSession();
  if (!user) return null;
  const since = new Date(user.createdAt);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Identity left, the account's own numbers right — the band composes to
       * its edges rather than trailing off into dead width. */}
      <Reveal index={0} className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <p className="ts-eyebrow">Account</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold">{user.displayName}</h1>
          <p className="mt-1 text-sm text-ink-500">{user.email}</p>
        </div>
        <dl className="flex flex-wrap gap-x-10 gap-y-6">
          <div className="flex min-w-24 flex-col-reverse">
            <dt className="ts-eyebrow mt-1.5">{levelTitle(user.level)}</dt>
            <dd className="text-pine-950">
              <CountUp
                value={user.xpTotal}
                format={(n) => n.toLocaleString()}
                suffix=" XP"
                className="text-2xl leading-none font-medium"
              />
            </dd>
          </div>
          <div className="flex min-w-24 flex-col-reverse">
            <dt className="ts-eyebrow mt-1.5">Riding since</dt>
            <dd className="font-mono text-2xl leading-none font-medium text-pine-950">
              {Number.isNaN(since.getTime())
                ? "—"
                : since.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </dd>
          </div>
        </dl>
      </Reveal>
      <Reveal index={1}>
        <SubscriptionSection />
      </Reveal>
      <Reveal index={2}>
        <DisplayNameSection />
      </Reveal>
      <Reveal index={3}>
        <PasswordSection />
      </Reveal>
      <Reveal index={4}>
        <DataSection />
      </Reveal>
    </div>
  );
}
