import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useSession } from "../lib/session";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";

/**
 * Auth guard for the app shell (SPEC-010): unauthenticated visits redirect to
 * /login preserving the destination (R1.4). While the ['me'] query resolves,
 * a shell-shaped skeleton holds the layout.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <SkeletonGroup label="Checking your session" className="min-h-screen">
        <div className="border-b border-line-200 bg-paper-0">
          <div className="mx-auto flex h-16 max-w-page items-center justify-between px-6 lg:px-12">
            <Skeleton className="h-9 w-36" />
            <div className="flex gap-3">
              <Skeleton className="hidden h-9 w-64 lg:block" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-page flex-col gap-6 px-6 lg:px-12">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-44 w-full" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </SkeletonGroup>
    );
  }

  if (!user) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
}
