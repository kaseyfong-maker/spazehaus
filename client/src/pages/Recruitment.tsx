/*
 * SPAZEHAUS RECRUITMENT PIPELINE
 * Design: Dark premium Kanban-style recruitment tracker
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { candidates } from "@/lib/mockData";
import { toast } from "sonner";
import { Plus, ExternalLink } from "lucide-react";

const stages = ["Sourced", "Shortlisted", "Interview", "2nd Interview", "Offer", "Onboarded"];

const stageColors: Record<string, { bg: string; color: string }> = {
  Sourced: { bg: "oklch(0.90 0.010 75)", color: "oklch(0.52 0.010 68)" },
  Shortlisted: { bg: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)" },
  Interview: { bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)" },
  "2nd Interview": { bg: "oklch(0.80 0.12 68 / 15%)", color: "oklch(0.80 0.12 68)" },
  Offer: { bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)" },
  Onboarded: { bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)" },
};

const sourceColors: Record<string, string> = {
  LinkedIn: "oklch(0.70 0.09 240)",
  Referral: "oklch(0.72 0.09 68)",
  JobStreet: "oklch(0.80 0.12 68)",
  "Walk-in": "oklch(0.60 0.07 145)",
  Instagram: "oklch(0.68 0.12 25)",
};

export default function Recruitment() {
  const [activeStage, setActiveStage] = useState("All");
  const [candidateList, setCandidateList] = useState(candidates);

  const filtered = activeStage === "All" ? candidateList : candidateList.filter((c) => c.stage === activeStage);

  const advanceStage = (id: string) => {
    setCandidateList((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const idx = stages.indexOf(c.stage);
        if (idx < stages.length - 1) {
          toast.success(`Advanced to ${stages[idx + 1]}`);
          return { ...c, stage: stages[idx + 1] };
        }
        toast.info("Already at final stage");
        return c;
      })
    );
  };

  return (
    <div className="mobile-container">
      <AppHeader title="Recruitment" subtitle="TALENT PIPELINE" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-4">
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
                  background: activeStage === stage ? "oklch(0.72 0.09 68)" : "oklch(1 0 0)",
                  color: activeStage === stage ? "oklch(1 0 0)" : "oklch(0.52 0.010 68)",
                  border: activeStage === stage ? "none" : "1px solid oklch(0.90 0.010 75)",
                  letterSpacing: "0.04em",
                }}
              >
                {stage}
                {count > 0 && (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{
                      background: activeStage === stage ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.62 0.09 68 / 15%)",
                      color: activeStage === stage ? "oklch(1 0 0)" : "oklch(0.72 0.09 68)",
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
          <div className="space-y-3">
            {filtered.map((candidate, i) => {
              const sc = stageColors[candidate.stage] || stageColors.Sourced;
              return (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-4"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
                    >
                      {candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{candidate.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.09 68)" }}>{candidate.role}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>{candidate.experience} exp.</span>
                        <span
                          className="text-[10px] font-label px-1.5 py-0.5 rounded"
                          style={{ background: `${sourceColors[candidate.source] || "oklch(0.72 0.09 68)"} / 15%`, color: sourceColors[candidate.source] || "oklch(0.72 0.09 68)" }}
                        >
                          {candidate.source}
                        </span>
                      </div>
                    </div>
                    <span className="status-pill shrink-0" style={{ background: sc.bg, color: sc.color }}>{candidate.stage}</span>
                  </div>

                  {candidate.portfolio && (
                    <div className="flex items-center gap-1.5 mb-3 px-1">
                      <ExternalLink size={11} style={{ color: "oklch(0.52 0.010 68)" }} />
                      <span className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>{candidate.portfolio}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>Applied: {candidate.appliedDate}</span>
                    {candidate.stage !== "Onboarded" && (
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => advanceStage(candidate.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-label"
                        style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "1px solid oklch(0.62 0.09 68 / 20%)", letterSpacing: "0.04em" }}
                      >
                        Advance →
                      </motion.button>
                    )}
                    {candidate.stage === "Onboarded" && (
                      <span className="text-xs font-label" style={{ color: "oklch(0.70 0.09 145)" }}>✓ Onboarded</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => toast.info("Add candidate feature coming soon")}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.55 0.08 65))" }}
      >
        <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
      </motion.button>
    </div>
  );
}
