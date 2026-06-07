/*
 * SPAZEHAUS — No staff profile
 *
 * Shown when a visitor has a valid Supabase session but no matching row in the
 * `staff` table (status "authenticated-no-staff"). Without this, App.tsx would
 * render nothing and they'd be stuck on a blank screen — e.g. reopening a tab
 * with a persisted session for an account whose staff record was removed.
 *
 * The `staff_email_exists` gate on the Login page should make this rare for new
 * sign-ins, so this is a safety net: explain the situation and offer a way out.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HERO_BG = "/hero/warm.jpg";

export default function NoStaffProfile() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // AuthContext flips to "unauthenticated"; App.tsx then redirects to /login.
    } catch {
      setSigningOut(false);
    }
  }

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
        <div
          className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
          style={{ background: "oklch(0.60 0.12 25 / 0.2)" }}
        >
          <ShieldAlert size={20} style={{ color: "oklch(0.85 0.12 25)" }} />
        </div>

        <p className="font-display text-base font-semibold text-white">No staff profile found</p>

        <p className="text-xs leading-relaxed" style={{ color: "oklch(0.85 0 0 / 0.7)" }}>
          {user?.email ? (
            <>
              <span className="font-semibold text-white">{user.email}</span> isn't linked to a
              SPAZEHAUS staff record. Ask an admin to add you to the team, then sign in again.
            </>
          ) : (
            <>This account isn't linked to a SPAZEHAUS staff record. Ask an admin to add you, then sign in again.</>
          )}
        </p>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.62 0.09 68))",
            color: "oklch(0.14 0.008 65)",
            boxShadow: "0 4px 16px oklch(0.72 0.09 68 / 0.25)",
            opacity: signingOut ? 0.7 : 1,
          }}
        >
          <LogOut size={14} />
          <span className="text-sm font-label" style={{ letterSpacing: "0.06em", fontWeight: 700 }}>
            {signingOut ? "SIGNING OUT…" : "SIGN OUT"}
          </span>
        </button>
      </motion.div>
    </div>
  );
}
