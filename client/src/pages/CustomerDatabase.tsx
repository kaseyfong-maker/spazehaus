/*
 * SPAZEHAUS CUSTOMER DATABASE
 * Cross-project view of every inquiry — pipeline funnel, win rate,
 * category breakdown, and a filterable customer list.
 *
 * Source: 2026 Annual Meeting PDF — "Customer Database" pillar
 * (Inquiry vs Awarded · Categories customer)
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Search, ChevronRight, TrendingUp, Users, Award, XCircle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import {
  inquiries,
  customerSummary,
  countsByCategory,
  stageConfig,
  categoryConfig,
  tierConfig,
  type InquiryStage,
  type CustomerCategory,
} from "@/lib/customerData";
import { formatRM } from "@/lib/quotationData";

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/DEoUZCqpbvuNBJsc.jpg";

type FilterTab = "All" | "Active" | "Awarded" | "Rejected";
const filterTabs: FilterTab[] = ["All", "Active", "Awarded", "Rejected"];

export default function CustomerDatabase() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");

  const summary = customerSummary();
  const catCounts = countsByCategory();

  // Build the funnel — stage volumes
  const funnel = [
    { key: "new-inquiry" as InquiryStage,   value: summary.newInquiry + summary.showroomMeet + summary.awarded + summary.rejected, label: "All Inquiries" },
    { key: "showroom-meet" as InquiryStage, value: summary.showroomMeet + summary.awarded + summary.rejected,                       label: "Showroom Meet" },
    { key: "awarded" as InquiryStage,       value: summary.awarded,                                                                  label: "Awarded" },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);

  const filtered = inquiries
    .filter((i) => {
      if (filter === "Active") return i.stage === "new-inquiry" || i.stage === "showroom-meet";
      if (filter === "Awarded") return i.stage === "awarded";
      if (filter === "Rejected") return i.stage === "rejected";
      return true;
    })
    .filter((i) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        i.client.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    })
    // Sort: most recently updated first
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));

  return (
    <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
      <AppHeader title="Customers" subtitle="DATABASE · CRM" bgImage={HERO_BG} showBack showNotification />

      <div className="px-4 py-4 space-y-5 pb-24">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            icon={Users}
            label="Total Inquiries"
            primary={String(summary.total)}
            secondary={`${summary.active} active in pipeline`}
            tint="oklch(0.42 0.09 68)"
            tintBg="oklch(0.62 0.09 68 / 10%)"
          />
          <KpiCard
            icon={TrendingUp}
            label="Pipeline Value"
            primary={formatRM(summary.pipelineRM)}
            secondary={`${formatRM(summary.awardedRM)} already awarded`}
            tint="oklch(0.45 0.10 55)"
            tintBg="oklch(0.65 0.10 55 / 10%)"
          />
          <KpiCard
            icon={Award}
            label="Awarded"
            primary={String(summary.awarded)}
            secondary={`${formatRM(summary.awardedRM)} secured`}
            tint="oklch(0.38 0.09 145)"
            tintBg="oklch(0.55 0.09 145 / 10%)"
          />
          <KpiCard
            icon={XCircle}
            label="Win Rate"
            primary={`${(summary.winRate * 100).toFixed(0)}%`}
            secondary={`${summary.awarded} of ${summary.closedTotal} closed`}
            tint="oklch(0.50 0.12 25)"
            tintBg="oklch(0.60 0.12 25 / 10%)"
          />
        </div>

        {/* Funnel */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-label text-xs" style={{ color: "oklch(0.20 0.008 65)", letterSpacing: "0.10em", fontWeight: 700 }}>
              CONVERSION FUNNEL
            </p>
            <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>
              INQUIRY → AWARDED
            </span>
          </div>
          <div className="space-y-2">
            {funnel.map((f, i) => {
              const sc = stageConfig[f.key];
              const pct = (f.value / funnelMax) * 100;
              return (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: "oklch(0.30 0.008 65)" }}>{f.label}</span>
                    <span className="text-xs font-display font-semibold" style={{ color: sc.color }}>{f.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(0.92 0.008 75)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: sc.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}
          >
            <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.06em" }}>
              CONVERSION
            </span>
            <span className="font-display text-sm font-semibold" style={{ color: "oklch(0.38 0.09 145)" }}>
              {summary.awarded} / {summary.total} ({((summary.awarded / Math.max(summary.total, 1)) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>

        {/* Categories breakdown */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
        >
          <p className="font-label text-xs mb-3" style={{ color: "oklch(0.20 0.008 65)", letterSpacing: "0.10em", fontWeight: 700 }}>
            CUSTOMER CATEGORIES
          </p>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(catCounts) as CustomerCategory[]).map((cat) => {
              const count = catCounts[cat];
              const cc = categoryConfig[cat];
              return (
                <div
                  key={cat}
                  className="rounded-xl p-2 text-center"
                  style={{ background: cc.bg, border: `1px solid ${cc.color}25` }}
                >
                  <p className="font-display text-base font-semibold" style={{ color: cc.color }}>
                    {count}
                  </p>
                  <p
                    className="text-[9px] font-label mt-0.5 leading-tight truncate"
                    style={{ color: cc.color, letterSpacing: "0.04em" }}
                  >
                    {cat.toUpperCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter tabs */}
        <div
          className="flex rounded-xl p-1"
          style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
        >
          {filterTabs.map((t) => {
            const active = filter === t;
            const counts: Record<FilterTab, number> = {
              All: summary.total,
              Active: summary.active,
              Awarded: summary.awarded,
              Rejected: summary.rejected,
            };
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className="flex-1 py-2 text-xs font-label rounded-lg transition-colors flex items-center justify-center gap-1"
                style={{
                  background: active ? "oklch(0.62 0.09 68 / 10%)" : "transparent",
                  color: active ? "oklch(0.42 0.09 68)" : "oklch(0.52 0.010 68)",
                  letterSpacing: "0.04em",
                  fontWeight: active ? 700 : 400,
                }}
              >
                {t.toUpperCase()}
                <span className="text-[10px] opacity-70">({counts[t]})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
        >
          <Search size={14} style={{ color: "oklch(0.65 0.008 68)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, location, category…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "oklch(0.20 0.008 65)" }}
          />
        </div>

        {/* Customer cards */}
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
          >
            <Users size={28} className="mx-auto mb-3" style={{ color: "oklch(0.75 0.008 68)" }} />
            <p className="text-sm font-semibold mb-1" style={{ color: "oklch(0.14 0.008 65)" }}>No matches</p>
            <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>Try a different filter or search term</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((inq, i) => {
              const sc = stageConfig[inq.stage];
              const cc = categoryConfig[inq.category];
              const tc = tierConfig[inq.tier];
              const initials = inq.client
                .split(/[\s.&-]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() || "")
                .join("");

              return (
                <motion.button
                  key={inq.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/customers/${inq.id}`)}
                  className="w-full rounded-2xl p-4 flex items-start gap-3 text-left"
                  style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: cc.bg,
                      color: cc.color,
                      border: `1.5px solid ${cc.color}30`,
                    }}
                  >
                    {initials || "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold truncate" style={{ color: "oklch(0.14 0.008 65)" }}>
                        {inq.client}
                      </p>
                      {inq.tier !== "Standard" && (
                        <span
                          className="text-[9px] font-label px-1.5 py-0.5 rounded-md"
                          style={{ background: tc.bg, color: tc.color, letterSpacing: "0.06em", fontWeight: 700 }}
                        >
                          {inq.tier.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className="text-[10px] font-label px-1.5 py-0.5 rounded-md"
                        style={{ background: cc.bg, color: cc.color, letterSpacing: "0.04em", fontWeight: 600 }}
                      >
                        {inq.category}
                      </span>
                      <span className="text-[11px]" style={{ color: "oklch(0.52 0.010 68)" }}>
                        · {inq.propertyType} · {inq.location.split(",")[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-[10px] font-label px-2 py-0.5 rounded-full"
                        style={{
                          background: sc.bg,
                          color: sc.color,
                          border: `1px solid ${sc.border}`,
                          letterSpacing: "0.04em",
                          fontWeight: 700,
                        }}
                      >
                        {sc.label.toUpperCase()}
                      </span>
                      {inq.estimatedBudget && (
                        <span className="text-xs font-display font-semibold" style={{ color: sc.color }}>
                          {formatRM(inq.estimatedBudget)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 mt-1" style={{ color: "oklch(0.65 0.008 68)" }} />
                </motion.button>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-center font-label pt-2" style={{ color: "oklch(0.65 0.008 68)", letterSpacing: "0.06em" }}>
          SPAZEHAUS · CUSTOMER DATABASE · 2026 ANNUAL MEETING SOP
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI tile
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tint,
  tintBg,
}: {
  icon: typeof Users;
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
      <p className="font-display text-lg font-semibold leading-none truncate" style={{ color: "oklch(0.14 0.008 65)" }}>
        {primary}
      </p>
      <p className="text-[10px] mt-1 truncate" style={{ color: "oklch(0.52 0.010 68)" }}>
        {secondary}
      </p>
    </div>
  );
}
