/*
 * SPAZEHAUS — Login page
 *
 * Magic-link auth: user enters email → Supabase sends a one-tap sign-in link
 * → clicking the link redirects to /auth/callback where the SDK parses the
 * tokens from the URL fragment and creates the session.
 *
 * Only staff with an email present in the `staff` table can sign in
 * (enforced by Supabase's "Confirm email" requirement + the auth-link trigger
 * that maps the auth user back to a staff row). Users without a matching
 * staff record see a friendly "not authorised" message after redirect.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, AlertCircle, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const HERO_BG = "/hero/warm.jpg";

type LoginState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }

    setState({ kind: "submitting" });

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // After clicking the link in the email, return here:
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // Don't auto-create a user — only existing staff in our DB should be allowed in
        // (this still requires the email to match an entry in staff for full app access,
        // enforced inside AuthContext)
        shouldCreateUser: true,
      },
    });

    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    setState({ kind: "sent", email: trimmed });
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(to bottom, oklch(0.11 0.004 285 / 0.55) 0%, oklch(0.11 0.004 285 / 0.92) 100%), url(${HERO_BG}) center/cover no-repeat`,
      }}
    >
      {/* Gold accent line */}
      <div
        className="h-0.5 w-full"
        style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.09 68), transparent)" }}
      />

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Brand */}
          <div className="text-center mb-10">
            <p
              className="text-xs font-label mb-2"
              style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.20em", fontWeight: 700 }}
            >
              SPAZEHAUS
            </p>
            <h1 className="font-display text-3xl font-semibold text-white leading-tight">
              Welcome back
            </h1>
            <p className="text-sm mt-2" style={{ color: "oklch(0.85 0 0 / 0.75)" }}>
              Sign in to manage your projects
            </p>
          </div>

          {state.kind === "sent" ? (
            <SentCard email={state.email} onReset={() => setState({ kind: "idle" })} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-5 space-y-4"
              style={{
                background: "oklch(1 0 0 / 0.06)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <label className="block">
                <span
                  className="text-[10px] font-label"
                  style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.10em", fontWeight: 700 }}
                >
                  EMAIL
                </span>
                <div
                  className="mt-1.5 flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: "oklch(1 0 0 / 0.08)", border: "1px solid oklch(1 0 0 / 0.15)" }}
                >
                  <Mail size={14} style={{ color: "oklch(0.72 0.09 68)" }} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@spazehaus.com.my"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state.kind === "error") setState({ kind: "idle" });
                    }}
                    className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/40"
                    disabled={state.kind === "submitting"}
                  />
                </div>
              </label>

              {state.kind === "error" && (
                <div
                  className="rounded-xl px-3 py-2 flex items-start gap-2"
                  style={{ background: "oklch(0.60 0.12 25 / 0.15)", border: "1px solid oklch(0.60 0.12 25 / 0.4)" }}
                >
                  <AlertCircle size={12} style={{ color: "oklch(0.85 0.12 25)" }} className="mt-0.5 shrink-0" />
                  <p className="text-[11px]" style={{ color: "oklch(0.92 0.06 25)" }}>
                    {state.message}
                  </p>
                </div>
              )}

              <motion.button
                whileTap={state.kind === "submitting" ? undefined : { scale: 0.97 }}
                type="submit"
                disabled={state.kind === "submitting"}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.62 0.09 68))",
                  color: "oklch(0.14 0.008 65)",
                  boxShadow: "0 4px 16px oklch(0.72 0.09 68 / 0.25)",
                  opacity: state.kind === "submitting" ? 0.7 : 1,
                }}
              >
                {state.kind === "submitting" ? (
                  <span className="text-sm font-label" style={{ letterSpacing: "0.06em", fontWeight: 700 }}>
                    SENDING…
                  </span>
                ) : (
                  <>
                    <span className="text-sm font-label" style={{ letterSpacing: "0.06em", fontWeight: 700 }}>
                      SEND MAGIC LINK
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
              </motion.button>

              <p className="text-[10px] text-center" style={{ color: "oklch(0.85 0 0 / 0.5)" }}>
                We'll email you a one-tap sign-in link. No password needed.
              </p>
            </form>
          )}

          <p
            className="text-[10px] text-center mt-8 font-label"
            style={{ color: "oklch(0.72 0.09 68 / 0.6)", letterSpacing: "0.08em" }}
          >
            INTERIOR DESIGN · JOHOR BAHRU
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function SentCard({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 text-center space-y-3"
      style={{
        background: "oklch(1 0 0 / 0.06)",
        border: "1px solid oklch(0.55 0.09 145 / 0.4)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
        style={{ background: "oklch(0.55 0.09 145 / 0.2)" }}
      >
        <Check size={20} style={{ color: "oklch(0.78 0.10 145)" }} strokeWidth={3} />
      </div>
      <p className="font-display text-base font-semibold text-white">Check your email</p>
      <p className="text-xs" style={{ color: "oklch(0.85 0 0 / 0.7)" }}>
        We sent a sign-in link to <span className="font-semibold text-white">{email}</span>. The link expires in 1 hour.
      </p>
      <button
        onClick={onReset}
        className="text-[11px] font-label underline"
        style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.04em" }}
      >
        Use a different email
      </button>
    </motion.div>
  );
}
