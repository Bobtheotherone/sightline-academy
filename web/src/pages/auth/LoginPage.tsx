import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthLayout } from "./AuthLayout";
import { Reveal } from "../../activities/motion";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { PasswordInput } from "../../components/PasswordInput";
import { useSession } from "../../lib/session";
import {
  INLINE_COPY,
  isRateLimited,
  isWrongCredentials,
  useApiError,
} from "../../lib/useApiError";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const onApiError = useApiError();

  const validateEmail = (value: string) =>
    value.trim().length === 0
      ? "Enter your email address"
      : EMAIL_RE.test(value.trim())
        ? undefined
        : "That doesn't look like an email address";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    const passwordError = password.length === 0 ? "Enter your password" : undefined;
    setFieldErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;
    setFormError(null);
    login.mutate(
      { email: email.trim().toLowerCase(), password },
      {
        onSuccess: () => navigate(from, { replace: true }),
        onError: (err) => {
          if (isWrongCredentials(err)) setFormError(INLINE_COPY.wrongCredentials);
          else if (isRateLimited(err)) setFormError(INLINE_COPY.rateLimited);
          else onApiError(err);
        },
      },
    );
  };

  return (
    <AuthLayout title="Welcome back" lead="Pick up the trail where you left it.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-sm border border-danger-600/40 bg-danger-600/5 px-3 py-2.5 text-sm text-danger-600"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} aria-hidden />
            {formError}
          </p>
        )}
        <Reveal index={0}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={fieldErrors.email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setFieldErrors((f) => ({ ...f, email: validateEmail(email) }))}
          />
        </Reveal>
        <Reveal index={1}>
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            value={password}
            error={fieldErrors.password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Reveal>
        <Reveal index={2}>
          <Button type="submit" size="l" loading={login.isPending} className="w-full">
            Log in
          </Button>
        </Reveal>
        <p className="text-center text-sm text-ink-500">
          New here?{" "}
          <Link to="/register" className="rounded-sm font-medium text-pine-700 hover:underline">
            Create a free account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
