/*
 * SPAZEHAUS DASHBOARD
 * Design: White/light corporate theme with warm gold accents
 * Hero section with generated background image (dark overlay preserved for readability)
 * Stats summary, quick actions, recent activity
 */
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  FolderOpen, Users, ClipboardCheck, TrendingUp,
  Plus, CalendarCheck, FileText, Camera,
  ChevronRight, Bell, Search, AlertCircle, Coins, PenSquare
} from "lucide-react";
import { projects, staffMembers, announcements } from "@/lib/mockData";
import { useAuth } from "@/contexts/AuthContext";
import { checkpointSummary } from "@/lib/lifecycleData";
import { formatRM } from "@/lib/quotationData";
import { reminderSummary } from "@/lib/reminderData";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/AuQSChINbJLLhITo.jpg";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } as const },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { staff } = useAuth();

  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "assigned").length;
  const pendingReview = projects.filter((p) => p.status === "under-review").length;
  const completedThisMonth = projects.filter((p) => p.status === "completed").length;
  const totalStaff = staffMembers.length;

  // Cross-project SOP checkpoint summary (Phase 2)
  const ckpt = checkpointSummary(projects.map((p) => ({ id: p.id, name: p.name, client: p.client })));
  const hasUrgent = ckpt.overdueCount > 0 || ckpt.thisWeekCount > 0 || ckpt.pendingSignsCount > 0;

  // Daily/weekly reminder summary (Phase 4)
  const rem = reminderSummary();

  const stats = [
    { label: "Active Projects", value: activeProjects, icon: FolderOpen, color: "oklch(0.52 0.09 68)", bg: "oklch(0.62 0.09 68 / 10%)" },
    { label: "Team Members", value: totalStaff, icon: Users, color: "oklch(0.45 0.09 240)", bg: "oklch(0.55 0.09 240 / 10%)" },
    { label: "Pending Review", value: pendingReview, icon: ClipboardCheck, color: "oklch(0.55 0.10 55)", bg: "oklch(0.65 0.10 55 / 10%)" },
    { label: "Completed", value: completedThisMonth, icon: TrendingUp, color: "oklch(0.45 0.09 145)", bg: "oklch(0.55 0.09 145 / 10%)" },
  ];

  const quickActions = [
    { label: "New Project", icon: Plus, color: "oklch(0.52 0.09 68)", bg: "oklch(0.62 0.09 68 / 10%)", path: "/projects/new" },
    { label: "Checkpoints", icon: AlertCircle, color: "oklch(0.50 0.12 25)", bg: "oklch(0.60 0.12 25 / 10%)", path: "/checkpoints" },
    { label: "Reminders", icon: Camera, color: "oklch(0.45 0.09 145)", bg: "oklch(0.55 0.09 145 / 10%)", path: "/reminders" },
    { label: "Customers", icon: Users, color: "oklch(0.45 0.09 240)", bg: "oklch(0.55 0.09 240 / 10%)", path: "/customers" },
    { label: "Leave", icon: CalendarCheck, color: "oklch(0.55 0.10 55)", bg: "oklch(0.65 0.10 55 / 10%)", path: "/company/leave" },
    { label: "Quotes", icon: FileText, color: "oklch(0.50 0.10 25)", bg: "oklch(0.60 0.10 25 / 10%)", path: "/quotations" },
  ];

  const recentActivity = [
    { text: "Eco Botanic Office — Final review submitted", time: "2h ago", type: "review" },
    { text: "Vinson Tan's leave approved (24–26 Feb)", time: "4h ago", type: "leave" },
    { text: "New candidate: Amirah Zulkifli — 2nd Interview", time: "Yesterday", type: "recruit" },
    { text: "Paragon Residence — 8/12 tasks completed", time: "Yesterday", type: "project" },
    { text: "Austin Heights — Photos uploaded (8 photos)", time: "2 days ago", type: "photo" },
    { text: "QT-2026-001 — Paragon Residence quotation accepted", time: "3 days ago", type: "quote" },
    { text: "QT-2026-002 — Eco Botanic invoice marked as paid", time: "5 days ago", type: "quote" },
  ];

  const activityDot: Record<string, string> = {
    review: "oklch(0.55 0.10 55)",
    leave: "oklch(0.45 0.09 240)",
    recruit: "oklch(0.45 0.09 145)",
    project: "oklch(0.52 0.09 68)",
    photo: "oklch(0.50 0.08 300)",
    quote: "oklch(0.50 0.10 25)",
  };

  return (
    <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
      {/* Hero Header — keeps dark overlay for contrast over image */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(to bottom, oklch(0.11 0.004 285 / 0.65) 0%, oklch(0.11 0.004 285 / 0.88) 70%, oklch(0.11 0.004 285) 100%), url(${HERO_BG}) center/cover no-repeat`,
          paddingTop: "env(safe-area-inset-top, 12px)",
        }}
      >
        {/* Gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, transparent, oklch(0.72 0.09 68), transparent)" }} />

        <div className="px-4 pt-4 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-label" style={{ color: "oklch(0.72 0.09 68)", letterSpacing: "0.12em" }}>SPAZEHAUS</p>
              <h1 className="font-display text-2xl font-semibold text-white leading-tight">Management</h1>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="w-9 h-9 flex items-center justify-center rounded-full relative"
                style={{ background: "oklch(1 0 0 / 12%)", border: "1px solid oklch(1 0 0 / 18%)" }}
              >
                <Bell size={16} className="text-white" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "oklch(0.72 0.09 68)" }} />
              </motion.button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "linear-gradient(135deg, oklch(0.62 0.09 68), oklch(0.52 0.08 65))", color: "white" }}
              >
                {staff?.avatar_code ?? "—"}
              </div>
            </div>
          </div>

          {/* Greeting */}
          <div className="mb-5">
            <p className="text-sm text-white/70">Good morning,</p>
            <p className="font-display text-xl font-semibold text-white">{staff?.name ?? ""}</p>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.72 0.09 68)" }}>{staff?.job_title ?? ""}</p>
          </div>

          {/* Search bar */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
            style={{ background: "oklch(1 0 0 / 10%)", border: "1px solid oklch(1 0 0 / 15%)" }}
          >
            <Search size={14} className="text-white/50" />
            <span className="text-sm text-white/40">Search projects, staff, tasks…</span>
          </div>
        </div>
      </div>

      {/* Body — white background */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-4 py-5 pb-28 space-y-6"
        style={{ background: "oklch(0.985 0.004 80)" }}
      >
        {/* Stats */}
        <motion.div variants={itemVariants}>
          <p className="sz-label mb-3">OVERVIEW</p>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                    <Icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold" style={{ color: "oklch(0.14 0.008 65)" }}>{s.value}</p>
                    <p className="text-xs leading-tight" style={{ color: "oklch(0.52 0.010 68)" }}>{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* SOP Checkpoint Alerts — Phase 2 */}
        {hasUrgent && (
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-3">
              <p className="sz-label">URGENT CHECKPOINTS</p>
              <button
                onClick={() => navigate("/checkpoints")}
                className="flex items-center gap-1 text-xs font-label"
                style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.04em" }}
              >
                View All <ChevronRight size={12} />
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/checkpoints")}
              className="w-full rounded-2xl p-4 text-left"
              style={{
                background: ckpt.overdueCount > 0
                  ? "linear-gradient(135deg, oklch(0.60 0.12 25 / 6%), oklch(1 0 0))"
                  : "oklch(1 0 0)",
                border: ckpt.overdueCount > 0
                  ? "1px solid oklch(0.60 0.12 25 / 30%)"
                  : "1px solid oklch(0.90 0.010 75)",
                boxShadow: ckpt.overdueCount > 0
                  ? "0 1px 12px oklch(0.60 0.12 25 / 12%)"
                  : "0 1px 8px oklch(0 0 0 / 0.04)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: ckpt.overdueCount > 0
                      ? "oklch(0.60 0.12 25 / 12%)"
                      : "oklch(0.62 0.09 68 / 12%)",
                  }}
                >
                  <AlertCircle
                    size={18}
                    style={{
                      color: ckpt.overdueCount > 0 ? "oklch(0.50 0.12 25)" : "oklch(0.42 0.09 68)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>
                    {ckpt.overdueCount > 0 ? "Action required" : "All on track"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>
                    Payment Collection · Document Sign SOP
                  </p>
                </div>
                <ChevronRight size={14} style={{ color: "oklch(0.65 0.008 68)" }} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div
                  className="rounded-xl p-2.5 text-center"
                  style={{
                    background: ckpt.overdueCount > 0 ? "oklch(0.60 0.12 25 / 8%)" : "oklch(0.985 0.004 80)",
                  }}
                >
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Coins size={10} style={{ color: ckpt.overdueCount > 0 ? "oklch(0.50 0.12 25)" : "oklch(0.55 0.008 65)" }} />
                    <p className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>OVERDUE</p>
                  </div>
                  <p
                    className="font-display text-lg font-bold"
                    style={{ color: ckpt.overdueCount > 0 ? "oklch(0.50 0.12 25)" : "oklch(0.30 0.008 65)" }}
                  >
                    {ckpt.overdueCount}
                  </p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: "oklch(0.985 0.004 80)" }}>
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <CalendarCheck size={10} style={{ color: "oklch(0.55 0.008 65)" }} />
                    <p className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>THIS WEEK</p>
                  </div>
                  <p className="font-display text-lg font-bold" style={{ color: "oklch(0.30 0.008 65)" }}>
                    {ckpt.thisWeekCount}
                  </p>
                </div>
                <div className="rounded-xl p-2.5 text-center" style={{ background: "oklch(0.985 0.004 80)" }}>
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <PenSquare size={10} style={{ color: "oklch(0.55 0.008 65)" }} />
                    <p className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>SIGNS</p>
                  </div>
                  <p className="font-display text-lg font-bold" style={{ color: "oklch(0.30 0.008 65)" }}>
                    {ckpt.pendingSignsCount}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center justify-between mt-3 pt-3"
                style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}
              >
                <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>
                  TOTAL OUTSTANDING
                </span>
                <span className="font-display text-sm font-semibold" style={{ color: "oklch(0.42 0.09 68)" }}>
                  {formatRM(ckpt.outstandingRM)}
                </span>
              </div>
            </motion.button>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <p className="sz-label mb-3">QUICK ACTIONS</p>
          <div className="grid grid-cols-3 gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: action.bg }}>
                    <Icon size={18} style={{ color: action.color }} />
                  </div>
                  <span className="text-[11px] font-label text-center leading-tight" style={{ color: "oklch(0.35 0.008 65)", letterSpacing: "0.02em" }}>{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Projects */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <p className="sz-label">RECENT PROJECTS</p>
            <button
              onClick={() => navigate("/projects")}
              className="flex items-center gap-1 text-xs font-label"
              style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.04em" }}
            >
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {projects.slice(0, 3).map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="rounded-2xl p-4"
                style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.14 0.008 65)" }}>{project.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{project.client}</p>
                  </div>
                  <span
                    className="status-pill ml-2 shrink-0"
                    style={{
                      background: project.status === "active" ? "oklch(0.62 0.09 68 / 12%)" :
                        project.status === "completed" ? "oklch(0.55 0.09 145 / 12%)" : "oklch(0.55 0.09 240 / 12%)",
                      color: project.status === "active" ? "oklch(0.42 0.09 68)" :
                        project.status === "completed" ? "oklch(0.40 0.09 145)" : "oklch(0.40 0.09 240)",
                    }}
                  >
                    {project.status === "active" ? "Active" : project.status === "completed" ? "Done" : "Review"}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{project.progress}% complete</span>
                  <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{project.tasksCompleted}/{project.taskCount} tasks</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.008 75)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, oklch(0.62 0.09 68), oklch(0.72 0.09 68))" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <p className="sz-label mb-3">RECENT ACTIVITY</p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
          >
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="px-4 py-3 flex items-start gap-3"
                style={{ borderBottom: i < recentActivity.length - 1 ? "1px solid oklch(0.93 0.008 75)" : "none" }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                  style={{ background: activityDot[item.type] || "oklch(0.52 0.09 68)" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.30 0.008 65)" }}>{item.text}</p>
                </div>
                <span className="text-[10px] shrink-0" style={{ color: "oklch(0.65 0.008 68)" }}>{item.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Latest Announcement */}
        {announcements[0] && (
          <motion.div variants={itemVariants}>
            <p className="sz-label mb-3">LATEST ANNOUNCEMENT</p>
            <div
              className="rounded-2xl p-4"
              style={{ background: "oklch(0.62 0.09 68 / 6%)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.62 0.09 68 / 15%)" }}>
                  <Bell size={14} style={{ color: "oklch(0.52 0.09 68)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>{announcements[0].title}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.40 0.008 65)" }}>{announcements[0].content.substring(0, 100)}…</p>
                  <p className="text-[10px] mt-1.5 font-label" style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.04em" }}>{announcements[0].date}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
