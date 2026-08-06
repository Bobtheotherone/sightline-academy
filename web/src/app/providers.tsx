import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "../lib/api";
import { SessionProvider } from "../lib/session";
import { ToastProvider } from "../components/Toast";
import { TooltipProvider } from "../components/Tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, err) => {
              // Don't hammer auth/permission/validation failures; retry flaky network twice.
              if (err instanceof ApiError && err.status > 0 && err.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TooltipProvider>
          <SessionProvider>{children}</SessionProvider>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
