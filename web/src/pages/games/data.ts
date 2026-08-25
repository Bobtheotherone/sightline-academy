/* Field Practice data layer (DESIGN-004 §Play): every game is assembled from
 * the curriculum's own authored payloads — checkpoint questions become sharp
 * rounds, playable steps become replays, the walkaround zones become the
 * order game. Nothing is invented, nothing is graded, and locked modules
 * stay locked: games draw only from lessons the rider has already earned.
 */
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  api,
  type LessonResponse,
  type ModuleOut,
  type RendererType,
  type StepOut,
} from "../../lib/api";
import type {
  CheckpointPayload,
  MultipleChoicePayload,
} from "../../activities/types";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  lessonTitle: string;
  prompt: string;
  options: MultipleChoicePayload["options"];
  explanation?: string;
}

export interface ReplayEntry {
  lessonId: string;
  lessonTitle: string;
  step: StepOut;
}

export interface ModuleGames {
  module: ModuleOut;
  /** Null while the module's lessons are still loading. */
  quiz: QuizQuestion[] | null;
  replays: ReplayEntry[] | null;
}

/** The renderers that make honest pure-play replays (no free text, no labs). */
const REPLAYABLE: RendererType[] = [
  "hotspot_list",
  "sort_categorize",
  "match",
  "branching_decision",
];

export const REPLAY_VERB: Partial<Record<RendererType, string>> = {
  hotspot_list: "Hunt the cues",
  sort_categorize: "Sort it clean",
  match: "Pair them up",
  branching_decision: "Ride the choices",
};

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

function extractQuiz(lesson: LessonResponse): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const step of lesson.steps) {
    let mc: MultipleChoicePayload | null = null;
    if (step.renderer === "checkpoint") {
      const payload = step.payload as CheckpointPayload;
      if (payload.mode === "multiple_choice") mc = payload.inner as MultipleChoicePayload;
    } else if (step.renderer === "multiple_choice") {
      mc = step.payload as MultipleChoicePayload;
    }
    if (mc?.options?.length) {
      out.push({
        id: step.id,
        lessonTitle: lesson.lesson.title,
        prompt: mc.prompt,
        options: mc.options,
        explanation: mc.explanation,
      });
    }
  }
  return out;
}

function extractReplays(lesson: LessonResponse): ReplayEntry[] {
  return lesson.steps
    .filter((s) => REPLAYABLE.includes(s.renderer))
    .map((step) => ({ lessonId: lesson.lesson.id, lessonTitle: lesson.lesson.title, step }));
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** The whole range: one entry per module, games filled in as lessons load. */
export function useFieldPractice() {
  const courseQuery = useQuery({ queryKey: ["course"], queryFn: api.course });
  const modules = courseQuery.data?.modules ?? [];
  const unlocked = modules.filter((m) => !m.locked);

  const moduleQueries = useQueries({
    queries: unlocked.map((m) => ({
      queryKey: ["module", m.id],
      queryFn: () => api.module(m.id),
    })),
  });
  const lessonIds = moduleQueries.flatMap((q) => q.data?.lessons.map((l) => l.id) ?? []);

  const lessonQueries = useQueries({
    queries: lessonIds.map((id) => ({
      queryKey: ["lesson", id],
      queryFn: () => api.lesson(id),
      staleTime: 5 * 60_000,
    })),
  });
  const lessons = lessonQueries
    .map((q) => q.data)
    .filter((d): d is LessonResponse => Boolean(d));
  const lessonsSettled = lessonQueries.length > 0 && lessonQueries.every((q) => !q.isLoading);

  const byModule = new Map<string, LessonResponse[]>();
  for (const lesson of lessons) {
    const list = byModule.get(lesson.lesson.moduleId) ?? [];
    list.push(lesson);
    byModule.set(lesson.lesson.moduleId, list);
  }

  const games: ModuleGames[] = modules.map((module) => {
    if (module.locked) return { module, quiz: null, replays: null };
    const own = (byModule.get(module.id) ?? []).sort(
      (a, b) => a.lesson.order - b.lesson.order,
    );
    if (!lessonsSettled && own.length === 0) return { module, quiz: null, replays: null };
    return {
      module,
      quiz: own.flatMap(extractQuiz),
      replays: own.flatMap(extractReplays),
    };
  });

  return {
    loading: courseQuery.isLoading,
    error: courseQuery.isError,
    games,
  };
}

/** One lesson's playable step, for the replay route. */
export function useReplayStep(lessonId: string | undefined, stepId: string | undefined) {
  const query = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => api.lesson(lessonId as string),
    enabled: Boolean(lessonId),
    staleTime: 5 * 60_000,
  });
  const step = query.data?.steps.find((s) => s.id === stepId) ?? null;
  return { query, lesson: query.data ?? null, step };
}

// ---------------------------------------------------------------------------
// Personal bests (local, per account — never sent to the server)
// ---------------------------------------------------------------------------

export interface Best {
  score: number;
  total: number;
  clean: boolean;
  at: string;
}

const bestKey = (userId: string, gameId: string) => `ts-practice:${userId}:${gameId}`;

export function loadBest(userId: string, gameId: string): Best | null {
  try {
    const raw = window.localStorage.getItem(bestKey(userId, gameId));
    return raw ? (JSON.parse(raw) as Best) : null;
  } catch {
    return null;
  }
}

/** Keeps the better run: higher score first, a clean run breaking ties. */
export function saveBest(userId: string, gameId: string, run: Best): Best {
  const prior = loadBest(userId, gameId);
  const better =
    !prior ||
    run.score > prior.score ||
    (run.score === prior.score && run.clean && !prior.clean);
  const kept = better ? run : prior;
  try {
    window.localStorage.setItem(bestKey(userId, gameId), JSON.stringify(kept));
  } catch {
    /* private mode etc. — bests are a nicety, never a failure */
  }
  return kept;
}
