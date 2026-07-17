/*
 * SPAZEHAUS — PRIVACY & SECURITY
 * Sign-in is passwordless (magic link), so this screen manages:
 *   1. Two-factor authentication (TOTP) — enroll via QR, verify, disable.
 *   2. Session control — sign out of all devices (global sign-out).
 * Reached from Profile → Privacy & Security.
 */
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldCheck, Shield, Smartphone, LogOut, Check, Loader2, X } from "lucide-react";

type Factor = { id: string; status: "verified" | "unverified"; friendly_name?: string | null };
type EnrollData = { factorId: string; qr: string; secret: string };

const GOLD_GRADIENT = "linear-gradient(135deg, var(--acc-strong), var(--acc-2))";

export default function Security() {
  const { staff } = useAuth();

  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshFactors = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error(`Couldn't load 2FA status: ${error.message}`);
    } else {
      setFactors((data.totp ?? []) as Factor[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshFactors();
  }, [refreshFactors]);

  const verified = factors.find((f) => f.status === "verified");

  async function startEnroll() {
    setBusy(true);
    try {
      for (const f of factors.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setCode("");
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start 2FA setup");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!enroll) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.factorId, code });
      if (error) throw error;
      toast.success("Two-factor authentication enabled");
      setEnroll(null);
      setCode("");
      await refreshFactors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code didn't match. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (enroll) {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => {});
    }
    setEnroll(null);
    setCode("");
    void refreshFactors();
  }

  async function disable2fa() {
    if (!verified) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (error) throw error;
      toast.success("Two-factor authentication removed");
      await refreshFactors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove 2FA");
    } finally {
      setBusy(false);
    }
  }

  async function signOutEverywhere() {
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      setBusy(false);
      toast.error(`Couldn't sign out other devices: ${error.message}`);
      return;
    }
    toast.success("Signed out of all devices");
  }

  return (
    <div className="mobile-container" style={{ background: "var(--s-page)" }}>
      <AppHeader title="Privacy & Security" subtitle="TWO-FACTOR · SESSIONS" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-5 lg:px-8 lg:py-7 lg:max-w-[720px]">
        {/* ── Two-factor authentication ── */}
        <div className="rounded-2xl p-4 space-y-4" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: verified ? "oklch(0.55 0.09 145 / 15%)" : "oklch(0.62 0.09 68 / 12%)" }}>
              {verified ? <ShieldCheck size={17} style={{ color: "oklch(0.50 0.10 145)" }} /> : <Shield size={17} style={{ color: "var(--acc-ink)" }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--t-1)" }}>Two-factor authentication</p>
              <p className="text-xs" style={{ color: "var(--t-5)" }}>Protect sign-in with an authenticator app</p>
            </div>
            {!loading && (
              <span
                className="text-[10px] font-label px-2 py-1 rounded-md shrink-0"
                style={verified
                  ? { background: "oklch(0.55 0.09 145 / 15%)", color: "oklch(0.42 0.10 145)", letterSpacing: "0.04em", fontWeight: 700 }
                  : { background: "var(--s-2)", color: "var(--t-5)", letterSpacing: "0.04em", fontWeight: 700 }}
                data-testid="twofa-status"
              >
                {verified ? "ENABLED" : "OFF"}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-2"><Loader2 size={15} className="animate-spin" style={{ color: "var(--t-5)" }} /><span className="text-xs" style={{ color: "var(--t-5)" }}>Checking status…</span></div>
          ) : enroll ? (
            <div className="space-y-3">
              <p className="text-xs leading-relaxed" style={{ color: "var(--t-3)" }}>
                Scan this QR code with Google Authenticator, Authy, or 1Password, then enter the 6-digit code it shows.
              </p>
              <div className="flex justify-center">
                <div className="p-2 rounded-xl" style={{ background: "var(--s-card)", border: "1px solid var(--b-1)" }}>
                  <img src={enroll.qr} alt="Two-factor QR code" width={168} height={168} data-testid="twofa-qr" />
                </div>
              </div>
              <div className="rounded-xl p-2.5" style={{ background: "var(--s-3)", border: "1px solid var(--b-1)" }}>
                <p className="text-[10px] font-label mb-0.5" style={{ color: "var(--t-5)", letterSpacing: "0.06em" }}>CAN'T SCAN? ENTER THIS KEY</p>
                <p className="text-xs break-all" style={{ color: "var(--t-2)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }} data-testid="twofa-secret">{enroll.secret}</p>
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={{ color: "var(--t-5)", letterSpacing: "0.06em", fontWeight: 700 }}>6-DIGIT CODE</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  data-testid="twofa-code"
                  style={{ ...inputStyle, letterSpacing: "0.3em", textAlign: "center", fontSize: "1.1rem" }}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={cancelEnroll} disabled={busy} className="flex-1 py-2.5 rounded-xl text-sm font-label" style={{ background: "var(--s-2)", color: "var(--t-3)", border: "1px solid var(--b-1)", letterSpacing: "0.04em", opacity: busy ? 0.5 : 1 }}>Cancel</button>
                <motion.button whileTap={busy ? undefined : { scale: 0.97 }} onClick={confirmEnroll} disabled={busy} data-testid="twofa-verify" className="flex-1 py-2.5 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2" style={{ background: GOLD_GRADIENT, color: "oklch(1 0 0)", letterSpacing: "0.04em", opacity: busy ? 0.7 : 1 }}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Verify &amp; Enable
                </motion.button>
              </div>
            </div>
          ) : verified ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: "oklch(0.55 0.09 145 / 8%)", border: "1px solid oklch(0.55 0.09 145 / 25%)" }}>
                <Smartphone size={14} style={{ color: "oklch(0.45 0.10 145)" }} />
                <p className="text-xs" style={{ color: "oklch(0.35 0.05 145)" }}>An authenticator app is protecting your account.</p>
              </div>
              <button onClick={disable2fa} disabled={busy} data-testid="twofa-disable" className="w-full py-2.5 rounded-xl text-sm font-label flex items-center justify-center gap-2" style={{ background: "oklch(0.60 0.12 25 / 10%)", color: "oklch(0.50 0.12 25)", border: "1px solid oklch(0.60 0.12 25 / 25%)", letterSpacing: "0.04em", opacity: busy ? 0.6 : 1 }}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Remove two-factor
              </button>
            </div>
          ) : (
            <motion.button whileTap={busy ? undefined : { scale: 0.98 }} onClick={startEnroll} disabled={busy} data-testid="twofa-add" className="w-full py-2.5 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2" style={{ background: GOLD_GRADIENT, color: "oklch(1 0 0)", letterSpacing: "0.04em", opacity: busy ? 0.7 : 1 }}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
              Add authenticator app
            </motion.button>
          )}
        </div>

        {/* ── Session control ── */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.68 0.12 25 / 12%)" }}>
              <LogOut size={16} style={{ color: "oklch(0.58 0.12 25)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--t-1)" }}>Sign out of all devices</p>
              <p className="text-xs" style={{ color: "var(--t-5)" }}>Ends every active session, including this one</p>
            </div>
          </div>
          <button onClick={signOutEverywhere} disabled={busy} data-testid="signout-all" className="w-full py-2.5 rounded-xl text-sm font-label" style={{ background: "oklch(0.68 0.12 25 / 10%)", color: "oklch(0.55 0.12 25)", border: "1px solid oklch(0.68 0.12 25 / 25%)", letterSpacing: "0.04em", opacity: busy ? 0.6 : 1 }}>
            Sign out everywhere
          </button>
        </div>

        <p className="text-[10px] text-center font-label pt-1" style={{ color: "var(--t-5)", letterSpacing: "0.06em" }}>
          {staff ? `${staff.name.toUpperCase()} · ${staff.id}` : ""}
        </p>
      </div>
    </div>
  );
}

const cardStyle = { background: "var(--s-card)", border: "1px solid var(--b-1)" } as const;

const inputStyle: React.CSSProperties = {
  background: "var(--s-3)",
  border: "1px solid var(--b-1)",
  color: "var(--t-2)",
  borderRadius: "12px",
  padding: "0.7rem 0.9rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};
