/* The lesson player's evidence pipeline (SPEC-006 §Persistence, DESIGN-004
 * §Feedback latency): every renderer change PUTs — optimistic locally,
 * debounced 400ms for typed input, latest-wins per step while a PUT is in
 * flight. Server rejections roll the step back to the last acknowledged state
 * and surface the DESIGN-005 footer line + toast. XP, badges, lesson/module
 * completion, and the level-up toast all ride in on PUT responses.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  api,
  type Badge,
  type EvidenceOut,
  type EvidencePutResponse,
  type XpEvent,
} from "../../lib/api";
import type { EvidenceDraft } from "../../activities/types";
import { levelFor, levelTitle } from "../../lib/modules";
import { useApiError } from "../../lib/useApiError";
import { useToast } from "../../components/Toast";

const TEXT_DEBOUNCE_MS = 400;

export interface SessionRewards {
  xp: XpEvent[];
  badges: Badge[];
  lessonComplete: boolean;
  moduleComplete: boolean;
}

export interface EvidenceEntry {
  kind: string;
  value: unknown;
  complete: boolean;
  firstAttemptCorrect: boolean | null;
}

function fromServer(out: EvidenceOut): EvidenceEntry {
  return {
    kind: out.kind,
    value: out.value,
    complete: out.complete,
    firstAttemptCorrect: out.firstAttemptCorrect,
  };
}

export function useEvidenceSaver({
  initialEvidence,
  lessonId,
  moduleId,
  xpTotalAtMount,
}: {
  initialEvidence: Record<string, EvidenceOut>;
  lessonId: string;
  moduleId: string;
  xpTotalAtMount: number;
}) {
  const queryClient = useQueryClient();
  const onApiError = useApiError();
  const { toast } = useToast();

  const [evidence, setEvidence] = useState<Record<string, EvidenceEntry>>(() =>
    Object.fromEntries(
      Object.entries(initialEvidence).map(([id, out]) => [id, fromServer(out)]),
    ),
  );
  const [saveError, setSaveError] = useState(false);
  const [rewards, setRewards] = useState<SessionRewards>({
    xp: [],
    badges: [],
    lessonComplete: false,
    moduleComplete: false,
  });

  const latest = useRef(new Map<string, EvidenceDraft>());
  const timers = useRef(new Map<string, number>());
  const inFlight = useRef(new Set<string>());
  const queued = useRef(new Set<string>());
  const serverAck = useRef(new Map<string, EvidenceEntry>());
  const xpRunning = useRef(xpTotalAtMount);
  const mounted = useRef(true);

  // Seed the last-acknowledged map once from the server's evidence (rollback
  // baseline). Runs before any PUT can fire; deliberately not reactive.
  const ackSeeded = useRef(false);
  if (!ackSeeded.current) {
    ackSeeded.current = true;
    for (const [id, out] of Object.entries(initialEvidence)) {
      serverAck.current.set(id, fromServer(out));
    }
  }

  const applyRewards = useCallback(
    (res: EvidencePutResponse, kind: string) => {
      if (res.xpAwarded.length > 0) {
        const gained = res.xpAwarded.reduce((sum, e) => sum + e.xp, 0);
        const before = xpRunning.current;
        xpRunning.current = before + gained;
        setRewards((r) => ({ ...r, xp: [...r.xp, ...res.xpAwarded] }));
        const next = levelFor(xpRunning.current);
        if (next > levelFor(before)) {
          toast({
            variant: "levelUp",
            title: `Level ${next} — ${levelTitle(next)}`,
            description: "Your judgment miles are adding up.",
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["me"] });
      }
      if (res.badgesAwarded.length > 0) {
        setRewards((r) => ({ ...r, badges: [...r.badges, ...res.badgesAwarded] }));
        if (!res.moduleComplete) {
          // Module badges get the module-complete moment; the rest toast here.
          for (const badge of res.badgesAwarded) {
            toast({ variant: "success", title: `Badge earned — ${badge.name}` });
          }
        }
      }
      if (kind === "journal_artifact") {
        void queryClient.invalidateQueries({ queryKey: ["journal"] });
      }
      if (res.lessonComplete) {
        setRewards((r) => ({ ...r, lessonComplete: true }));
        void queryClient.invalidateQueries({ queryKey: ["course"] });
        void queryClient.invalidateQueries({ queryKey: ["module", moduleId] });
        void queryClient.invalidateQueries({ queryKey: ["progress"] });
      }
      if (res.moduleComplete) {
        setRewards((r) => ({ ...r, moduleComplete: true }));
      }
    },
    [queryClient, moduleId, toast],
  );

  const fire = useCallback(
    (stepId: string) => {
      const draft = latest.current.get(stepId);
      if (!draft) return;
      if (inFlight.current.has(stepId)) {
        queued.current.add(stepId);
        return;
      }
      inFlight.current.add(stepId);
      api
        .putEvidence(stepId, {
          kind: draft.kind,
          value: draft.value,
          complete: draft.complete,
        })
        .then((res) => {
          if (!mounted.current) return;
          const acked = fromServer(res.evidence);
          serverAck.current.set(stepId, acked);
          setEvidence((prev) => {
            const local = prev[stepId];
            // A newer draft may be pending; keep its value, take server flags.
            const newerPending = latest.current.get(stepId) !== draft;
            return {
              ...prev,
              [stepId]: {
                ...acked,
                value: newerPending && local ? local.value : acked.value,
                complete: acked.complete || Boolean(local?.complete),
              },
            };
          });
          setSaveError(false);
          applyRewards(res, draft.kind);
        })
        .catch((err: unknown) => {
          if (!mounted.current) return;
          const acked = serverAck.current.get(stepId);
          setEvidence((prev) => {
            const next = { ...prev };
            if (acked) next[stepId] = acked;
            else delete next[stepId];
            return next;
          });
          setSaveError(true);
          onApiError(err);
        })
        .finally(() => {
          inFlight.current.delete(stepId);
          if (queued.current.delete(stepId) && mounted.current) fire(stepId);
        });
    },
    [applyRewards, onApiError],
  );

  /** A renderer reported evidence for its step. */
  const submit = useCallback(
    (stepId: string, draft: EvidenceDraft, debounce: boolean) => {
      latest.current.set(stepId, draft);
      setEvidence((prev) => ({
        ...prev,
        [stepId]: {
          kind: draft.kind,
          value: draft.value,
          // Re-interaction never loses completion (SPEC-007 shared UX).
          complete: draft.complete || Boolean(prev[stepId]?.complete),
          firstAttemptCorrect: prev[stepId]?.firstAttemptCorrect ?? null,
        },
      }));
      const timer = timers.current.get(stepId);
      if (timer !== undefined) window.clearTimeout(timer);
      if (debounce) {
        timers.current.set(
          stepId,
          window.setTimeout(() => {
            timers.current.delete(stepId);
            fire(stepId);
          }, TEXT_DEBOUNCE_MS),
        );
      } else {
        timers.current.delete(stepId);
        fire(stepId);
      }
    },
    [fire],
  );

  /** Push any pending debounced write for a step immediately (step advance). */
  const flushStep = useCallback(
    (stepId: string) => {
      const timer = timers.current.get(stepId);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.current.delete(stepId);
        fire(stepId);
      }
    },
    [fire],
  );

  // Unmount: best-effort flush of anything still debouncing (R2.3 — a hard
  // navigation mid-typing should not drop the last keystrokes).
  useEffect(() => {
    mounted.current = true;
    const timersMap = timers.current;
    const latestMap = latest.current;
    return () => {
      mounted.current = false;
      for (const [stepId, timer] of timersMap) {
        window.clearTimeout(timer);
        const draft = latestMap.get(stepId);
        if (draft) {
          void api
            .putEvidence(stepId, {
              kind: draft.kind,
              value: draft.value,
              complete: draft.complete,
            })
            .catch(() => undefined);
        }
      }
      timersMap.clear();
      // The next mount refetches; drop this lesson's cache so it can't serve
      // pre-save evidence.
      void queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
    };
  }, [lessonId, queryClient]);

  return { evidence, saveError, rewards, submit, flushStep };
}
