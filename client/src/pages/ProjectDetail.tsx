/*
 * SPAZEHAUS PROJECT DETAIL PAGE
 * Design: White/light corporate theme with gold accents
 * Tabs: Overview, Lifecycle, Tasks, Quotations, Photos, Team
 *
 * Lifecycle tab implements the 2026 Annual Meeting workflow —
 * 29 stages, 5 Payment Collection Checkpoints (① ② ③ ④ ⑤),
 * 6 Document Sign Checkpoints (3 contracts + 3 drawing sign-offs).
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useLocation } from "wouter";
import { Upload, UserPlus, CheckSquare, MapPin, Maximize2, Phone, FileText, Receipt, Coins, PenSquare, Check, Clock, AlertCircle, Share2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import MarkCollectedSheet, { type MarkCollectedTarget } from "@/components/MarkCollectedSheet";
import SignDocumentSheet, { type SignDocumentTarget } from "@/components/SignDocumentSheet";
import { statusConfig, priorityConfig } from "@/lib/mockData";
import { statusConfig as qStatusConfig, computeTotals, formatRM } from "@/lib/quotationData";
import {
  LIFECYCLE_STAGES,
  paymentSummary,
  signatureSummary,
  stageStatus,
  phaseColors,
  checkpointStatusConfig,
  type StagePhase,
  type CheckpointStatus,
} from "@/lib/lifecycleData";
import {
  useProject,
  useAllStaff,
  useQuotations,
  useProjectLifecycle,
  canEditPayments,
  canEditSignatures,
  getSignatureDocUrl,
  isStorageDocRef,
  type PaymentRecord,
  type DocumentSignRecord,
} from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CARD_BG1 = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/VpBogREhxCtoLqGD.jpg";
const CARD_BG2 = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/WVqmmFphKswecRCt.jpg";

const tabs = ["Overview", "Lifecycle", "Tasks", "Quotations", "Photos", "Team"];

const sampleTasks = [
  { id: 1, name: "Space Planning & Layout", area: "All Areas", status: "completed", assignee: "WL", priority: "high", dueDate: "15/01/2026" },
  { id: 2, name: "3D Rendering & Visualization", area: "Living Room", status: "completed", assignee: "DC", priority: "high", dueDate: "25/01/2026" },
  { id: 3, name: "Material & Finishes Selection", area: "All Areas", status: "completed", assignee: "WL", priority: "medium", dueDate: "01/02/2026" },
  { id: 4, name: "Contractor Briefing", area: "All Areas", status: "completed", assignee: "WH", priority: "high", dueDate: "05/02/2026" },
  { id: 5, name: "Flooring Installation", area: "Living Room", status: "in-progress", assignee: "LH", priority: "high", dueDate: "28/02/2026" },
  { id: 6, name: "Feature Wall — TV Console", area: "Living Room", status: "in-progress", assignee: "JL", priority: "medium", dueDate: "05/03/2026" },
  { id: 7, name: "Master Bedroom Carpentry", area: "Master Bedroom", status: "pending", assignee: "JL", priority: "high", dueDate: "15/03/2026" },
  { id: 8, name: "Kitchen Cabinet Installation", area: "Kitchen", status: "pending", assignee: "LH", priority: "high", dueDate: "20/03/2026" },
  { id: 9, name: "Lighting Design & Installation", area: "All Areas", status: "pending", assignee: "WL", priority: "medium", dueDate: "01/04/2026" },
  { id: 10, name: "Furniture Delivery & Placement", area: "All Areas", status: "pending", assignee: "WH", priority: "medium", dueDate: "15/04/2026" },
  { id: 11, name: "Final Walkthrough & Snag List", area: "All Areas", status: "pending", assignee: "GT", priority: "high", dueDate: "25/04/2026" },
  { id: 12, name: "Client Handover", area: "All Areas", status: "pending", assignee: "GT", priority: "high", dueDate: "30/04/2026" },
];

const taskStatusConfig: Record<string, { label: string; bg: string; color: string }> = {
  "completed":   { label: "Done",        bg: "oklch(0.55 0.09 145 / 12%)", color: "oklch(0.38 0.09 145)" },
  "in-progress": { label: "In Progress", bg: "oklch(0.55 0.09 240 / 12%)", color: "oklch(0.38 0.09 240)" },
  "pending":     { label: "Pending",     bg: "oklch(0.62 0.09 68 / 12%)",  color: "oklch(0.42 0.09 68)" },
};

/** Read `?tab=` from the URL once on mount so deep-links from Checkpoints land on the right tab. */
function getInitialTab(): string {
  if (typeof window === "undefined") return "Overview";
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tab");
  if (!t) return "Overview";
  // Normalise — accept any casing
  const lower = t.toLowerCase();
  return tabs.find((x) => x.toLowerCase() === lower) || "Overview";
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState(() => getInitialTab());

  const { data: project, isLoading } = useProject(id);
  const { data: allStaff = [] } = useAllStaff();
  const { data: allQuotations = [] } = useQuotations();

  if (isLoading) {
    return (
      <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
        <AppHeader title="Loading…" subtitle="—" showBack compact />
      </div>
    );
  }
  if (!project) {
    return (
      <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
        <AppHeader title="Project not found" subtitle="—" showBack compact />
        <div className="px-4 py-8 text-center">
          <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>
            We couldn't find this project. It may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  const sc = statusConfig[project.status as keyof typeof statusConfig];
  const pc = priorityConfig[project.priority as keyof typeof priorityConfig];
  const teamMembers = allStaff.filter((s) => project.team.includes(s.avatar_code));

  return (
    <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
      <AppHeader title={project.name} subtitle={project.type.toUpperCase()} showBack compact />

      <div className="pb-24">
        {/* Hero image */}
        <div
          className="h-44 relative overflow-hidden"
          style={{
            background: `linear-gradient(to bottom, oklch(0.11 0.004 285 / 0.3), oklch(0.11 0.004 285 / 0.75)), url(${project.type === "Residential" ? CARD_BG2 : CARD_BG1}) center/cover no-repeat`,
          }}
        >
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-end justify-between">
              <div>
                <span className="status-pill" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                <p className="text-white font-display text-lg font-semibold mt-1">{project.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} style={{ color: "oklch(0.82 0.09 68)" }} />
                  <span className="text-xs" style={{ color: "oklch(0.82 0.09 68)" }}>{project.location}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">Budget</p>
                <p className="text-white font-semibold text-sm">RM {project.budget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-3" style={{ background: "oklch(1 0 0)", borderBottom: "1px solid oklch(0.90 0.010 75)" }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>Overall Progress — {project.tasksCompleted}/{project.taskCount} tasks</span>
            <span className="text-sm font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{project.progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.008 75)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, oklch(0.62 0.09 68), oklch(0.72 0.09 68))" }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 py-3 flex gap-2" style={{ background: "oklch(1 0 0)", borderBottom: "1px solid oklch(0.90 0.010 75)" }}>
          {[
            { label: "Upload Photos", icon: Upload, action: () => toast.info("Photo upload coming soon") },
            { label: "Assign Tasks", icon: UserPlus, action: () => toast.info("Task assignment coming soon") },
            { label: "Review", icon: CheckSquare, action: () => toast.info("Review coming soon") },
          ].map((btn) => {
            const Icon = btn.icon;
            return (
              <motion.button
                key={btn.label}
                whileTap={{ scale: 0.95 }}
                onClick={btn.action}
                className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl"
                style={{ background: "oklch(0.985 0.004 80)", border: "1px solid oklch(0.90 0.010 75)" }}
              >
                <Icon size={16} style={{ color: "oklch(0.52 0.09 68)" }} />
                <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{btn.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Tabs */}
        <div
          className="flex overflow-x-auto scrollbar-hide"
          style={{ background: "oklch(1 0 0)", borderBottom: "1px solid oklch(0.90 0.010 75)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="shrink-0 px-4 py-3 text-xs font-label relative"
              style={{
                color: activeTab === tab ? "oklch(0.52 0.09 68)" : "oklch(0.52 0.010 68)",
                letterSpacing: "0.04em",
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="tabIndicator"
                  className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                  style={{ background: "oklch(0.62 0.09 68)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Desktop two-column split: main content left, side rail right ── */}
        <div className="px-4 py-4 lg:px-8 lg:py-7 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">

          {/* ── PRIMARY COLUMN (left) ── */}
          <div className="min-w-0">
            {activeTab === "Overview" && (
              <div className="space-y-4">
                <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
                  <h4 className="font-display text-base font-semibold mb-2" style={{ color: "oklch(0.14 0.008 65)" }}>Description</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(0.40 0.008 65)" }}>{project.description}</p>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
                  <h4 className="font-display text-base font-semibold mb-3" style={{ color: "oklch(0.14 0.008 65)" }}>Project Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.areas.map((area) => (
                      <span
                        key={area}
                        className="px-3 py-1 rounded-full text-xs font-label"
                        style={{ background: "oklch(0.62 0.09 68 / 10%)", color: "oklch(0.42 0.09 68)", border: "1px solid oklch(0.62 0.09 68 / 20%)", letterSpacing: "0.03em" }}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="w-full rounded-2xl p-4 flex items-center justify-between"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                  onClick={() => toast.info(`Calling ${project.client}...`)}
                >
                  <div>
                    <p className="text-sm font-semibold text-left" style={{ color: "oklch(0.14 0.008 65)" }}>{project.client}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{project.clientContact}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "oklch(0.62 0.09 68 / 12%)" }}>
                    <Phone size={15} style={{ color: "oklch(0.52 0.09 68)" }} />
                  </div>
                </motion.button>

                {/* Share client portal — copies the unauthenticated /portal/:token
                    link so staff can WhatsApp / email it to the client. */}
                <SharePortalButton token={project.clientAccessToken} clientName={project.client} />

                {/* Project Details card — shown inline on mobile, moves to side rail on lg */}
                <div className="rounded-2xl p-4 space-y-3 lg:hidden" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
                  <h4 className="font-display text-base font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>Project Details</h4>
                  {[
                    { label: "Client", value: project.client },
                    { label: "Type", value: `${project.type} · ${project.propertyType}` },
                    { label: "Size", value: `${project.size.toLocaleString()} sqft` },
                    { label: "Start Date", value: project.startDate },
                    { label: "Target Completion", value: project.targetDate },
                    { label: "Priority", value: pc.label, color: pc.color },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{item.label}</span>
                      <span className="text-xs font-medium" style={{ color: item.color || "oklch(0.25 0.008 65)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Lifecycle" && (
              <LifecycleTab projectId={project.id} clientName={project.client} projectName={project.name} />
            )}

            {activeTab === "Tasks" && (
              <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2 lg:items-start">
                {sampleTasks.map((task, i) => {
                  const ts = taskStatusConfig[task.status];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-xl p-3 flex items-start gap-3"
                      style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: ts.bg, border: `1.5px solid ${ts.color}` }}
                      >
                        {task.status === "completed" && <span className="text-[8px]" style={{ color: ts.color }}>✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug" style={{ color: "oklch(0.20 0.008 65)" }}>{task.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>{task.area}</span>
                          <span className="text-[10px]" style={{ color: "oklch(0.65 0.008 68)" }}>· Due {task.dueDate}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="status-pill" style={{ background: ts.bg, color: ts.color }}>{ts.label}</span>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.42 0.09 68)" }}
                        >
                          {task.assignee}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {activeTab === "Quotations" && (
              <div className="space-y-3">
                {(() => {
                  const projectQuotes = allQuotations.filter((q) => q.project_id === project.id);
                  return (
                    <>
                      {projectQuotes.length === 0 ? (
                        <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                          <FileText size={28} className="mx-auto mb-3" style={{ color: "oklch(0.75 0.008 68)" }} />
                          <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.14 0.008 65)" }}>No documents yet</p>
                          <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>Create a quotation for this project</p>
                        </div>
                      ) : (
                        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
                          {projectQuotes.map((q, i) => {
                            const sc2 = qStatusConfig[q.status];
                            const { total } = computeTotals(q.items, q.tax_rate);
                            return (
                              <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.06 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(`/quotations/${q.id}`)}
                                className="rounded-2xl p-4 flex items-center gap-3"
                                style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.62 0.09 68 / 12%)" }}>
                                  <FileText size={17} style={{ color: "oklch(0.52 0.09 68)" }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>{q.id}</p>
                                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{q.doc_type} · {q.issue_date}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-display font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{formatRM(total)}</p>
                                  <span className="status-pill" style={{ background: sc2.bg, color: sc2.color }}>{sc2.label}</span>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/quotations/new")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed"
                        style={{ borderColor: "oklch(0.62 0.09 68 / 35%)", color: "oklch(0.52 0.09 68)" }}
                      >
                        <FileText size={14} />
                        <span className="text-sm font-label" style={{ letterSpacing: "0.04em" }}>New Quotation / Invoice</span>
                      </motion.button>
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === "Photos" && (
              <div className="space-y-4">
                <div
                  className="rounded-2xl p-6 flex flex-col items-center gap-3 border-2 border-dashed"
                  style={{ borderColor: "oklch(0.62 0.09 68 / 30%)", background: "oklch(0.62 0.09 68 / 4%)" }}
                  onClick={() => toast.info("Photo upload coming soon")}
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "oklch(0.62 0.09 68 / 12%)" }}>
                    <Upload size={20} style={{ color: "oklch(0.52 0.09 68)" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>Upload Photos</p>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>Before & After photos per area</p>
                  </div>
                </div>

                <div>
                  <p className="sz-label mb-3">RECENT UPLOADS ({project.photoCount})</p>
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 xl:grid-cols-5">
                    {[CARD_BG1, CARD_BG2, CARD_BG1, CARD_BG2, CARD_BG1, CARD_BG2].map((img, i) => (
                      <motion.div
                        key={i}
                        whileTap={{ scale: 0.95 }}
                        className="aspect-square rounded-xl overflow-hidden relative"
                        style={{ background: `url(${img}) center/cover no-repeat` }}
                      >
                        <div className="absolute inset-0" style={{ background: "oklch(0.11 0.004 285 / 0.2)" }} />
                        <div className="absolute bottom-1 right-1">
                          <Maximize2 size={10} className="text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Team tab */}
            {activeTab === "Team" && (
              <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
                {teamMembers.map((member, i) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 20%), oklch(0.52 0.08 65 / 20%))",
                        color: "oklch(0.42 0.09 68)",
                        border: "1.5px solid oklch(0.62 0.09 68 / 25%)",
                      }}
                    >
                      {member.avatar_code}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>{member.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{member.job_title}</p>
                    </div>
                    <span
                      className="text-xs font-label px-2 py-0.5 rounded-full"
                      style={{
                        background: member.name === project.designer ? "oklch(0.62 0.09 68 / 12%)" : "oklch(0.96 0.006 75)",
                        color: member.name === project.designer ? "oklch(0.42 0.09 68)" : "oklch(0.52 0.010 68)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {member.name === project.designer ? "Lead" : member.name === project.pm ? "PM" : "Designer"}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── SIDE RAIL (right column, desktop only) ── */}
          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            {/* Project Details */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
              <h4 className="font-display text-base font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>Project Details</h4>
              {[
                { label: "Client", value: project.client },
                { label: "Type", value: `${project.type} · ${project.propertyType}` },
                { label: "Size", value: `${project.size.toLocaleString()} sqft` },
                { label: "Start Date", value: project.startDate },
                { label: "Target Completion", value: project.targetDate },
                { label: "Priority", value: pc.label, color: pc.color },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{item.label}</span>
                  <span className="text-xs font-medium" style={{ color: item.color || "oklch(0.25 0.008 65)" }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Team members */}
            {teamMembers.length > 0 && (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
                <h4 className="font-display text-base font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>Team</h4>
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 20%), oklch(0.52 0.08 65 / 20%))",
                        color: "oklch(0.42 0.09 68)",
                        border: "1.5px solid oklch(0.62 0.09 68 / 25%)",
                      }}
                    >
                      {member.avatar_code}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: "oklch(0.14 0.008 65)" }}>{member.name}</p>
                      <p className="text-[10px] truncate" style={{ color: "oklch(0.52 0.010 68)" }}>{member.job_title}</p>
                    </div>
                    <span
                      className="text-[10px] font-label px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        background: member.name === project.designer ? "oklch(0.62 0.09 68 / 12%)" : "oklch(0.96 0.006 75)",
                        color: member.name === project.designer ? "oklch(0.42 0.09 68)" : "oklch(0.52 0.010 68)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {member.name === project.designer ? "Lead" : member.name === project.pm ? "PM" : "Designer"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick stats */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}>
              <h4 className="font-display text-base font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>Quick Stats</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Tasks Done", value: `${project.tasksCompleted}/${project.taskCount}` },
                  { label: "Progress", value: `${project.progress}%` },
                  { label: "Photos", value: `${project.photoCount}` },
                  { label: "Budget", value: `RM ${(project.budget / 1000).toFixed(0)}k` },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: "oklch(0.985 0.004 80)", border: "1px solid oklch(0.92 0.008 75)" }}
                  >
                    <p className="text-sm font-display font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{stat.value}</p>
                    <p className="text-[10px] font-label mt-0.5" style={{ color: "oklch(0.55 0.008 65)", letterSpacing: "0.04em" }}>{stat.label.toUpperCase()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE TAB — vertical timeline of the 29 SPAZEHAUS workflow stages,
// with inline Payment Collection (5 gates) and Document Sign (6 items) badges.
// ─────────────────────────────────────────────────────────────────────────────

function LifecycleTab({ projectId, clientName, projectName }: { projectId: string; clientName?: string; projectName?: string }) {
  const { data: lc, isLoading } = useProjectLifecycle(projectId);
  const { staff: me } = useAuth();
  const canCollect = canEditPayments(me?.role);
  const canSign = canEditSignatures(me?.role);
  const [collectTarget, setCollectTarget] = useState<MarkCollectedTarget | null>(null);
  const [signTarget, setSignTarget] = useState<SignDocumentTarget | null>(null);
  if (isLoading) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
        <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>Loading lifecycle…</p>
      </div>
    );
  }
  if (!lc) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
        <Clock size={28} className="mx-auto mb-3" style={{ color: "oklch(0.75 0.008 68)" }} />
        <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.14 0.008 65)" }}>No lifecycle data</p>
        <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>This project hasn't been bound to the workflow engine yet.</p>
      </div>
    );
  }

  const pay = paymentSummary(lc);
  const sig = signatureSummary(lc);

  // Group stages by phase for the section headers
  const phases: StagePhase[] = ["Inquiry", "Design", "Pre-Build", "Build", "Closeout"];

  // Build a map of paymentGate -> all related payment records (gate 4 has multiples)
  const paymentsByGate = lc.payments.reduce((acc, p) => {
    (acc[p.gate] ||= []).push(p);
    return acc;
  }, {} as Record<number, typeof lc.payments>);

  // Build a map of signatureKey -> record
  const sigByKey = Object.fromEntries(lc.signatures.map((s) => [s.key, s]));

  return (
    <div className="space-y-5">
      {/* —— Summary header: Payment + Document Sign progress —— */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={Coins}
          label="Payment Collected"
          primary={`${pay.pct}%`}
          secondary={`${formatRM(pay.collected)} / ${formatRM(pay.total)}`}
          tint="oklch(0.55 0.09 145)"
          tintBg="oklch(0.55 0.09 145 / 10%)"
        />
        <SummaryCard
          icon={PenSquare}
          label="Documents Signed"
          primary={`${sig.signed}/${sig.total}`}
          secondary={`${sig.pending} pending sign-off`}
          tint="oklch(0.42 0.09 68)"
          tintBg="oklch(0.62 0.09 68 / 10%)"
        />
      </div>

      {/* —— Phase timeline —— */}
      {phases.map((phase) => {
        const phaseStages = LIFECYCLE_STAGES.filter((s) => s.phase === phase);
        const pc = phaseColors[phase];
        return (
          <div key={phase}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-0.5 w-6 rounded-full" style={{ background: pc.color, opacity: 0.5 }} />
              <p className="font-label text-xs" style={{ color: pc.color, letterSpacing: "0.12em" }}>
                {phase.toUpperCase()}
              </p>
              <div className="flex-1 h-px" style={{ background: "oklch(0.92 0.008 75)" }} />
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
            >
              {phaseStages.map((stage, i) => {
                const status = stageStatus(stage, lc.currentStageId);
                const isLast = i === phaseStages.length - 1;
                const payments = stage.paymentGate ? paymentsByGate[stage.paymentGate] : undefined;
                const signature = stage.signatureKey ? sigByKey[stage.signatureKey] : undefined;

                return (
                  <div
                    key={stage.id}
                    className="px-3 py-3 flex gap-3"
                    style={{ borderBottom: isLast ? "none" : "1px solid oklch(0.95 0.008 75)" }}
                  >
                    {/* Rail + dot */}
                    <div className="flex flex-col items-center shrink-0" style={{ width: 22 }}>
                      <StageDot status={status} type={stage.type} />
                      {!isLast && (
                        <div
                          className="flex-1 w-0.5 mt-1"
                          style={{
                            background:
                              status === "completed" ? "oklch(0.55 0.09 145 / 35%)" : "oklch(0.92 0.008 75)",
                            minHeight: 18,
                          }}
                        />
                      )}
                    </div>

                    {/* Stage body */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                              className="text-sm font-medium leading-tight"
                              style={{
                                color:
                                  status === "completed"
                                    ? "oklch(0.30 0.008 65)"
                                    : status === "in-progress"
                                    ? "oklch(0.14 0.008 65)"
                                    : "oklch(0.50 0.008 65)",
                              }}
                            >
                              {stage.label}
                            </p>
                            {stage.paymentGate && <GateBadge gate={stage.paymentGate} kind="payment" />}
                            {stage.type === "contract-sign" && <GateBadge kind="contract" />}
                            {stage.type === "drawing-sign" && <GateBadge kind="drawing" />}
                          </div>
                          {stage.description && (
                            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "oklch(0.55 0.008 65)" }}>
                              {stage.description}
                            </p>
                          )}
                        </div>
                        <span
                          className="text-[9px] font-label px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            background: checkpointStatusConfig[status].bg,
                            color: checkpointStatusConfig[status].color,
                            border: `1px solid ${checkpointStatusConfig[status].border}`,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {checkpointStatusConfig[status].label}
                        </span>
                      </div>

                      {/* Payment detail (one or more rows for gate 4) */}
                      {payments && payments.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {payments.map((p, idx) => (
                            <PaymentRow
                              key={`${p.gate}-${idx}`}
                              payment={p}
                              projectId={projectId}
                              canCollect={canCollect}
                              onCollect={() =>
                                setCollectTarget({
                                  id: p.id,
                                  projectId,
                                  label: p.label,
                                  amount: p.amount,
                                  gate: p.gate,
                                  reference: p.reference,
                                  notes: p.notes,
                                })
                              }
                            />
                          ))}
                        </div>
                      )}

                      {/* Signature detail */}
                      {signature && (
                        <SignatureRow
                          signature={signature}
                          canSign={canSign}
                          onSign={() =>
                            setSignTarget({
                              id: signature.id,
                              projectId,
                              projectName,
                              signatureKey: signature.key,
                              label: signature.label,
                              group: signature.group,
                              status: signature.status,
                              documentRef: signature.documentRef,
                              signedDate: signature.signedDate,
                              signedBy: signature.signedBy,
                              notes: signature.notes,
                              defaultSignedBy: clientName,
                            })
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* —— Footer note —— */}
      <p className="text-[10px] text-center font-label" style={{ color: "oklch(0.65 0.008 68)", letterSpacing: "0.06em" }}>
        SPAZEHAUS · DESIGN & RENOVATION WORKFLOW · 5 PAYMENT GATES · 6 DOCUMENT SIGNATURES
      </p>

      {/* Mark-collected sheet */}
      <MarkCollectedSheet
        target={collectTarget}
        open={collectTarget !== null}
        onClose={() => setCollectTarget(null)}
      />

      {/* Sign-document sheet */}
      <SignDocumentSheet
        target={signTarget}
        open={signTarget !== null}
        onClose={() => setSignTarget(null)}
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tint,
  tintBg,
}: {
  icon: typeof Coins;
  label: string;
  primary: string;
  secondary: string;
  tint: string;
  tintBg: string;
}) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: tintBg }}>
          <Icon size={14} style={{ color: tint }} />
        </div>
        <p className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>
          {label.toUpperCase()}
        </p>
      </div>
      <p className="font-display text-xl font-semibold leading-none" style={{ color: "oklch(0.14 0.008 65)" }}>
        {primary}
      </p>
      <p className="text-[10px] mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
        {secondary}
      </p>
    </div>
  );
}

function StageDot({ status, type }: { status: CheckpointStatus; type: string }) {
  const isPay = type === "payment";
  const isSign = type === "contract-sign" || type === "drawing-sign";

  if (status === "completed") {
    return (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "oklch(0.55 0.09 145)" }}
      >
        <Check size={11} className="text-white" strokeWidth={3} />
      </div>
    );
  }
  if (status === "in-progress") {
    return (
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.6 }}
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isPay ? "oklch(0.62 0.09 68)" : isSign ? "oklch(0.55 0.09 240)" : "oklch(0.62 0.09 68)",
        }}
      >
        {isPay ? (
          <Coins size={10} className="text-white" />
        ) : isSign ? (
          <PenSquare size={10} className="text-white" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </motion.div>
    );
  }
  // pending
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
      style={{
        background: "oklch(0.96 0.006 75)",
        border: "1.5px solid oklch(0.85 0.008 75)",
      }}
    >
      {isPay ? (
        <Coins size={9} style={{ color: "oklch(0.65 0.008 68)" }} />
      ) : isSign ? (
        <PenSquare size={9} style={{ color: "oklch(0.65 0.008 68)" }} />
      ) : (
        <div className="w-1 h-1 rounded-full" style={{ background: "oklch(0.75 0.008 68)" }} />
      )}
    </div>
  );
}

function GateBadge({
  gate,
  kind,
}: {
  gate?: number;
  kind: "payment" | "contract" | "drawing";
}) {
  const config = {
    payment:  { label: gate ? `PAY ${["①", "②", "③", "④", "⑤"][gate - 1]}` : "PAY", color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)" },
    contract: { label: "CONTRACT",  color: "oklch(0.50 0.10 25)",  bg: "oklch(0.60 0.10 25 / 12%)" },
    drawing:  { label: "SIGN OFF",  color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 12%)" },
  }[kind];
  return (
    <span
      className="text-[9px] font-label px-1.5 py-0.5 rounded-md"
      style={{ background: config.bg, color: config.color, letterSpacing: "0.06em", fontWeight: 700 }}
    >
      {config.label}
    </span>
  );
}

function PaymentRow({
  payment,
  canCollect,
  onCollect,
}: {
  payment: PaymentRecord;
  projectId: string;
  canCollect: boolean;
  onCollect: () => void;
}) {
  const sc = checkpointStatusConfig[payment.status];
  const isOpen = payment.status !== "completed" && payment.status !== "skipped";
  return (
    <div
      className="rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
      style={{ background: "oklch(0.985 0.004 80)", border: "1px solid oklch(0.93 0.008 75)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {payment.status === "completed" ? (
          <Check size={11} style={{ color: sc.color }} />
        ) : payment.status === "in-progress" ? (
          <Clock size={11} style={{ color: sc.color }} />
        ) : payment.status === "overdue" ? (
          <AlertCircle size={11} style={{ color: sc.color }} />
        ) : (
          <Coins size={11} style={{ color: "oklch(0.65 0.008 68)" }} />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium truncate" style={{ color: "oklch(0.20 0.008 65)" }}>
            {payment.label}
          </p>
          <p className="text-[9px]" style={{ color: "oklch(0.55 0.008 65)" }}>
            {payment.status === "completed"
              ? `Collected ${payment.collectedDate} · ${payment.reference || "—"}`
              : `Due ${payment.dueDate || "TBD"}${payment.notes ? " · " + payment.notes : ""}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-[11px] font-display font-semibold" style={{ color: sc.color }}>
          {formatRM(payment.amount)}
        </p>
        {isOpen && canCollect && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onCollect}
            className="px-2 py-0.5 rounded-md flex items-center gap-1"
            style={{
              background: "oklch(0.55 0.09 145 / 12%)",
              color: "oklch(0.38 0.09 145)",
              border: "1px solid oklch(0.55 0.09 145 / 25%)",
            }}
          >
            <Check size={9} strokeWidth={3} />
            <span className="text-[9px] font-label" style={{ letterSpacing: "0.04em", fontWeight: 700 }}>
              COLLECT
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

function SignatureRow({
  signature,
  canSign,
  onSign,
}: {
  signature: DocumentSignRecord;
  canSign: boolean;
  onSign: () => void;
}) {
  const sc = checkpointStatusConfig[signature.status];
  const isOpen = signature.status !== "completed" && signature.status !== "skipped";
  const hasStoredDoc = isStorageDocRef(signature.documentRef);
  const hasLegacyDoc = !!signature.documentRef && !hasStoredDoc;
  const [viewLoading, setViewLoading] = useState(false);

  async function handleViewPdf(e: React.MouseEvent) {
    e.stopPropagation();
    if (!signature.documentRef) return;
    if (!hasStoredDoc) {
      toast.info(`Legacy reference: ${signature.documentRef}`);
      return;
    }
    setViewLoading(true);
    try {
      const url = await getSignatureDocUrl(signature.documentRef);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Could not open document — link may have expired");
      }
    } finally {
      setViewLoading(false);
    }
  }

  return (
    <div
      className="mt-2 rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
      style={{ background: "oklch(0.985 0.004 80)", border: "1px solid oklch(0.93 0.008 75)" }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {signature.status === "completed" ? (
          <Check size={11} style={{ color: sc.color }} />
        ) : signature.status === "in-progress" ? (
          <Clock size={11} style={{ color: sc.color }} />
        ) : (
          <PenSquare size={11} style={{ color: "oklch(0.65 0.008 68)" }} />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium truncate" style={{ color: "oklch(0.20 0.008 65)" }}>
            {signature.label}
          </p>
          <p className="text-[9px]" style={{ color: "oklch(0.55 0.008 65)" }}>
            {signature.status === "completed"
              ? `Signed ${signature.signedDate} · ${signature.signedBy}`
              : signature.notes || "Awaiting client signature"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {(hasStoredDoc || hasLegacyDoc) && (
          <button
            onClick={handleViewPdf}
            disabled={viewLoading}
            className="text-[9px] font-label px-2 py-1 rounded-md flex items-center gap-1"
            style={{
              background: "oklch(0.62 0.09 68 / 10%)",
              color: "oklch(0.42 0.09 68)",
              letterSpacing: "0.04em",
              opacity: viewLoading ? 0.6 : 1,
            }}
          >
            {viewLoading ? "…" : hasStoredDoc ? "VIEW" : "REF"}
          </button>
        )}
        {isOpen && canSign && (
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={(e) => {
              e.stopPropagation();
              onSign();
            }}
            className="px-2 py-0.5 rounded-md flex items-center gap-1"
            style={{
              background: signature.group === "contract"
                ? "oklch(0.60 0.10 25 / 12%)"
                : "oklch(0.55 0.09 240 / 12%)",
              color: signature.group === "contract"
                ? "oklch(0.50 0.10 25)"
                : "oklch(0.38 0.09 240)",
              border: signature.group === "contract"
                ? "1px solid oklch(0.50 0.10 25 / 35%)"
                : "1px solid oklch(0.38 0.09 240 / 35%)",
            }}
          >
            <Upload size={9} />
            <span className="text-[9px] font-label" style={{ letterSpacing: "0.04em", fontWeight: 700 }}>
              SIGN
            </span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── SharePortalButton ────────────────────────────────────────────────────
// Copies the read-only /portal/:token URL to the clipboard so staff can
// WhatsApp / email it to the client. Falls back to a toast that shows the
// URL when clipboard API isn't available (e.g. older browsers, http://).
function SharePortalButton({ token, clientName }: { token: string; clientName: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/portal/${token}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success(`Portal link copied — share with ${clientName}`);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.info(`Copy this link manually: ${url}`);
      }
    } catch {
      toast.error("Couldn't copy automatically — try long-pressing the URL");
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleCopy}
      className="w-full rounded-2xl p-4 flex items-center justify-between"
      style={{
        background: copied
          ? "linear-gradient(135deg, oklch(0.55 0.09 145 / 8%), oklch(1 0 0))"
          : "linear-gradient(135deg, oklch(0.62 0.09 68 / 6%), oklch(1 0 0))",
        border: copied
          ? "1px solid oklch(0.55 0.09 145 / 30%)"
          : "1px solid oklch(0.62 0.09 68 / 25%)",
        boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)",
      }}
    >
      <div className="text-left min-w-0 flex-1 pr-3">
        <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>
          Share client portal
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "oklch(0.52 0.010 68)" }}>
          {copied ? "Link copied to clipboard" : "Read-only progress view — no login needed"}
        </p>
      </div>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: copied ? "oklch(0.55 0.09 145 / 12%)" : "oklch(0.62 0.09 68 / 12%)",
        }}
      >
        {copied ? (
          <Check size={15} style={{ color: "oklch(0.38 0.09 145)" }} />
        ) : (
          <Share2 size={15} style={{ color: "oklch(0.52 0.09 68)" }} />
        )}
      </div>
    </motion.button>
  );
}
