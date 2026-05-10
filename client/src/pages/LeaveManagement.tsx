/*
 * SPAZEHAUS LEAVE MANAGEMENT
 * Design: Dark premium leave list with approval actions
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { leaveRequests, staffMembers, statusConfig } from "@/lib/mockData";
import { toast } from "sonner";
import { Check, X, Plus } from "lucide-react";

const tabs = ["Pending", "All Requests", "Apply Leave"];

const leaveTypeColors: Record<string, string> = {
  "Annual Leave": "oklch(0.70 0.09 240)",
  "Medical Leave": "oklch(0.68 0.12 25)",
  "Replacement Leave": "oklch(0.80 0.12 68)",
  "Unpaid Leave": "oklch(0.58 0.12 25)",
};

export default function LeaveManagement() {
  const [activeTab, setActiveTab] = useState("Pending");
  const [requests, setRequests] = useState(leaveRequests);
  const [applyForm, setApplyForm] = useState({ type: "Annual Leave", startDate: "", endDate: "", reason: "" });

  const pending = requests.filter((r) => r.status === "pending");

  const handleApprove = (id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved" } : r));
    toast.success("Leave approved successfully");
  };

  const handleReject = (id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" } : r));
    toast.error("Leave rejected");
  };

  const handleApply = () => {
    if (!applyForm.startDate || !applyForm.endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.success("Leave application submitted!", { description: "Your request is pending approval." });
    setApplyForm({ type: "Annual Leave", startDate: "", endDate: "", reason: "" });
  };

  const inputStyle = {
    background: "oklch(0.96 0.006 75)",
    border: "1px solid oklch(0.90 0.010 75)",
    color: "oklch(0.20 0.008 65)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
  } as React.CSSProperties;

  const labelStyle = {
    color: "oklch(0.52 0.010 68)",
    fontSize: "0.75rem",
    marginBottom: "0.375rem",
    display: "block",
    fontFamily: "Raleway, sans-serif",
    letterSpacing: "0.04em",
  } as React.CSSProperties;

  return (
    <div className="mobile-container">
      <AppHeader title="Leave Management" subtitle="APPROVALS & REQUESTS" showBack compact />

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: "1px solid oklch(0.90 0.010 75)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-3 text-[11px] font-label relative"
            style={{
              color: activeTab === tab ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
              letterSpacing: "0.04em",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
            {tab === "Pending" && pending.length > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                style={{ background: "oklch(0.72 0.09 68)", color: "oklch(1 0 0)" }}
              >
                {pending.length}
              </span>
            )}
            {activeTab === tab && (
              <motion.div
                layoutId="leaveTabIndicator"
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ background: "oklch(0.72 0.09 68)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === "Pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {pending.length === 0 ? (
                <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                  <p className="text-sm" style={{ color: "oklch(0.52 0.010 68)" }}>No pending approvals</p>
                </div>
              ) : pending.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl p-4"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
                    >
                      {staffMembers.find((s) => s.id === req.staffId)?.avatar || "??"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-900">{req.staffName}</p>
                      <p className="text-xs mt-0.5" style={{ color: leaveTypeColors[req.type] || "oklch(0.72 0.09 68)" }}>{req.type}</p>
                      <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
                        {req.startDate} — {req.endDate} · {req.days} day{req.days > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs mb-3 px-1" style={{ color: "oklch(0.52 0.010 68)" }}>"{req.reason}"</p>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleReject(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-label"
                      style={{ background: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "1px solid oklch(0.68 0.12 25 / 25%)", letterSpacing: "0.04em" }}
                    >
                      <X size={13} /> Reject
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-label"
                      style={{ background: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)", border: "1px solid oklch(0.60 0.07 145 / 25%)", letterSpacing: "0.04em" }}
                    >
                      <Check size={13} /> Approve
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === "All Requests" && (
            <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {requests.map((req, i) => {
                const sc = statusConfig[req.status as keyof typeof statusConfig];
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                  >
                    <div
                      className="w-1.5 h-full min-h-[40px] rounded-full shrink-0"
                      style={{ background: leaveTypeColors[req.type] || "oklch(0.72 0.09 68)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{req.staffName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{req.type} · {req.days}d</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{req.startDate} — {req.endDate}</p>
                    </div>
                    <span className="status-pill shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "Apply Leave" && (
            <motion.div key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div>
                <label style={labelStyle}>LEAVE TYPE *</label>
                <div className="flex flex-wrap gap-2">
                  {["Annual Leave", "Medical Leave", "Replacement Leave", "Unpaid Leave"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setApplyForm((f) => ({ ...f, type: t }))}
                      className="px-3 py-1.5 rounded-full text-xs font-label"
                      style={{
                        background: applyForm.type === t ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.96 0.006 75)",
                        color: applyForm.type === t ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
                        border: applyForm.type === t ? "1px solid oklch(0.72 0.09 68 / 40%)" : "1px solid oklch(0.90 0.010 75)",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>START DATE *</label>
                  <input style={inputStyle} placeholder="DD/MM/YYYY" value={applyForm.startDate} onChange={(e) => setApplyForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>END DATE *</label>
                  <input style={inputStyle} placeholder="DD/MM/YYYY" value={applyForm.endDate} onChange={(e) => setApplyForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>REASON</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "80px", resize: "none" }}
                  placeholder="Brief reason for leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleApply}
                className="w-full py-3.5 rounded-xl text-sm font-label font-semibold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.55 0.08 65))", color: "oklch(1 0 0)", letterSpacing: "0.04em" }}
              >
                <Plus size={16} /> Submit Application
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
