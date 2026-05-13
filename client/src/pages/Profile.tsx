/*
 * SPAZEHAUS PROFILE PAGE
 * Design: Dark premium user profile with settings
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useStaffKpiRecords } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronRight, Bell, Shield, HelpCircle, LogOut, Moon, Globe } from "lucide-react";
import { toast } from "sonner";

const menuItems = [
  { icon: Bell, label: "Notifications", subtitle: "Push & in-app alerts", color: "oklch(0.52 0.09 68)" },
  { icon: Moon, label: "Appearance", subtitle: "Dark mode (default)", color: "oklch(0.70 0.09 240)" },
  { icon: Globe, label: "Language", subtitle: "English (Malaysia)", color: "oklch(0.80 0.12 68)" },
  { icon: Shield, label: "Privacy & Security", subtitle: "Password, 2FA", color: "oklch(0.60 0.07 145)" },
  { icon: HelpCircle, label: "Help & Support", subtitle: "FAQ, contact us", color: "oklch(0.68 0.12 25)" },
];

export default function Profile() {
  const [, navigate] = useLocation();
  const { staff, signOut } = useAuth();
  const { data: kpiRecords = [] } = useStaffKpiRecords(staff?.id);
  const [signingOut, setSigningOut] = useState(false);

  // Auth gate guarantees staff is non-null in this view, but TS doesn't know
  if (!staff) return null;

  // Most-recent KPI rating (defaults to staff.kpi_grade if no records yet)
  const currentRating: string = kpiRecords[0]?.rating ?? staff.kpi_grade ?? "—";
  const currentScore = kpiRecords[0]?.total_score;

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mobile-container">
      {/* Hero header */}
      <div
        className="relative pt-12 pb-6 px-4"
        style={{ background: "linear-gradient(135deg, oklch(1 0 0) 0%, oklch(0.18 0.006 65) 100%)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.09 68), transparent)" }} />

        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-3"
            style={{
              background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 25%), oklch(0.55 0.08 65 / 20%))",
              color: "oklch(0.52 0.09 68)",
              border: "2px solid oklch(0.62 0.09 68 / 25%)",
            }}
          >
            {staff.avatar_code}
          </motion.div>
          <h2 className="font-display text-2xl font-semibold text-neutral-900">{staff.name}</h2>
          <p className="text-sm mt-1" style={{ color: "oklch(0.52 0.09 68)" }}>{staff.job_title}</p>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{staff.dept} Department · {staff.id}</p>

          {/* KPI badge */}
          {currentRating !== "—" && (
            <div
              className="mt-3 px-4 py-1.5 rounded-full flex items-center gap-2"
              style={{ background: "oklch(0.62 0.09 68 / 12%)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
            >
              <span className="text-xs font-label" style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.04em" }}>KPI RATING</span>
              <span className="text-sm font-display font-bold" style={{ color: "oklch(0.52 0.09 68)" }}>{currentRating}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-5">
        {/* Contact info */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          {[
            { label: "Email", value: staff.email },
            { label: "Phone", value: staff.phone ?? "—" },
            { label: "Role", value: staff.role },
            { label: "Status", value: staff.status },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid oklch(0.93 0.008 75)" }}>
              <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{item.label}</span>
              <span className="text-xs" style={{ color: "oklch(0.25 0.008 65)" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Annual Leave", value: `${staff.leave_balance_annual}d`, color: "oklch(0.70 0.09 240)" },
            { label: "Medical Leave", value: `${staff.leave_balance_medical}d`, color: "oklch(0.52 0.09 68)" },
            { label: "Score", value: currentScore !== undefined ? String(currentScore) : "—", color: "oklch(0.60 0.07 145)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <p className="text-xl font-display font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-label mt-0.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Settings menu */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info(`${item.label} — coming soon`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                style={{ borderBottom: i < menuItems.length - 1 ? "1px solid oklch(0.93 0.008 75)" : "none" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.96 0.006 75)" }}>
                  <Icon size={15} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-neutral-900">{item.label}</p>
                  <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{item.subtitle}</p>
                </div>
                <ChevronRight size={14} style={{ color: "oklch(0.52 0.010 68)" }} />
              </motion.button>
            );
          })}
        </div>

        {/* Logout */}
        <motion.button
          whileTap={signingOut ? undefined : { scale: 0.97 }}
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
          style={{
            background: "oklch(0.68 0.12 25 / 10%)",
            border: "1px solid oklch(0.68 0.12 25 / 20%)",
            opacity: signingOut ? 0.6 : 1,
          }}
        >
          <LogOut size={15} style={{ color: "oklch(0.68 0.12 25)" }} />
          <span className="text-sm font-label" style={{ color: "oklch(0.68 0.12 25)", letterSpacing: "0.04em" }}>
            {signingOut ? "Signing out…" : "Sign Out"}
          </span>
        </motion.button>

        <p className="text-center text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>SPAZEHAUS MANAGEMENT APP v1.0.0</p>
      </div>
    </div>
  );
}
