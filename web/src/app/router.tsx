import { createBrowserRouter } from "react-router-dom";
import { PublicShell } from "../components/PublicShell";
import { AppShell } from "../components/AppShell";
import { AuthGuard } from "./AuthGuard";

/** Route-level lazy import helper (SPEC-002 §Frontend architecture). */
function page(loader: () => Promise<{ default: React.ComponentType }>) {
  return { lazy: async () => ({ Component: (await loader()).default }) };
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
      { path: "/journal", ...page(() => import("../pages/JournalPage")) },
      { path: "/journal/:artifactType", ...page(() => import("../pages/ArtifactPage")) },
      { path: "/progress", ...page(() => import("../pages/ProgressPage")) },
      { path: "/assessment", ...page(() => import("../pages/AssessmentPage")) },
      { path: "/certificate", ...page(() => import("../pages/CertificatePage")) },
      { path: "/tutor", ...page(() => import("../pages/TutorPage")) },
      { path: "/account", ...page(() => import("../pages/AccountPage")) },
      { path: "/instructor", ...page(() => import("../pages/InstructorPage")) },
      { path: "*", ...page(() => import("../pages/NotFoundPage")) },
    ],
  },
]);
