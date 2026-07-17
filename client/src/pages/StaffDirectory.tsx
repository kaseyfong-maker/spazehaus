/*
 * SPAZEHAUS STAFF DIRECTORY
 * Design: Dark premium staff list with department filters
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Search, Plus } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useAllStaff, isAdminTier } from "@/lib/queries";
import { usePagination } from "@/hooks/usePagination";
import PaginationBar from "@/components/PaginationBar";
import { useAuth } from "@/contexts/AuthContext";
import { statusConfig, DEFAULT_STATUS_CONFIG } from "@/lib/mockData";

const deptFilters = ["All", "Design", "Operations", "Sales", "Admin"];

const deptColors: Record<string, string> = {
  Design: "var(--acc-bright)",
  Operations: "oklch(0.70 0.09 240)",
  Sales: "oklch(0.70 0.09 145)",
  Admin: "var(--acc-bright)",
};

export default function StaffDirectory() {
  const [, navigate] = useLocation();
  const { staff: me } = useAuth();
  const canAddStaff = isAdminTier(me?.role);
  const isAdmin = isAdminTier(me?.role);
  const [deptFilter, setDeptFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const { data: staffMembers = [] } = useAllStaff();

  const inactiveCount = staffMembers.filter((s) => s.status === "inactive").length;

  const filtered = staffMembers.filter((s) => {
    // Removed staff are hidden by default; admins can reveal them to reactivate.
    const matchActive = showInactive ? true : s.status !== "inactive";
    const matchDept = deptFilter === "All" || s.dept === deptFilter;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.job_title.toLowerCase().includes(search.toLowerCase());
    return matchActive && matchDept && matchSearch;
  });
  const pg = usePagination(filtered, 12, `${deptFilter}|${search}|${showInactive}`);

  return (
    <div className="mobile-container">
      <AppHeader title="Staff Directory" subtitle="TEAM MEMBERS" showBack compact />

      <div className="px-4 py-4 space-y-4 pb-24 lg:px-8 lg:py-7">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--s-card)", border: "1px solid var(--b-1)" }}>
          <Search size={14} style={{ color: "var(--t-5)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--t-2)" }}
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
                background: deptFilter === d ? "var(--acc-bright)" : "oklch(1 0 0)",
                color: deptFilter === d ? "oklch(1 0 0)" : "var(--t-5)",
                border: deptFilter === d ? "none" : "1px solid var(--b-1)",
                letterSpacing: "0.04em",
                fontWeight: deptFilter === d ? 600 : 400,
              }}
            >
              {d}
            </motion.button>
          ))}
        </div>

        {/* Staff count + admin show-inactive toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-label" style={{ color: "var(--t-5)", letterSpacing: "0.04em" }}>
            {filtered.length} MEMBER{filtered.length !== 1 ? "S" : ""}
          </p>
          {isAdmin && inactiveCount > 0 && (
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="text-[11px] font-label px-2.5 py-1 rounded-full"
              style={{
                background: showInactive ? "oklch(0.58 0.12 25 / 12%)" : "oklch(1 0 0)",
                color: showInactive ? "oklch(0.55 0.14 25)" : "var(--t-5)",
                border: "1px solid var(--b-1)",
                letterSpacing: "0.03em",
              }}
            >
              {showInactive ? "Hide removed" : `Show removed (${inactiveCount})`}
            </button>
          )}
        </div>

        {/* Staff list */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:items-start">
            {pg.pageItems.map((staff, i) => {
              const sc = statusConfig[staff.status as keyof typeof statusConfig] ?? DEFAULT_STATUS_CONFIG;
              const isInactive = staff.status === "inactive";
              return (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/company/staff/${staff.id}`)}
                  data-testid="staff-card"
                  data-staff-id={staff.id}
                  className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "var(--s-card)", border: "1px solid var(--b-1)", opacity: isInactive ? 0.55 : 1 }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: "oklch(0.62 0.09 68 / 12%)",
                      color: deptColors[staff.dept] || "var(--acc-bright)",
                      border: "1px solid oklch(0.62 0.09 68 / 20%)",
                    }}
                  >
                    {staff.avatar_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--t-1)]">{staff.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--t-5)" }}>{staff.job_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-label px-2 py-0.5 rounded-full"
                        style={{
                          background: `${deptColors[staff.dept] || "var(--acc-bright)"} / 12%`,
                          color: deptColors[staff.dept] || "var(--acc-bright)",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {staff.dept}
                      </span>
                      {staff.kpi_grade && (
                        <span className="text-[10px]" style={{ color: "var(--t-5)" }}>KPI: {staff.kpi_grade}</span>
                      )}
                      {isInactive && (
                        <span className="text-[10px] font-label px-2 py-0.5 rounded-full" style={{ background: "oklch(0.58 0.12 25 / 12%)", color: "oklch(0.55 0.14 25)", letterSpacing: "0.03em" }}>
                          Removed
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="status-pill shrink-0" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
        <PaginationBar page={pg.page} pageCount={pg.pageCount} onPage={pg.setPage} from={pg.from} to={pg.to} total={pg.total} label="staff" />
      </div>

      {/* FAB — admin tier only (matches the staff_write_admin RLS policy) */}
      {canAddStaff && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/company/staff/new")}
          data-testid="add-staff-fab"
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40"
          style={{ background: "linear-gradient(135deg, var(--acc-bright), var(--acc-2))" }}
        >
          <Plus size={22} style={{ color: "oklch(1 0 0)" }} />
        </motion.button>
      )}
    </div>
  );
}
