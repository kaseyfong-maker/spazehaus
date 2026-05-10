/*
 * SPAZEHAUS REMINDERS DASHBOARD
 * Source: 2026 Annual Meeting PDF — "Reminder" pillar.
 *
 *   • Daily site status / close-door photo (per active site)
 *   • Weekly payment review
 *   • Weekly site report (per active project)
 *
 * The page is anchored to MOCK_TODAY (2026-05-10) so missed/upcoming buckets
 * are deterministic in the demo.
 */
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  Camera, Coins, FileText, Check, Clock, AlertCircle, Calendar,
  Flame, ChevronRight, Upload
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import {
  getReminders,
  reminderSummary,
  sitePhotoLogs,
  lastNDays,
  reminderTypeConfig,
  reminderStatusConfig,
  type Reminder,
  type ReminderType,
} from "@/lib/reminderData";
import { projects, staffMembers } from "@/lib/mockData";
import { MOCK_TODAY } from "@/lib/lifecycleData";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/AuQSChINbJLLhITo.jpg";

function fmtToday(): string {
  const dd = String(MOCK_TODAY.getDate()).padStart(2, "0");
  const mm = String(MOCK_TODAY.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${MOCK_TODAY.getFullYear()}`;
}

const typeIcon: Record<ReminderType, typeof Camera> = {
  "daily-site-photo": Camera,
  "weekly-payment-review": Coins,
  "weekly-site-report": FileText,
};

export default function Reminders() {
  const [, navigate] = useLocation();
  const today = fmtToday();
  const all = getReminders();
  const summary = reminderSummary();

  const todayItems = all.filter((r) => r.dueDate === today);
  const overdueItems = all.filter((r) => r.status === "overdue");
  const upcomingItems = all.filter((r) => r.status === "upcoming");

  return (
    <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
      <AppHeader title="Reminders" subtitle="DAILY · WEEKLY SOP" bgImage={HERO_BG} showBack showNotification />

      <div className="px-4 py-4 space-y-5 pb-24">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={Calendar}
            label="Today"
            primary={`${summary.todayCompleted}/${summary.todayCompleted + summary.todayPending}`}
            secondary={summary.todayPending > 0 ? `${summary.todayPending} pending upload` : "All caught up"}
            tint="oklch(0.42 0.09 68)"
            tintBg="oklch(0.62 0.09 68 / 10%)"
          />
          <KpiCard
            icon={AlertCircle}
            label="Missed"
            primary={String(summary.overdue)}
            secondary={summary.overdue > 0 ? "Catch up needed" : "Streak intact"}
            tint="oklch(0.50 0.12 25)"
            tintBg="oklch(0.60 0.12 25 / 10%)"
            urgent={summary.overdue > 0}
          />
          <KpiCard
            icon={Clock}
            label="This Week"
            primary={String(summary.thisWeekUpcoming)}
            secondary="Weekly review + reports"
            tint="oklch(0.45 0.10 55)"
            tintBg="oklch(0.65 0.10 55 / 10%)"
          />
          <KpiCard
            icon={Flame}
            label="Photo Streak"
            primary={`${summary.streak}d`}
            secondary={summary.streak >= 7 ? "On fire 🔥" : "Build the habit"}
            tint="oklch(0.38 0.09 145)"
            tintBg="oklch(0.55 0.09 145 / 10%)"
          />
        </div>

        {/* TODAY's section */}
        <section>
          <SectionHeader title="TODAY · DAILY DISCIPLINE" subtitle={`Close-door photos · ${today}`} icon={Camera} />
          {todayItems.length === 0 ? (
            <Empty message="No daily reminders today." />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
              {todayItems.map((r, i) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  isLast={i === todayItems.length - 1}
                  onAction={() => {
                    if (r.status === "completed") {
                      toast.success(`Already uploaded${r.completedAt ? ` at ${r.completedAt}` : ""}`);
                    } else {
                      toast.info(`Opening camera for ${r.projectName}…`);
                    }
                  }}
                  onCardClick={() => r.projectId && navigate(`/projects/${r.projectId}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* OVERDUE / MISSED */}
        {overdueItems.length > 0 && (
          <section>
            <SectionHeader
              title="MISSED · CATCH UP"
              subtitle={`${overdueItems.length} reminder${overdueItems.length === 1 ? "" : "s"} from earlier`}
              icon={AlertCircle}
              tint="oklch(0.50 0.12 25)"
              tintBg="oklch(0.60 0.12 25 / 12%)"
            />
            <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.60 0.12 25 / 30%)", boxShadow: "0 1px 12px oklch(0.60 0.12 25 / 8%)" }}>
              {overdueItems.map((r, i) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  isLast={i === overdueItems.length - 1}
                  onAction={() => toast.info(`Logging late entry for ${r.dueDate}…`)}
                  onCardClick={() => r.projectId && navigate(`/projects/${r.projectId}`)}
                />
              ))}
            </div>
          </section>
        )}

        {/* THIS WEEK */}
        <section>
          <SectionHeader title="THIS WEEK · CADENCE" subtitle="Friday weekly review + site reports" icon={Clock} />
          {upcomingItems.length === 0 ? (
            <Empty message="No weekly cadences scheduled." />
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
              {upcomingItems.map((r, i) => (
                <ReminderItem
                  key={r.id}
                  reminder={r}
                  isLast={i === upcomingItems.length - 1}
                  onAction={() => toast.info(`Opening: ${r.title}`)}
                  onCardClick={() => r.projectId && navigate(`/projects/${r.projectId}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 14-DAY PHOTO GRID */}
        <section>
          <SectionHeader title="14-DAY SITE PHOTO GRID" subtitle="Per active site · green = uploaded" icon={Camera} />
          <div className="rounded-2xl p-4 space-y-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
            {sitePhotoLogs.map((log) => {
              const project = projects.find((p) => p.id === log.projectId);
              if (!project) return null;
              const days = lastNDays(14);
              const uploaded = days.filter((d) => log.photos[d]?.uploaded).length;
              const pct = (uploaded / days.length) * 100;
              return (
                <div key={log.projectId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold" style={{ color: "oklch(0.20 0.008 65)" }}>
                      {project.name}
                    </p>
                    <span className="text-[10px] font-display font-semibold" style={{ color: "oklch(0.42 0.09 68)" }}>
                      {uploaded}/{days.length} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
                    {days.map((d) => {
                      const photo = log.photos[d];
                      const isToday = d === today;
                      const dayNum = d.split("/")[0];
                      return (
                        <div
                          key={d}
                          className="aspect-square rounded-md flex items-center justify-center"
                          title={`${d}${photo?.uploaded ? ` · uploaded ${photo.uploadedAt} by ${photo.by}` : " · missed"}`}
                          style={{
                            background: photo?.uploaded
                              ? "oklch(0.55 0.09 145 / 80%)"
                              : "oklch(0.60 0.12 25 / 60%)",
                            border: isToday ? "1.5px solid oklch(0.42 0.09 68)" : "none",
                            color: "white",
                            fontSize: "8px",
                            fontWeight: 600,
                          }}
                        >
                          {photo?.uploaded ? <Check size={8} strokeWidth={4} /> : dayNum}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}>
              <LegendDot color="oklch(0.55 0.09 145 / 80%)" label="Uploaded" />
              <LegendDot color="oklch(0.60 0.12 25 / 60%)" label="Missed" />
              <LegendDot color="oklch(1 0 0)" border="oklch(0.42 0.09 68)" label="Today" />
            </div>
          </div>
        </section>

        <p className="text-[10px] text-center font-label pt-2" style={{ color: "oklch(0.65 0.008 68)", letterSpacing: "0.06em" }}>
          SPAZEHAUS · DAILY + WEEKLY REMINDER SOP · 2026 ANNUAL MEETING
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tint,
  tintBg,
  urgent,
}: {
  icon: typeof Camera;
  label: string;
  primary: string;
  secondary: string;
  tint: string;
  tintBg: string;
  urgent?: boolean;
}) {
  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.015, 1] } : undefined}
      transition={urgent ? { repeat: Infinity, duration: 2.4 } : undefined}
      className="rounded-2xl p-3"
      style={{
        background: "oklch(1 0 0)",
        border: urgent ? `1px solid ${tint}` : "1px solid oklch(0.90 0.010 75)",
        boxShadow: urgent ? `0 1px 12px ${tintBg}` : "0 1px 8px oklch(0 0 0 / 0.04)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tintBg }}>
          <Icon size={14} style={{ color: tint }} />
        </div>
        <p className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>
          {label.toUpperCase()}
        </p>
      </div>
      <p className="font-display text-lg font-semibold leading-none truncate" style={{ color: urgent ? tint : "oklch(0.14 0.008 65)" }}>
        {primary}
      </p>
      <p className="text-[10px] mt-1 truncate" style={{ color: "oklch(0.52 0.010 68)" }}>
        {secondary}
      </p>
    </motion.div>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  tint,
  tintBg,
}: {
  title: string;
  subtitle: string;
  icon: typeof Camera;
  tint?: string;
  tintBg?: string;
}) {
  const c = tint || "oklch(0.42 0.09 68)";
  const cb = tintBg || "oklch(0.62 0.09 68 / 10%)";
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cb }}>
        <Icon size={16} style={{ color: c }} />
      </div>
      <div>
        <p className="font-label text-xs" style={{ color: "oklch(0.20 0.008 65)", letterSpacing: "0.10em", fontWeight: 700 }}>
          {title}
        </p>
        <p className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>{subtitle}</p>
      </div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
      <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{message}</p>
    </div>
  );
}

function ReminderItem({
  reminder,
  isLast,
  onAction,
  onCardClick,
}: {
  reminder: Reminder;
  isLast: boolean;
  onAction: () => void;
  onCardClick?: () => void;
}) {
  const tc = reminderTypeConfig[reminder.type];
  const sc = reminderStatusConfig[reminder.status];
  const Icon = typeIcon[reminder.type];
  const assignee = staffMembers.find((s) => s.avatar === reminder.assignee);

  return (
    <div
      className="px-3 py-3 flex items-center gap-3"
      style={{ borderBottom: isLast ? "none" : "1px solid oklch(0.95 0.008 75)" }}
    >
      <button
        onClick={onCardClick}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        disabled={!onCardClick}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: tc.bg }}
        >
          <Icon size={15} style={{ color: tc.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.14 0.008 65)" }}>
            {reminder.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span
              className="text-[9px] font-label px-1.5 py-0.5 rounded-md"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: "0.04em", fontWeight: 700 }}
            >
              {sc.label.toUpperCase()}
            </span>
            <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>
              · {reminder.dueDate}
            </span>
            {assignee && (
              <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>
                · {assignee.name}
              </span>
            )}
          </div>
          {reminder.note && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: "oklch(0.55 0.008 65)" }}>
              {reminder.note}
            </p>
          )}
        </div>
      </button>
      {reminder.status === "completed" ? (
        <Check size={14} style={{ color: sc.color }} strokeWidth={3} />
      ) : (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1"
          style={{
            background: reminder.status === "overdue" ? "oklch(0.60 0.12 25 / 12%)" : "oklch(0.62 0.09 68 / 12%)",
            color: reminder.status === "overdue" ? "oklch(0.50 0.12 25)" : "oklch(0.42 0.09 68)",
          }}
        >
          {reminder.type === "daily-site-photo" ? (
            <Upload size={11} />
          ) : (
            <ChevronRight size={11} />
          )}
          <span className="text-[10px] font-label" style={{ letterSpacing: "0.04em", fontWeight: 700 }}>
            {reminder.type === "daily-site-photo" ? "UPLOAD" : "OPEN"}
          </span>
        </motion.button>
      )}
    </div>
  );
}

function LegendDot({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-3 rounded-sm"
        style={{ background: color, border: border ? `1.5px solid ${border}` : "none" }}
      />
      <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>{label}</span>
    </div>
  );
}
