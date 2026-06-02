/*
 * SPAZEHAUS STAFF PROFILE PAGE
 * Design: Dark premium profile with hero header, tabs for info, leave, KPI
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useParams } from "wouter";
import { Phone, Mail, Calendar, Award, Loader2, Pencil, MessageCircle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useStaffById, useLeaveRequests, useStaffKpiRecords, canEditStaffRow, isAdminTier } from "@/lib/queries";
import { statusConfig } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import EditStaffSheet from "@/components/EditStaffSheet";

const tabs = ["Profile", "Leave", "KPI"];

// Company leave entitlements (firm policy). The DB stores only the REMAINING
// balance per staff (leave_balance_annual / _medical) — these totals are policy,
// not per-staff data, so they live here rather than masquerading as DB fields.
const LEAVE_ENTITLEMENT = { annual: 16, medical: 14 };

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("Profile");

  const { data: staff, isLoading } = useStaffById(id);
  const { data: allLeave = [] } = useLeaveRequests();
  const { data: kpiRecords = [] } = useStaffKpiRecords(id);
  const { staff: me } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <Loader2 size={20} className="animate-spin" style={{ color: "oklch(0.52 0.010 68)" }} />
      </div>
    );
  }
  if (!staff) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <p style={{ color: "oklch(0.52 0.010 68)" }}>Staff member not found</p>
      </div>
    );
  }
  const sc = statusConfig[staff.status as keyof typeof statusConfig];
  const staffLeave = allLeave.filter((l) => l.staff_id === staff.id);

  // Editing: admins may edit anyone; a staff member may edit their own row.
  const isOwnRow = !!me && me.id === staff.id;
  const canEdit = canEditStaffRow(me?.role, isOwnRow);
  const canEditAll = isAdminTier(me?.role);

  // Pick the most-recent month for the KPI tab "current rating" widget
  const latestKpi = kpiRecords[0]; // already sorted desc by year/month
  const currentRating: string = latestKpi?.rating ?? staff.kpi_grade ?? "—";
  const currentScore = latestKpi?.total_score;

  return (
    <div className="mobile-container">
      {/* Hero header with gradient */}
      <div
        className="relative pt-12 pb-6 px-4 lg:px-8"
        style={{
          background: "linear-gradient(135deg, oklch(0.23 0.018 65) 0%, oklch(0.12 0.006 285) 100%)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.09 68), transparent)" }} />
        <div className="flex items-start justify-between mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => window.history.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "oklch(1 0 0 / 15%)", border: "1px solid oklch(1 0 0 / 20%)" }}
          >
            <span style={{ color: "oklch(0.78 0.09 68)", fontSize: "18px" }}>‹</span>
          </motion.button>
          {canEdit && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-label"
              style={{ background: "oklch(1 0 0 / 15%)", border: "1px solid oklch(1 0 0 / 20%)", color: "oklch(0.82 0.09 68)", letterSpacing: "0.04em" }}
            >
              <Pencil size={13} />
              Edit
            </motion.button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 35%), oklch(0.55 0.08 65 / 28%))",
              color: "oklch(0.82 0.09 68)",
              border: "2px solid oklch(0.72 0.09 68 / 35%)",
            }}
          >
            {staff.avatar_code}
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">{staff.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: "oklch(0.78 0.09 68)" }}>{staff.job_title}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="status-pill" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
              {currentRating !== "—" && (
                <span className="text-xs font-label px-2 py-0.5 rounded-full" style={{ background: "oklch(0.72 0.09 68 / 18%)", color: "oklch(0.82 0.09 68)" }}>
                  KPI: {currentRating}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { label: "Annual Leave", value: staff.leave_balance_annual, unit: "days" },
            { label: "Medical Leave", value: staff.leave_balance_medical, unit: "days" },
            { label: "Service", value: serviceYears(staff.join_date), unit: "years" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(0.93 0.008 75)" }}>
              <p className="text-lg font-display font-semibold text-neutral-900">{s.value}</p>
              <p className="text-[9px] font-label mt-0.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid oklch(0.90 0.010 75)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-xs font-label relative"
            style={{
              color: activeTab === tab ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
              letterSpacing: "0.04em",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="staffTabIndicator"
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: "oklch(0.72 0.09 68)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 pb-24">
        {activeTab === "Profile" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <h4 className="font-display text-base font-semibold text-neutral-900">Personal Information</h4>
              {[
                { label: "Staff ID", value: staff.id, icon: Award },
                { label: "Role", value: staff.role, icon: null },
                { label: "Department", value: staff.dept, icon: null },
                { label: "Join Date", value: formatJoinDate(staff.join_date), icon: Calendar },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1" style={{ borderBottom: "1px solid oklch(0.93 0.008 75)" }}>
                  <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{item.label}</span>
                  <span className="text-xs font-medium" style={{ color: "oklch(0.20 0.008 65)" }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <h4 className="font-display text-base font-semibold text-neutral-900">Contact</h4>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 py-2"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.62 0.09 68 / 12%)" }}>
                  <Phone size={14} style={{ color: "oklch(0.52 0.09 68)" }} />
                </div>
                <span className="text-sm" style={{ color: "oklch(0.25 0.008 65)" }}>{staff.phone ?? "—"}</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center gap-3 py-2"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.70 0.09 240 / 15%)" }}>
                  <Mail size={14} style={{ color: "oklch(0.70 0.09 240)" }} />
                </div>
                <span className="text-sm" style={{ color: "oklch(0.25 0.008 65)" }}>{staff.email}</span>
              </motion.button>
              <div className="w-full flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.55 0.09 145 / 15%)" }}>
                  <MessageCircle size={14} style={{ color: "oklch(0.45 0.09 145)" }} />
                </div>
                <span className="text-sm" style={{ color: "oklch(0.25 0.008 65)" }}>
                  WhatsApp reminders {staff.whatsapp_opt_in ? "on" : "off"}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Leave" && (
          <div className="space-y-3">
            {/* Leave balance */}
            <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <h4 className="font-display text-base font-semibold text-neutral-900 mb-3">Leave Balance 2026</h4>
              {[
                { type: "Annual Leave", remaining: staff.leave_balance_annual, total: LEAVE_ENTITLEMENT.annual, color: "oklch(0.70 0.09 240)" },
                { type: "Medical Leave", remaining: staff.leave_balance_medical, total: LEAVE_ENTITLEMENT.medical, color: "oklch(0.68 0.12 25)" },
              ].map((lb) => (
                <div key={lb.type} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{lb.type}</span>
                    <span className="text-xs font-semibold" style={{ color: lb.color }}>{lb.remaining}/{lb.total} days left</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.90 0.010 75)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, (lb.remaining / lb.total) * 100))}%`, background: lb.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Leave history */}
            <div>
              <p className="text-xs font-label mb-2" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>LEAVE HISTORY</p>
              {staffLeave.length > 0 ? staffLeave.map((leave) => {
                const lsc = statusConfig[leave.status as keyof typeof statusConfig];
                return (
                  <div
                    key={leave.id}
                    className="rounded-xl p-3 mb-2"
                    style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">{leave.leave_type}</p>
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{leave.startDateLabel} — {leave.endDateLabel} ({leave.days}d)</p>
                        <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>{leave.reason}</p>
                      </div>
                      <span className="status-pill" style={{ background: lsc.bg, color: lsc.color }}>{lsc.label}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-xl p-6 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                  <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>No leave records found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "KPI" && (
          <div className="space-y-4">
            {/* Current rating */}
            <div
              className="rounded-2xl p-5 text-center"
              style={{ background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 12%), oklch(0.55 0.08 65 / 10%))", border: "1px solid oklch(0.62 0.09 68 / 15%)" }}
            >
              <p className="text-xs font-label mb-1" style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.08em" }}>CURRENT RATING</p>
              <p className="text-6xl font-display font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{currentRating}</p>
              <p className="text-sm mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
                {currentScore !== undefined ? `Score: ${currentScore}/100` : "Not yet rated"}
              </p>
            </div>

            {/* KPI breakdown — most recent month's parts */}
            {latestKpi && (
              <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                <h4 className="font-display text-base font-semibold text-neutral-900 mb-3">
                  Score Breakdown — {MONTHS_SHORT[latestKpi.month - 1]} {latestKpi.year}
                </h4>
                {[
                  { name: "Part A — Attendance & Leave", score: latestKpi.part_a_score, max: 30 },
                  { name: "Part B — Task Performance", score: latestKpi.part_b_score, max: 50 },
                  { name: "Part C — Attitude & Initiative", score: latestKpi.part_c_score, max: 20 },
                ].map((part) => (
                  <div key={part.name} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{part.name}</span>
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{part.score}/{part.max}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.90 0.010 75)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(part.score / part.max) * 100}%`, background: "linear-gradient(90deg, oklch(0.72 0.09 68), oklch(0.82 0.07 68))" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly grid */}
            <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <h4 className="font-display text-base font-semibold text-neutral-900 mb-3">Monthly Scores {new Date().getFullYear()}</h4>
              <div className="grid grid-cols-6 gap-2">
                {MONTHS_SHORT.map((month, i) => {
                  const rec = kpiRecords.find((k) => k.year === new Date().getFullYear() && k.month === i + 1);
                  const rating = rec?.rating ?? null;
                  return (
                    <div
                      key={month}
                      className="rounded-lg p-2 text-center"
                      style={{
                        background: rating === null ? "oklch(0.96 0.006 75)" : rating === "A" ? "oklch(0.62 0.09 68 / 15%)" : rating === "B" ? "oklch(0.70 0.09 240 / 20%)" : "oklch(0.68 0.12 25 / 20%)",
                        border: rating === null ? "1px solid oklch(0.93 0.008 75)" : "none",
                      }}
                    >
                      <p className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{month}</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: rating === null ? "oklch(0.52 0.010 68)" : rating === "A" ? "oklch(0.72 0.09 68)" : rating === "B" ? "oklch(0.70 0.09 240)" : "oklch(0.68 0.12 25)" }}>
                        {rating ?? "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <EditStaffSheet
        staff={staff}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        canEditAll={canEditAll}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatJoinDate(iso: string): string {
  // join_date comes back as YYYY-MM-DD; render it DD/MM/YYYY
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function serviceYears(joinIso: string): string {
  const join = new Date(joinIso);
  if (Number.isNaN(join.getTime())) return "—";
  const today = new Date();
  let years = today.getFullYear() - join.getFullYear();
  const m = today.getMonth() - join.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < join.getDate())) years -= 1;
  return years <= 0 ? "<1" : `${years}+`;
}
