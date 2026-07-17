/*
 * SPAZEHAUS ANNOUNCEMENTS PAGE
 * Design: Dark premium announcement board
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { useAnnouncements, useCreateAnnouncement, isAdminTier } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Megaphone, X, Check } from "lucide-react";

const priorityConfig = {
  high: { label: "Urgent", bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", bar: "oklch(0.68 0.12 25)" },
  medium: { label: "Important", bg: "oklch(0.62 0.09 68 / 12%)", color: "var(--acc)", bar: "var(--acc-bright)" },
  low: { label: "General", bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)", bar: "oklch(0.60 0.07 145)" },
};

const DEFAULT_ANN_PRIORITY = { label: "—", bg: "oklch(0.55 0.006 80 / 12%)", color: "var(--t-5)", bar: "var(--t-5)" };

export default function Announcements() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data: announcements = [] } = useAnnouncements();
  const { staff: me } = useAuth();
  const isAdmin = isAdminTier(me?.role);
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="mobile-container">
      <AppHeader title="Announcements" subtitle="COMPANY UPDATES" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-3 lg:px-8 lg:py-7 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:items-start">
        {announcements.length === 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ background: "var(--s-card)", border: "1px solid var(--b-1)" }}>
            <p className="text-sm" style={{ color: "var(--t-5)" }}>No announcements yet</p>
          </div>
        )}
        {announcements.map((ann, i) => {
          const pc = priorityConfig[ann.priority as keyof typeof priorityConfig] ?? DEFAULT_ANN_PRIORITY;
          const isExpanded = expanded === ann.id;

          return (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--s-card)", border: "1px solid var(--b-1)" }}
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
                      <p className="text-sm font-semibold text-[color:var(--t-1)] leading-snug">{ann.title}</p>
                      <span className="status-pill shrink-0" style={{ background: pc.bg, color: pc.color }}>{pc.label}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--t-5)" }}>{ann.publishedDateLabel} · {ann.authorName}</p>
                    {!isExpanded && (
                      <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "var(--t-5)" }}>{ann.content}</p>
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
                    <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--b-2)" }}>
                      <p className="text-sm leading-relaxed pt-3" style={{ color: "var(--t-3)" }}>{ann.content}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* FAB — admin-only (matches announcements_write_admin RLS) */}
      {isAdmin && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setComposeOpen(true)}
          data-testid="new-announcement-fab"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
          style={{ background: "linear-gradient(135deg, var(--acc-bright), var(--acc-2))" }}
        >
          <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
        </motion.button>
      )}

      <ComposeAnnouncementDialog
        open={composeOpen}
        authorId={me?.id ?? ""}
        onClose={() => setComposeOpen(false)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSE ANNOUNCEMENT — admin-only publish dialog
// ─────────────────────────────────────────────────────────────────────────────

function ComposeAnnouncementDialog({ open, authorId, onClose }: { open: boolean; authorId: string; onClose: () => void }) {
  const createAnnouncement = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const pending = createAnnouncement.isPending;

  const inputStyle: React.CSSProperties = {
    background: "var(--s-3)", border: "1px solid var(--b-1)",
    color: "var(--t-2)", borderRadius: "12px", padding: "0.7rem 0.9rem",
    fontSize: "0.875rem", width: "100%", outline: "none",
  };
  const labelStyle: React.CSSProperties = { color: "var(--t-5)", letterSpacing: "0.06em", fontWeight: 700 };

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!content.trim()) return toast.error("Content is required");
    if (!authorId) return toast.error("Could not resolve your staff record");
    try {
      await createAnnouncement.mutateAsync({ title: title.trim(), content: content.trim(), priority, authorId });
      toast.success("Announcement published");
      setTitle(""); setContent(""); setPriority("medium");
      onClose();
    } catch (err) {
      toast.error(`Could not publish: ${err instanceof Error ? err.message : "unknown error"}`);
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
                  <Megaphone size={16} className="text-white" />
                </div>
                <div>
                  <p className="font-display text-base font-semibold leading-tight" style={{ color: "var(--t-1)" }}>New Announcement</p>
                  <p className="text-[11px]" style={{ color: "var(--t-5)" }}>Publish a company update</p>
                </div>
              </div>
              <button onClick={onClose} disabled={pending} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--s-2)", opacity: pending ? 0.5 : 1 }}>
                <X size={14} style={{ color: "var(--acc-ink)" }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>TITLE *</label>
                <input data-testid="ann-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office closed for public holiday" style={inputStyle} />
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>PRIORITY</label>
                <div className="flex gap-2">
                  {(["high", "medium", "low"] as const).map((p) => {
                    const pc = priorityConfig[p];
                    const active = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className="flex-1 py-2 rounded-xl text-xs font-label"
                        style={{ background: active ? pc.bg : "var(--s-3)", color: active ? pc.color : "var(--t-5)", border: active ? `1px solid ${pc.color}` : "1px solid var(--b-1)", letterSpacing: "0.03em" }}
                      >
                        {pc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-label mb-1.5" style={labelStyle}>CONTENT *</label>
                <textarea data-testid="ann-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the announcement…" style={{ ...inputStyle, minHeight: "120px", resize: "none" }} />
              </div>
            </div>

            <div className="px-4 py-3 flex gap-2 shrink-0" style={{ borderTop: "1px solid var(--b-2)" }}>
              <button onClick={onClose} disabled={pending} className="flex-1 py-3 rounded-xl text-sm font-label" style={{ background: "var(--s-2)", color: "var(--acc-ink)", border: "1px solid var(--b-1)", letterSpacing: "0.04em", opacity: pending ? 0.5 : 1 }}>
                Cancel
              </button>
              <motion.button whileTap={pending ? undefined : { scale: 0.96 }} onClick={handleSubmit} disabled={pending} data-testid="ann-submit" className="flex-1 py-3 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2" style={{ background: "linear-gradient(135deg, var(--acc-strong), var(--acc-2))", color: "oklch(1 0 0)", letterSpacing: "0.04em", opacity: pending ? 0.7 : 1 }}>
                {pending ? <span>Publishing…</span> : (<><Check size={15} />Publish</>)}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
