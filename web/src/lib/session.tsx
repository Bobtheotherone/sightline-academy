/* Session context (SPEC-002 §Frontend): the ['me'] query plus login / register /
 * logout mutations. React context carries the session; TanStack Query owns the
 * server state.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { api, ApiError, type LearnerStateOut, type MeResponse, type UserOut } from "./api";

interface SessionValue {
  user: UserOut | null;
  state: LearnerStateOut | null;
  /** True until the first ['me'] resolution. */
  isLoading: boolean;
  login: UseMutationResult<void, ApiError, { email: string; password: string }>;
  register: UseMutationResult<
    void,
    ApiError,
    { email: string; password: string; displayName: string }
  >;
  logout: UseMutationResult<void, ApiError, void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

async function fetchMe(): Promise<MeResponse | null> {
  try {
    return await api.me();
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: (failureCount, err) =>
      err instanceof ApiError && err.status === 0 && failureCount < 2,
  });

  const login = useMutation<void, ApiError, { email: string; password: string }>({
    mutationFn: async (body) => {
      const res = await api.login(body);
      const me: MeResponse = {
        user: res.user,
        state: { lastLessonId: null, lastStepId: null },
      };
      queryClient.setQueryData<MeResponse | null>(["me"], me);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const register = useMutation<
    void,
    ApiError,
    { email: string; password: string; displayName: string }
  >({
    mutationFn: async (body) => {
      const res = await api.register(body);
      const me: MeResponse = {
        user: res.user,
        state: { lastLessonId: null, lastStepId: null },
      };
      queryClient.setQueryData<MeResponse | null>(["me"], me);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logout = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      try {
        await api.logout();
      } catch (err) {
        // A session that is already gone is not a failure to log out — it IS
        // logged out. This is the normal case straight after deleting an
        // account: the session row went with it, so /auth/logout answers 401.
        // Rethrowing here used to skip the cleanup below, leaving the client
        // still holding the deleted user and looking signed in.
        const gone = err instanceof ApiError && (err.status === 401 || err.status === 0);
        if (!gone) throw err;
      } finally {
        // Unconditional: forgetting the user locally must never depend on a
        // network round trip we do not control.
        queryClient.clear();
        queryClient.setQueryData<MeResponse | null>(["me"], null);
      }
    },
  });

  const value = useMemo<SessionValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      state: meQuery.data?.state ?? null,
      isLoading: meQuery.isLoading,
      login,
      register,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, login, register, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
