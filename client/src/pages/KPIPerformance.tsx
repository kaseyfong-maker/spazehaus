/*
 * SPAZEHAUS KPI & PERFORMANCE PAGE
 * Design: Dark premium performance dashboard with charts
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { useAllStaff, useKpiRecords } from "@/lib/queries";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

const ratingColors: Record<string, { bg: string; color: string; border: string }> = {
  A: { bg: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "oklch(0.62 0.09 68 / 25%)" },
  B: { bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.70 0.09 240 / 30%)" },
  C: { bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.68 0.12 25 / 30%)" },
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl px-3 py-2" style={{ background: "oklch(0.96 0.006 75)", border: "1px solid oklch(1 0 0 / 15%)" }}>
        <p className="text-xs font-label" style={{ color: "oklch(0.52 0.010 68)" }}>{label}</p>
        <p className="text-sm font-semibold" style={{ color: "oklch(0.52 0.09 68)" }}>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function KPIPerformance() {
  const { data: staffMembers = [] } = useAllStaff();
  const { data: kpiRecords = [] } = useKpiRecords();

  // "Latest rating per staff" — pick the most recent month for each staff_id.
  const latestRatingByStaff = useMemo(() => {
    const map = new Map<string, string>();
    // kpiRecords is already sorted desc by year then month
    for (const r of kpiRecords) {
      if (!map.has(r.staff_id)) map.set(r.staff_id, r.rating);
    }
    return map;
  }, [kpiRecords]);

  const rating = (staffId: string): string =>
    latestRatingByStaff.get(staffId) ?? staffMembers.find((s) => s.id === staffId)?.kpi_grade ?? "B";

  const aCount = staffMembers.filter((s) => rating(s.id) === "A").length;
  const bCount = staffMembers.filter((s) => rating(s.id) === "B").length;
  const cCount = staffMembers.filter((s) => rating(s.id) === "C").length;

  // Monthly trend — average total_score per month for the current year.
  const chartData = useMemo(() => {
    const year = new Date().getFullYear();
    return MONTHS_SHORT.slice(0, new Date().getMonth() + 1).map((label, i) => {
      const month = i + 1;
      // total_score is nullable in the schema (computed lazily once all parts
      // are filled in). Treat null as zero for the rolling average.
      const rows = kpiRecords.filter((r) => r.year === year && r.month === month);
      const avg = rows.length === 0 ? 0 : rows.reduce((s, r) => s + (r.total_score ?? 0), 0) / rows.length;
      return { month: label, score: Math.round(avg) };
    });
  }, [kpiRecords]);

  return (
    <div className="mobile-container">
      <AppHeader title="KPI & Performance" subtitle="MONTHLY REVIEW" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rating A", value: aCount, color: "oklch(0.52 0.09 68)" },
            { label: "Rating B", value: bCount, color: "oklch(0.70 0.09 240)" },
            { label: "Rating C", value: cCount, color: "oklch(0.68 0.12 25)" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <p className="text-2xl font-display font-semibold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-label mt-0.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Team chart */}
        <div className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
          <h4 className="font-display text-base font-semibold text-neutral-900 mb-4">Monthly Score Trend</h4>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={20}>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.52 0.010 68)", fontSize: 10, fontFamily: "Raleway, sans-serif" }}
              />
              <YAxis hide domain={[60, 100]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(1 0 0 / 4%)" }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.score >= 81 ? "oklch(0.72 0.09 68)" : entry.score >= 61 ? "oklch(0.70 0.09 240)" : "oklch(0.68 0.12 25)"}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staff KPI list */}
        <div>
          <p className="text-xs font-label mb-3" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em" }}>STAFF RATINGS — FEB 2026</p>
          <div className="space-y-2">
            {staffMembers.map((staff, i) => {
              const ratingKey = rating(staff.id);
              const rc = ratingColors[ratingKey] || ratingColors.B;
              return (
                <motion.div
                  key={staff.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "1px solid oklch(0.62 0.09 68 / 20%)" }}
                  >
                    {staff.avatar_code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900">{staff.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{staff.job_title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold"
                      style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
                    >
                      {ratingKey}
                    </span>
                    <span className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)" }}>
                      {ratingKey === "A" ? "81-100" : ratingKey === "B" ? "61-80" : "≤60"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
