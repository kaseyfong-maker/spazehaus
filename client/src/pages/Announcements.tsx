/*
 * SPAZEHAUS ANNOUNCEMENTS PAGE
 * Design: Dark premium announcement board
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { useAnnouncements } from "@/lib/queries";
import { toast } from "sonner";
import { Plus, Megaphone } from "lucide-react";

const priorityConfig = {
  high: { label: "Urgent", bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", bar: "oklch(0.68 0.12 25)" },
  medium: { label: "Important", bg: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", bar: "oklch(0.72 0.09 68)" },
  low: { label: "General", bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)", bar: "oklch(0.60 0.07 145)" },
};

export default function Announcements() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: announcements = [] } = useAnnouncements();

  return (
    <div className="mobile-container">
      <AppHeader title="Announcements" subtitle="COMPANY UPDATES" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-3">
        {announcements.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
            <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>No announcements yet</p>
          </div>
        )}
        {announcements.map((ann, i) => {
          const pc = priorityConfig[ann.priority as keyof typeof priorityConfig];
          const isExpanded = expanded === ann.id;

          return (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
            >
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpanded(isExpanded ? null : ann.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: pc.bg }}>
                    <Megaphone size={16} style={{ color: pc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-neutral-900 leading-snug">{ann.title}</p>
                      <span className="status-pill shrink-0" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>{ann.publishedDateLabel} · {ann.authorName}</p>
                    {!isExpanded && (
                      <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "oklch(0.52 0.010 68)" }}>{ann.content}</p>
                    )}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4" style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}>
                      <p className="text-sm leading-relaxed pt-3" style={{ color: "oklch(0.35 0.008 65)" }}>{ann.content}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => toast.info("Create announcement feature coming soon")}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.55 0.08 65))" }}
      >
        <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
      </motion.button>
    </div>
  );
}
