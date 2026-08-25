/* useApiError — the one place query/mutation errors become DESIGN-005 surfaces.
 * Toast copy is final per DESIGN-005 §Errors; inline copy helpers are exported
 * for forms that render errors under fields instead of toasting.
 */
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "./api";
import { useToast } from "../components/Toast";

/** DESIGN-005 final copy for the inline auth cases. */
export const INLINE_COPY = {
  wrongCredentials: "That email and password don't match.",
  rateLimited: "Too many attempts. Take a breather — try again in about 10 minutes.",
} as const;

export function isRateLimited(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 429 || err.code === "rate_limited");
}

export function isWrongCredentials(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 401 || err.code === "invalid_credentials" || err.code === "wrong_credentials")
  );
}

export function isDuplicateEmail(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 409 ||
      err.code === "email_exists" ||
      err.code === "duplicate_email" ||
      err.code === "email_taken")
  );
}

export function isOffline(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

/** 402 from any gated route: the learner needs an active subscription. */
export function needsSubscription(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 402 || err.code === "subscription_required")
  );
}

/**
 * Returns a stable handler that maps an unknown error to the right toast.
 * Network-down errors are swallowed here — the offline banner owns that state.
 */
export function useApiError() {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 0) return; // offline banner handles connectivity
        if (needsSubscription(err)) {
          // Not an error the learner can act on from here — send them to the
          // one page that can fix it, and say why rather than showing a bare
          // "forbidden" toast over a blank screen.
          toast({
            variant: "info",
            title: "This part of the course needs an active subscription.",
            description: "Your progress is saved.",
          });
          navigate("/subscribe");
          return;
        }
        if (err.status >= 500) {
          toast({
            variant: "error",
            title: "Something broke on our side.",
            description: "Your progress up to now is saved.",
            finePrint: err.incidentId ? `Incident ${err.incidentId}` : undefined,
          });
          return;
        }
        if (isRateLimited(err)) {
          toast({
            variant: "error",
            title: "Too many attempts.",
            description: "Take a breather — try again in about 10 minutes.",
          });
          return;
        }
        toast({ variant: "error", title: err.message });
        return;
      }
      toast({
        variant: "error",
        title: "Something broke on our side.",
        description: "Your progress up to now is saved.",
      });
    },
    [toast, navigate],
  );
}
