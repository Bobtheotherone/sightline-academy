import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { api, type MeResponse } from "../lib/api";
import { useSession } from "../lib/session";
import { useApiError } from "../lib/useApiError";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { Modal } from "../components/Modal";

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
      <h2 className="font-display text-lg font-bold">Display name</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
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
      <h2 className="font-display text-lg font-bold">Password</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4 sm:max-w-sm">
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
      </form>
    </Card>
  );
}

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
      <h2 className="font-display text-lg font-bold">Your data</h2>
      <p className="mt-1.5 max-w-lg text-sm text-ink-500">
        Everything Sightline Safety Academy stores about you — progress, journal, XP, tutor history
        — is yours to download or delete.
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
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="ts-eyebrow">Account</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold">{user.displayName}</h1>
        <p className="mt-1 text-sm text-ink-500">{user.email}</p>
      </div>
      <DisplayNameSection />
      <PasswordSection />
      <DataSection />
    </div>
  );
}
