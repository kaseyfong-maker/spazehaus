/*
 * SPAZEHAUS KPI & PERFORMANCE PAGE
 * Design: Dark premium performance dashboard with charts
 */
import { motion } from "framer-motion";
import AppHeader from "@/components/AppHeader";
import { staffMembers, kpiData } from "@/lib/mockData";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

const ratingColors: Record<string, { bg: string; color: string; border: string }> = {
  A: { bg: "oklch(0.62 0.09 68 / 12%)", color: "oklch(0.52 0.09 68)", border: "oklch(0.62 0.09 68 / 25%)" },
  B: { bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.70 0.09 240 / 30%)" },
  C: { bg: "oklch(0.68 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.68 0.12 25 / 30%)" },
};

const chartData = kpiData.months.slice(0, 9).map((month, i) => ({
  month,
  score: kpiData.scores[i] || 0,
}));

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
  const aCount = staffMembers.filter((s) => s.kpi === "A").length;
  const bCount = staffMembers.filter((s) => s.kpi === "B").length;

  return (
    <div className="mobile-container">
      <AppHeader title="KPI & Performance" subtitle="MONTHLY REVIEW" showBack compact />

      <div className="px-4 py-4 pb-24 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Rating A", value: aCount, color: "oklch(0.52 0.09 68)" },
            { label: "Rating B", value: bCount, color: "oklch(0.70 0.09 240)" },
            { label: "Rating C", value: 0, color: "oklch(0.68 0.12 25)" },
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
              const rc = ratingColors[staff.kpi] || ratingColors.B;
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
                    {staff.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900">{staff.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{staff.role}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-display font-bold"
                      style={{ background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}
                    >
                      {staff.kpi}
                    </span>
                    <span className="text-[9px] font-label" style={{ color: "oklch(0.52 0.010 68)" }}>
                      {staff.kpi === "A" ? "81-100" : staff.kpi === "B" ? "61-80" : "≤60"}
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
