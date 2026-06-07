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

async function fetchStaffForUser(user: User): Promise<StaffRow | null> {
  // Prefer the STABLE auth_user_id link. An admin can change staff.email after
  // the row is linked; keying off email alone would then orphan a validly-linked
  // user (their auth.users.email no longer matches). auth_user_id never changes.
  const byId = await supabase
    .from("staff")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (byId.error) {
    console.warn("[auth] fetchStaffForUser (by id) error:", byId.error.message);
  } else if (byId.data) {
    return byId.data as StaffRow;
  }

  // First-login fallback: before the link trigger has stamped auth_user_id, the
  // only way to find the row is by email. ilike = case-insensitive, matching the
  // DB trigger's lower(email) comparison.
  if (user.email) {
    const byEmail = await supabase
      .from("staff")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();
    if (byEmail.error) {
      console.warn("[auth] fetchStaffForUser (by email) error:", byEmail.error.message);
      return null;
    }
    return (byEmail.data as StaffRow | null) ?? null;
  }
  return null;
}

/** Resolve the AuthState from a freshly-known session (may be null = logged out). */
async function resolve(session: Session | null): Promise<AuthState> {
  if (!session?.user) return { status: "unauthenticated" };
  const user = session.user;
  const staff = await fetchStaffForUser(user);
  if (!staff) {
    return { status: "authenticated-no-staff", session, user };
  }
  return { status: "authenticated", session, user, staff };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const mounted = useRef(true);
  // Track the previous status + whether the user asked to sign out, so we can
  // tell an INVOLUNTARY logout (token expired/revoked) from a deliberate one.
  const prevStatusRef = useRef<AuthState["status"]>("loading");
  const userSignOutRef = useRef(false);

  const updateFromSession = useCallback(async (session: Session | null) => {
    const next = await resolve(session);
    if (!mounted.current) return;

    // Was-logged-in → now-logged-out, and the user didn't click sign out =
    // their session expired. Leave a one-shot flag the Login page surfaces.
    const wasAuthed = prevStatusRef.current === "authenticated" || prevStatusRef.current === "authenticated-no-staff";
    if (wasAuthed && next.status === "unauthenticated" && !userSignOutRef.current) {
      try { sessionStorage.setItem("spz:session-expired", "1"); } catch { /* ignore */ }
    }
    userSignOutRef.current = false;
    prevStatusRef.current = next.status;

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
    // Mark this as a deliberate sign-out so updateFromSession doesn't flag it
    // as an expired session.
    userSignOutRef.current = true;
    // Always clear local state even if the network sign-out fails — otherwise a
    // failed call (offline / 5xx) would strand the user "logged in" in the UI
    // (and break the AuthCallback escape button, which awaits this).
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[auth] signOut failed; clearing local session anyway:", err);
    } finally {
      setState({ status: "unauthenticated" });
      clearSentryUser();
    }
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await updateFromSession(data.session);
  }, [updateFromSession]);

  // Re-validate the staff record when the tab regains focus, so a role/status
  // change (or removal) made by an admin takes effect within a tab switch
  // instead of lingering for up to the ~1h token lifetime. Throttled so rapid
  // focus toggling doesn't spam the network.
  const lastRevalidateRef = useRef(0);
  useEffect(() => {
    function maybeRevalidate() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRevalidateRef.current < 30_000) return;
      lastRevalidateRef.current = now;
      void refresh();
    }
    window.addEventListener("focus", maybeRevalidate);
    document.addEventListener("visibilitychange", maybeRevalidate);
    return () => {
      window.removeEventListener("focus", maybeRevalidate);
      document.removeEventListener("visibilitychange", maybeRevalidate);
    };
  }, [refresh]);

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
