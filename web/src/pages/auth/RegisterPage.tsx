import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PasswordInput } from "../../components/PasswordInput";
import { useSession } from "../../lib/session";
import { isCommonPassword } from "../../lib/commonPasswords";
import {
  INLINE_COPY,
  isDuplicateEmail,
  isRateLimited,
  useApiError,
} from "../../lib/useApiError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { displayName?: string; email?: string; password?: string };

function validate(displayName: string, email: string, password: string): Errors {
  const errors: Errors = {};
  const name = displayName.trim();
  if (name.length < 2) errors.displayName = "Display name needs at least 2 characters";
  else if (name.length > 40) errors.displayName = "Display name maxes out at 40 characters";
  if (email.trim().length === 0) errors.email = "Enter your email address";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "That doesn't look like an email address";
  if (password.length < 10) errors.password = "Password needs at least 10 characters";
  else if (isCommonPassword(password))
    errors.password = "That password is too common — pick something more yours";
  return errors;
}

export default function RegisterPage() {
  const { register } = useSession();
  const navigate = useNavigate();
  const onApiError = useApiError();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [duplicate, setDuplicate] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const blurCheck = (field: keyof Errors) =>
    setErrors((prev) => ({ ...prev, [field]: validate(displayName, email, password)[field] }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const all = validate(displayName, email, password);
    setErrors(all);
    if (Object.values(all).some(Boolean)) return;
    setDuplicate(false);
    setRateLimited(false);
    register.mutate(
      { displayName: displayName.trim(), email: email.trim().toLowerCase(), password },
      {
        onSuccess: () => navigate("/dashboard", { replace: true }),
        onError: (err) => {
          if (isDuplicateEmail(err)) setDuplicate(true);
          else if (isRateLimited(err)) setRateLimited(true);
          else onApiError(err);
        },
      },
    );
  };

  return (
    <AuthLayout
      title="Create your account"
      lead="The whole course is free. Your progress, journal, and certificate live here."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {rateLimited && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-danger-600/40 bg-danger-600/5 px-3 py-2.5 text-sm text-danger-600"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            {INLINE_COPY.rateLimited}
          </p>
        )}
        <Input
          label="Display name"
          autoComplete="nickname"
          hint="What Ranger and your certificate call you."
          maxLength={40}
          value={displayName}
          error={errors.displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => blurCheck("displayName")}
        />
        <div className="flex flex-col gap-1.5">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={
              duplicate ? "That email already has an account." : errors.email
            }
            onChange={(e) => {
              setEmail(e.target.value);
              setDuplicate(false);
            }}
            onBlur={() => blurCheck("email")}
          />
          {duplicate && (
            <p className="text-sm text-ink-500">
              <Link
                to="/login"
                className="rounded-sm font-medium text-pine-700 hover:underline"
              >
                Log in instead
              </Link>{" "}
              — your trail is waiting.
            </p>
          )}
        </div>
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          showStrength
          value={password}
          error={errors.password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => blurCheck("password")}
        />
        <Button type="submit" size="l" loading={register.isPending} className="w-full">
          Start the course
        </Button>
        <p className="text-center text-sm text-ink-500">
          Already riding with us?{" "}
          <Link to="/login" className="rounded-sm font-medium text-pine-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
