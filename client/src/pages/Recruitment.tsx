/*
 * SPAZEHAUS RECRUITMENT PIPELINE
 * Design: Dark premium Kanban-style recruitment tracker
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { useCandidates, useAdvanceCandidate, useCreateCandidate, useUpdateCandidate, useDeleteCandidate, canEditProject, type Candidate } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import PaginationBar from "@/components/PaginationBar";
import { toast } from "sonner";
import { Plus, ExternalLink, Pencil, Trash2, X, Check } from "lucide-react";

const SOURCE_OPTIONS = ["LinkedIn", "Referral", "JobStreet", "Walk-in", "Instagram"];

const stages = ["Sourced", "Shortlisted", "Interview", "2nd Interview", "Offer", "Onboarded"];

const stageColors: Record<string, { bg: string; color: string }> = {
  Sourced: { bg: "var(--b-1)", color: "var(--t-5)" },
  Shortlisted: { bg: "oklch(0.62 0.09 68 / 12%)", color: "var(--acc)" },
  Interview: { bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)" },
  "2nd Interview": { bg: "oklch(0.80 0.12 68 / 15%)", color: "var(--acc-bright)" },
  Offer: { bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)" },
  Onboarded: { bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)" },
};

const sourceColors: Record<string, string> = {
  LinkedIn: "oklch(0.70 0.09 240)",
  Referral: "var(--acc-bright)",
  JobStreet: "var(--acc-bright)",
  "Walk-in": "oklch(0.60 0.07 145)",
  Instagram: "oklch(0.68 0.12 25)",
};

export default function Recruitment() {
  const [activeStage, setActiveStage] = useState("All");

  const { data: candidateList = [] } = useCandidates();
  const advanceCandidate = useAdvanceCandidate();
  const deleteCandidate = useDeleteCandidate();
  const { staff: me } = useAuth();
  const canManage = canEditProject(me?.role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);

  const openAdd = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (c: Candidate) => { setEditing(c); setDialogOpen(true); };
  const handleDelete = async (c: Candidate) => {
    if (!window.confirm(`Remove ${c.name} from the pipeline?`)) return;
    try {
      await deleteCandidate.mutateAsync(c.id);
      toast.success("Candidate removed");
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const filtered = activeStage === "All" ? candidateList : candidateList.filter((c) => c.stage === activeStage);
  const pg = usePagination(filtered, 12, activeStage);

  const advanceStage = async (id: string, currentStage: string) => {
    const idx = stages.indexOf(currentStage);
    if (idx < 0 || idx >= stages.length - 1) {
      toast.info("Already at final stage");
      return;
    }
    const nextStage = stages[idx + 1];
    try {
      await advanceCandidate.mutateAsync({ id, stage: nextStage });
      toast.success(`Advanced to ${nextStage}`);
    } catch (err) {
      toast.error(`Update failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  return (
    <div className="mobile-container">
      <AppHeader title="Recruitment" subtitle="TALENT PIPELINE" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-4 lg:px-8 lg:py-7">
        {/* Pipeline summary */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {["All", ...stages].map((stage) => {
            const count = stage === "All" ? candidateList.length : candidateList.filter((c) => c.stage === stage).length;
            return (
              <motion.button
                key={stage}
                whileTap={{ scale: 0.92 }}
                onClick={() => setActiveStage(stage)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-label flex items-center gap-1.5"
                style={{
                  background: activeStage === stage ? "var(--acc-bright)" : "oklch(1 0 0)",
                  color: activeStage === stage ? "oklch(1 0 0)" : "var(--t-5)",
                  border: activeStage === stage ? "none" : "1px solid var(--b-1)",
                  letterSpacing: "0.04em",
                }}
              >
                {stage}
                {count > 0 && (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: activeStage === stage ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.62 0.09 68 / 15%)",
                      color: activeStage === stage ? "oklch(1 0 0)" : "var(--acc-bright)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Candidate cards */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">
            {pg.pageItems.map((candidate, i) => {
              const sc = stageColors[candidate.stage] || stageColors.Sourced;
              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-4"
                  style={{ background: "var(--s-card)", border: "1px solid var(--b-1)" }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "var(--acc)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
                    >
                      {candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[color:var(--t-1)]">{candidate.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--acc)" }}>{candidate.applied_for_role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {candidate.experience && (
                          <span className="text-[10px]" style={{ color: "var(--t-5)" }}>{candidate.experience} exp.</span>
                        )}
                        <span
                          className="text-[10px] font-label px-1.5 py-0.5 rounded"
                          style={{ background: `${sourceColors[candidate.source] || "var(--acc-bright)"} / 15%`, color: sourceColors[candidate.source] || "var(--acc-bright)" }}
                        >
                          {candidate.source}
                        </span>
                      </div>
                    </div>
                    <span className="status-pill shrink-0" style={{ background: sc.bg, color: sc.color }}>{candidate.stage}</span>
                  </div>

                  {candidate.portfolio_url && (
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                      <ExternalLink size={11} style={{ color: "var(--t-5)" }} />
                      <span className="text-[11px]" style={{ color: "var(--t-5)" }}>{candidate.portfolio_url}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "var(--t-5)" }}>Applied: {candidate.appliedDateLabel}</span>
                    <div className="flex items-center gap-1.5">
                      {canManage && (
                        <>
                          <button onClick={() => openEdit(candidate)} title="Edit candidate" className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "var(--t-5)", border: "1px solid var(--b-1)" }}>
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDelete(candidate)} title="Remove candidate" className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: "oklch(0.58 0.12 25)", border: "1px solid var(--b-1)" }}>
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      {candidate.stage !== "Onboarded" && (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => advanceStage(candidate.id, candidate.stage)}
                          className="px-3 py-1.5 rounded-lg text-xs font-label"
                          style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "var(--acc)", border: "1px solid oklch(0.62 0.09 68 / 20%)", letterSpacing: "0.04em" }}
                        >
                          Advance →
                        </motion.button>
                      )}
                      {candidate.stage === "Onboarded" && (
                        <span className="text-xs font-label" style={{ color: "oklch(0.70 0.09 145)" }}>✓ Onboarded</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
        <PaginationBar page={pg.page} pageCount={pg.pageCount} onPage={pg.setPage} from={pg.from} to={pg.to} total={pg.total} label="candidates" />
      </div>

      {/* FAB — ops/admin only (candidates_write_ops RLS) */}
      {canManage && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={openAdd}
          data-testid="add-candidate-fab"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
          style={{ background: "linear-gradient(135deg, var(--acc-bright), var(--acc-2))" }}
        >
          <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
        </motion.button>
      )}

      <CandidateDialog open={dialogOpen} candidate={editing} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE DIALOG — add / edit a recruitment candidate
// ─────────────────────────────────────────────────────────────────────────────

function CandidateDialog({ open, candidate, onClose }: { open: boolean; candidate: Candidate | null; onClose: () => void }) {
  const createCandidate = useCreateCandidate();
  const updateCandidate = useUpdateCandidate();
  const isEdit = !!candidate;
  const pending = createCandidate.isPending || updateCandidate.isPending;

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [source, setSource] = useState(SOURCE_OPTIONS[0]);
  const [experience, setExperience] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(candidate?.name ?? "");
    setRole(candidate?.applied_for_role ?? "");
    setSource(candidate?.source ?? SOURCE_OPTIONS[0]);
    setExperience(candidate?.experience ?? "");
    setPortfolioUrl(candidate?.portfolio_url ?? "");
    setNotes(candidate?.notes ?? "");
  }, [open, candidate]);

  const inputStyle: React.CSSProperties = {
    background: "var(--s-3)", border: "1px solid var(--b-1)",
    color: "var(--t-2)", borderRadius: "12px", padding: "0.7rem 0.9rem",
    fontSize: "0.875rem", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = { color: "var(--t-5)", letterSpacing: "0.06em", fontWeight: 700 };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (!role.trim()) return toast.error("Applied-for role is required");
    try {
      if (isEdit && candidate) {
        await updateCandidate.mutateAsync({
          id: candidate.id, name: name.trim(), appliedForRole: role.trim(), source,
          experience: experience.trim() || null, portfolioUrl: portfolioUrl.trim() || null, notes: notes.trim() || null,
        });
        toast.success("Candidate updated");
      } else {
        await createCandidate.mutateAsync({
          name: name.trim(), appliedForRole: role.trim(), source,
          experience: experience.trim() || null, portfolioUrl: portfolioUrl.trim() || null, notes: notes.trim() || null,
        });
        toast.success("Candidate added");
      }
      onClose();
    } catch (err) {
      toast.error(`Failed to ${isEdit ? "update" : "add"} candidate: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => !pending && onClose()}
            className="fixed inset-0 z-40"
            style={{ background: "oklch(0.11 0.004 285 / 0.45)", backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0.5 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[460px] z-50 flex flex-col lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2"
            style={{ maxHeight: "92vh", background: "var(--s-card)", borderRadius: "24px 24px 0 0", boxShadow: "0 -12px 48px oklch(0 0 0 / 0.18)" }}
          >
            <div className="flex justify-center pt-2.5 pb-1.5 shrink-0 lg:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--b-strong)" }} />
            </div>
            <div className="px-4 pt-3 lg:pt-5 pb-3 flex items-start justify-between shrink-0" style={{ borderBottom: "1px solid var(--b-2)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--acc-strong), var(--acc-2))" }}>
                  {isEdit ? <Pencil size={16} className="text-white" /> : <Plus size={16} className="text-white" />}
                </div>
                <div>
                  <p className="font-display text-base font-semibold leading-tight" style={{ color: "var(--t-1)" }}>{isEdit ? "Edit Candidate" : "New Candidate"}</p>
                  <p className="text-[11px]" style={{ color: "var(--t-5)" }}>{isEdit ? "Update this candidate" : "Add to the recruitment pipeline"}</p>
                </div>
              </div>
              <button onClick={onClose} disabled={pending} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--s-2)", opacity: pending ? 0.5 : 1 }}>
                <X size={14} style={{ color: "var(--acc-ink)" }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>NAME *</label>
                <input data-testid="cand-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Lim" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>APPLIED FOR *</label>
                  <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Interior Designer" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>SOURCE</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle}>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>EXPERIENCE</label>
                <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 5 years" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>PORTFOLIO URL</label>
                <input type="text" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="e.g. behance.net/name" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>NOTES</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Interview notes, strengths…" style={{ ...inputStyle, minHeight: "80px", resize: "none" }} />
              </div>
            </div>

            <div className="px-4 py-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid var(--b-2)" }}>
              <button onClick={onClose} disabled={pending} className="flex-1 py-3 rounded-xl text-sm font-label" style={{ background: "var(--s-2)", color: "var(--acc-ink)", border: "1px solid var(--b-1)", letterSpacing: "0.04em", opacity: pending ? 0.5 : 1 }}>
                Cancel
              </button>
              <motion.button whileTap={pending ? undefined : { scale: 0.96 }} onClick={handleSubmit} disabled={pending} data-testid="cand-submit" className="flex-1 py-3 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, var(--acc-strong), var(--acc-2))", color: "oklch(1 0 0)", letterSpacing: "0.04em", opacity: pending ? 0.7 : 1 }}>
                {pending ? <span>{isEdit ? "Saving…" : "Adding…"}</span> : (<><Check size={15} />{isEdit ? "Save" : "Add Candidate"}</>)}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
