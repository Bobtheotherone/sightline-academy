import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
        <DisplayNameSection />
      </Reveal>
      <Reveal index={2}>
        <PasswordSection />
      </Reveal>
      <Reveal index={3}>
        <DataSection />
      </Reveal>
    </div>
  );
}
