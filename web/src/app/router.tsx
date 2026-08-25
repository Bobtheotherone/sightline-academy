import { createBrowserRouter } from "react-router-dom";
import { PublicShell } from "../components/PublicShell";
import { AppShell } from "../components/AppShell";
import { AuthGuard } from "./AuthGuard";

/** One-shot guard so a failed chunk fetch reloads at most once per tab. */
const CHUNK_RELOAD_FLAG = "sightline:chunk-reload";

function flag(op: "get" | "set" | "clear"): boolean {
  // Private windows and blocked site data make sessionStorage throw on access.
  try {
    if (op === "get") return sessionStorage.getItem(CHUNK_RELOAD_FLAG) !== null;
    if (op === "set") sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
    else sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    // No storage: fall through. Worst case is no retry, never a reload loop.
  }
  return false;
}

/** Route-level lazy import helper (SPEC-002 §Frontend architecture).
 *
 * Recovers from the stale-chunk trap a deploy creates. Every build renames the
 * hashed chunks, but a tab opened BEFORE the deploy keeps the old chunk map in
 * memory — client-side navigation never refetches index.html, so the map is
 * never refreshed. The first lazy route the learner opens then requests a file
 * that no longer exists, and `vite preview` answers unknown paths with
 * index.html at HTTP 200 / text/html. The browser tries to execute HTML as a
 * module and throws "Failed to fetch dynamically imported module" — a fetch
 * that reports success while returning the wrong thing, which is why it
 * survives a hard refresh of a different tab and reads as a broken app.
 *
 * A single reload fetches the current index.html and chunk map and lands the
 * learner back on the same URL. The flag makes it exactly one attempt, so a
 * genuinely broken chunk still surfaces its error instead of looping.
 */
function page(loader: () => Promise<{ default: React.ComponentType }>) {
  return {
    lazy: async () => {
      try {
        const mod = await loader();
        flag("clear");
        return { Component: mod.default };
      } catch (err) {
        if (!flag("get")) {
          flag("set");
          window.location.reload();
          return await new Promise<never>(() => {}); // hold until the reload wins
        }
        throw err;
      }
    },
  };
}

/** Every route from SPEC-010 — this list mirrors STARTER/route-manifest.json. */
export const router = createBrowserRouter([
  // Dev-only renderer sandbox (SPEC-007 verification surface). The DEV guard
  // is compile-time, so the lazy chunk is dead-code-eliminated from prod builds.
  ...(import.meta.env.DEV
    ? [{ path: "/dev/renderers", ...page(() => import("../pages/dev/RenderersSandbox")) }]
    : []),
  {
    element: <PublicShell />,
    children: [
      { path: "/", ...page(() => import("../pages/LandingPage")) },
      { path: "/login", ...page(() => import("../pages/auth/LoginPage")) },
      { path: "/register", ...page(() => import("../pages/auth/RegisterPage")) },
      { path: "/verify/:code", ...page(() => import("../pages/VerifyPage")) },
    ],
  },
  {
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { path: "/dashboard", ...page(() => import("../pages/DashboardPage")) },
      { path: "/course", ...page(() => import("../pages/CoursePage")) },
      { path: "/course/:moduleId", ...page(() => import("../pages/ModulePage")) },
      { path: "/learn/:lessonId", ...page(() => import("../pages/LessonPage")) },
      { path: "/games", ...page(() => import("../pages/games/GamesPage")) },
      { path: "/games/walkaround-order", ...page(() => import("../pages/games/OrderPage")) },
      { path: "/games/:moduleId/round", ...page(() => import("../pages/games/RoundPage")) },
      {
        path: "/games/replay/:lessonId/:stepId",
        ...page(() => import("../pages/games/ReplayPage")),
      },
      { path: "/journal", ...page(() => import("../pages/JournalPage")) },
      { path: "/journal/:artifactType", ...page(() => import("../pages/ArtifactPage")) },
      { path: "/progress", ...page(() => import("../pages/ProgressPage")) },
      { path: "/assessment", ...page(() => import("../pages/AssessmentPage")) },
      { path: "/certificate", ...page(() => import("../pages/CertificatePage")) },
      { path: "/tutor", ...page(() => import("../pages/TutorPage")) },
      { path: "/account", ...page(() => import("../pages/AccountPage")) },
      { path: "/subscribe", ...page(() => import("../pages/SubscribePage")) },
      { path: "/instructor", ...page(() => import("../pages/InstructorPage")) },
      { path: "*", ...page(() => import("../pages/NotFoundPage")) },
    ],
  },
]);
