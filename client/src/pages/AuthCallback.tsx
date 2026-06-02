/*
 * SPAZEHAUS — Auth Callback
 *
 * Landing page after the user clicks the magic link in their email.
 *
 * The Supabase JS client (configured with `detectSessionInUrl: true` and
 * PKCE flow) automatically reads the tokens from the URL on mount and
 * creates the session. AuthContext picks up the change via
 * onAuthStateChange. All we do here is show a loading state until
 * either the session resolves (then redirect to /) or it errors out.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HERO_BG = "/hero/warm.jpg";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { state, signOut } = useAuth();

  // Once the session is resolved (either way), route accordingly
  useEffect(() => {
    if (state.status === "authenticated") {
      // Successful sign-in → home
      const t = setTimeout(() => navigate("/"), 600); // small delay so user sees the green check
      return () => clearTimeout(t);
    }
    if (state.status === "unauthenticated") {
      // Session didn't materialise → back to login
      const t = setTimeout(() => navigate("/login"), 1200);
      return () => clearTimeout(t);
    }
  }, [state.status, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{
        background: `linear-gradient(to bottom, oklch(0.11 0.004 285 / 0.55), oklch(0.11 0.004 285 / 0.92)), url(${HERO_BG}) center/cover no-repeat`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl p-8 text-center space-y-4"
        style={{
          background: "oklch(1 0 0 / 0.06)",
          border: "1px solid oklch(1 0 0 / 0.12)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {state.status === "loading" && (
          <>
            <Loader2 size={28} className="mx-auto animate-spin" style={{ color: "oklch(0.72 0.09 68)" }} />
            <p className="text-sm text-white">Signing you in…</p>
          </>
        )}

        {state.status === "authenticated" && (
          <>
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "oklch(0.55 0.09 145 / 0.2)" }}
            >
              <Check size={20} style={{ color: "oklch(0.78 0.10 145)" }} strokeWidth={3} />
            </div>
            <p className="font-display text-base font-semibold text-white">Welcome, {state.staff.name.split(" ")[0]}</p>
            <p className="text-xs" style={{ color: "oklch(0.85 0 0 / 0.7)" }}>
              Taking you to the dashboard…
            </p>
          </>
        )}

        {state.status === "authenticated-no-staff" && (
          <>
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "oklch(0.60 0.12 25 / 0.2)" }}
            >
              <AlertCircle size={20} style={{ color: "oklch(0.85 0.12 25)" }} />
            </div>
            <p className="font-display text-base font-semibold text-white">Not authorised</p>
            <p className="text-xs" style={{ color: "oklch(0.85 0 0 / 0.7)" }}>
              Your email isn't linked to a SPAZEHAUS staff record. Ask your admin to add you, then try again.
            </p>
            <button
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
              className="text-[11px] font-label underline"
              style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.04em" }}
            >
              Sign out and try again
            </button>
          </>
        )}

        {state.status === "unauthenticated" && (
          <>
            <AlertCircle size={28} className="mx-auto" style={{ color: "oklch(0.85 0.12 25)" }} />
            <p className="text-sm text-white">Link expired or invalid</p>
            <p className="text-xs" style={{ color: "oklch(0.85 0 0 / 0.6)" }}>
              Sending you back to the login screen…
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
