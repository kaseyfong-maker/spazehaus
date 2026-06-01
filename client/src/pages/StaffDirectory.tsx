/*
 * SPAZEHAUS STAFF DIRECTORY
 * Design: Dark premium staff list with department filters
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useAllStaff } from "@/lib/queries";
import { statusConfig } from "@/lib/mockData";
import { toast } from "sonner";

const deptFilters = ["All", "Design", "Operations", "Sales", "Admin"];

const deptColors: Record<string, string> = {
  Design: "oklch(0.72 0.09 68)",
  Operations: "oklch(0.70 0.09 240)",
  Sales: "oklch(0.70 0.09 145)",
  Admin: "oklch(0.80 0.12 68)",
};

export default function StaffDirectory() {
  const [, navigate] = useLocation();
  const [deptFilter, setDeptFilter] = useState("All");
  const [search, setSearch] = useState("");

  const { data: staffMembers = [] } = useAllStaff();

  const filtered = staffMembers.filter((s) => {
    const matchDept = deptFilter === "All" || s.dept === deptFilter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.job_title.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  return (
    <div className="mobile-container">
      <AppHeader title="Staff Directory" subtitle="TEAM MEMBERS" showBack compact />

      <div className="px-4 py-4 space-y-4 pb-24 lg:px-8 lg:py-7">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          <Search size={14} style={{ color: "oklch(0.52 0.010 68)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "oklch(0.20 0.008 65)" }}
          />
        </div>

        {/* Dept filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {deptFilters.map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDeptFilter(d)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-label"
              style={{
                background: deptFilter === d ? "oklch(0.72 0.09 68)" : "oklch(1 0 0)",
                color: deptFilter === d ? "oklch(1 0 0)" : "oklch(0.52 0.010 68)",
                border: deptFilter === d ? "none" : "1px solid oklch(0.90 0.010 75)",
                letterSpacing: "0.04em",
                fontWeight: deptFilter === d ? 600 : 400,
              }}
            >
              {d}
            </motion.button>
          ))}
        </div>

        {/* Staff count */}
        <p className="text-xs font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>
          {filtered.length} MEMBER{filtered.length !== 1 ? "S" : ""}
        </p>

        {/* Staff list */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">
            {filtered.map((staff, i) => {
              const sc = statusConfig[staff.status as keyof typeof statusConfig];
              return (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/company/staff/${staff.id}`)}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: "oklch(0.62 0.09 68 / 12%)",
                      color: deptColors[staff.dept] || "oklch(0.72 0.09 68)",
                      border: "1px solid oklch(0.62 0.09 68 / 20%)",
                    }}
                  >
                    {staff.avatar_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900">{staff.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{staff.job_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-label px-2 py-0.5 rounded-full"
                        style={{
                          background: `${deptColors[staff.dept] || "oklch(0.72 0.09 68)"} / 12%`,
                          color: deptColors[staff.dept] || "oklch(0.72 0.09 68)",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {staff.dept}
                      </span>
                      {staff.kpi_grade && (
                        <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>KPI: {staff.kpi_grade}</span>
                      )}
                    </div>
                  </div>
                  <span className="status-pill shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => toast.info("Add staff feature coming soon")}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.55 0.08 65))" }}
      >
        <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
      </motion.button>
    </div>
  );
}
