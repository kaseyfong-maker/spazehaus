/*
 * SPAZEHAUS — Auth context
 *
 * Wraps the app and exposes:
 *   - session: current Supabase session (null when logged out)
 *   - user: the auth.users record (email, id, etc.)
 *   - staff: the linked public.staff record (name, role, dept, …)
 *   - loading: true while we resolve the initial session on mount
 *   - signOut(): logs out + clears local session
 *
 * On first sign-in, the Postgres trigger `link_staff_to_auth_user` (added in
 * supabase/migrations/20260512000004_auth_trigger.sql) auto-links the
 * staff row by email. We then re-fetch staff once the trigger has fired.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase, type Session, type User } from "@/lib/supabase";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";
import type { StaffRow } from "@/lib/dbTypes";

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: Session; user: User; staff: StaffRow }
  | { status: "authenticated-no-staff"; session: Session; user: User };

type AuthContextValue = {
  state: AuthState;
  // Convenience accessors — undefined when not authenticated
  session: Session | null;
  user: User | null;
  staff: StaffRow | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchStaffByEmail(email: string): Promise<StaffRow | null> {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) {
    console.warn("[auth] fetchStaffByEmail error:", error.message);
    return null;
  }
  return (data as StaffRow | null) ?? null;
}

/** Resolve the AuthState from a freshly-known session (may be null = logged out). */
async function resolve(session: Session | null): Promise<AuthState> {
  if (!session?.user) return { status: "unauthenticated" };
  const user = session.user;
  const email = user.email;
  if (!email) {
    return { status: "authenticated-no-staff", session, user };
  }
  const staff = await fetchStaffByEmail(email);
  if (!staff) {
    return { status: "authenticated-no-staff", session, user };
  }
  return { status: "authenticated", session, user, staff };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const mounted = useRef(true);

  const updateFromSession = useCallback(async (session: Session | null) => {
    const next = await resolve(session);
    if (!mounted.current) return;
    setState(next);

    // Mirror the resolved identity into Sentry so any captured error is
    // tagged with the acting staff member. Pass nulls on sign-out so
    // unauthenticated errors don't get attributed to the previous user.
    if (next.status === "authenticated") {
      setSentryUser(next.user.id, next.user.email ?? null, next.staff);
    } else if (next.status === "authenticated-no-staff") {
      setSentryUser(next.user.id, next.user.email ?? null, null);
    } else {
      clearSentryUser();
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Initial load — fetch current session (if any persisted in localStorage)
    supabase.auth
      .getSession()
      .then(({ data }) => updateFromSession(data.session))
      .catch((err) => {
        console.warn("[auth] getSession failed:", err);
        if (mounted.current) setState({ status: "unauthenticated" });
      });

    // Live updates — fires on sign-in, sign-out, token refresh, magic-link redirect, etc.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void updateFromSession(session);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [updateFromSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ status: "unauthenticated" });
    clearSentryUser();
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await updateFromSession(data.session);
  }, [updateFromSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session: state.status === "authenticated" || state.status === "authenticated-no-staff" ? state.session : null,
      user: state.status === "authenticated" || state.status === "authenticated-no-staff" ? state.user : null,
      staff: state.status === "authenticated" ? state.staff : null,
      loading: state.status === "loading",
      signOut,
      refresh,
    }),
    [state, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
