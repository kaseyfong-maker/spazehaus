/*
 * SPAZEHAUS AUDIT LOG VIEWER
 * Admin-only — surfaces every INSERT / UPDATE / DELETE captured by the
 * Phase 0A audit trigger across staff, projects, payment_records,
 * signature_records, inquiries, quotations, leave_requests, calendar_events,
 * and kpi_records.
 *
 * Layout:
 *   • Hero header with admin badge
 *   • KPI strip — events today / events this week / unique actors
 *   • Filter row — table, action, time window
 *   • Event list — newest first, expandable to show the before/after diff
 *
 * RLS (Phase 0D):
 *   • `audit_log_read_admin` lets the admin tier read everything
 *   • `audit_log_read_own` lets any user read their own actions
 *   The page redirects non-admin users back to /company.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  ShieldCheck, Filter, ChevronDown, ChevronUp, Activity,
  Users, ArrowLeft, Database, PlusCircle, PencilLine, Trash2, Clock,
  Search, Loader2,
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useAuditLog, canViewAuditLog, type AuditEntry } from "@/lib/queries";
import { useAuth } from "@/contexts/AuthContext";
import type { AuditAction } from "@/lib/dbTypes";

const PAGE_SIZE = 50;

// ─── Table filter options ───────────────────────────────────────────────────

const TABLE_OPTIONS: { value: string; label: string }[] = [
  { value: "",                  label: "All tables" },
  { value: "projects",          label: "Projects" },
  { value: "payment_records",   label: "Payments" },
  { value: "signature_records", label: "Signatures" },
  { value: "inquiries",         label: "Inquiries" },
  { value: "quotations",        label: "Quotations" },
  { value: "leave_requests",    label: "Leave" },
  { value: "staff",             label: "Staff" },
  { value: "calendar_events",   label: "Calendar" },
  { value: "kpi_records",       label: "KPI" },
];

const ACTION_OPTIONS: { value: AuditAction | ""; label: string }[] = [
  { value: "",       label: "Any" },
  { value: "INSERT", label: "Created" },
  { value: "UPDATE", label: "Updated" },
  { value: "DELETE", label: "Deleted" },
];

const DAYS_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: 1,         label: "24h" },
  { value: 7,         label: "7d" },
  { value: 30,        label: "30d" },
  { value: undefined, label: "All" },
];

// Action visuals
const actionVisual: Record<AuditAction, { tint: string; bg: string; border: string; icon: typeof PlusCircle; verb: string }> = {
  INSERT: { tint: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)", border: "oklch(0.55 0.09 145 / 30%)", icon: PlusCircle, verb: "Created" },
  UPDATE: { tint: "oklch(0.45 0.09 240)", bg: "oklch(0.60 0.09 240 / 12%)", border: "oklch(0.60 0.09 240 / 30%)", icon: PencilLine, verb: "Updated" },
  DELETE: { tint: "oklch(0.50 0.12 25)",  bg: "oklch(0.60 0.12 25 / 12%)",  border: "oklch(0.60 0.12 25 / 30%)",  icon: Trash2,     verb: "Deleted" },
};

const HERO_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663296470877/izBqEFfzzpfKonJn.jpg";

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [, navigate] = useLocation();
  const { staff: me } = useAuth();

  const [table, setTable] = useState<string>("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [daysBack, setDaysBack] = useState<number | undefined>(7);
  // rowId has two states: what the user is typing, and what's actually filtered.
  // Debouncing avoids re-querying on every keystroke.
  const [rowIdInput, setRowIdInput] = useState("");
  const [rowIdApplied, setRowIdApplied] = useState("");

  // Redirect non-admin users back to the Company hub — also the entry on the
  // hub card itself is hidden for them, so this is a safety net for direct nav.
  useEffect(() => {
    if (me && !canViewAuditLog(me.role)) {
      navigate("/company", { replace: true });
    }
  }, [me, navigate]);

  // Debounce rowId input → applied filter (300ms).
  useEffect(() => {
    const t = setTimeout(() => setRowIdApplied(rowIdInput.trim()), 300);
    return () => clearTimeout(t);
  }, [rowIdInput]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAuditLog({
    table: table || undefined,
    action: action || undefined,
    daysBack,
    pageSize: PAGE_SIZE,
    rowId: rowIdApplied || undefined,
  });

  // Flatten all loaded pages into a single event list.
  const entries = useMemo(
    () => data?.pages.flatMap((p) => p.entries) ?? [],
    [data],
  );

  // KPIs — computed over the loaded pages. "Last 24h" / "Last 7d" remain meaningful
  // because the events are sorted newest-first; the actor count grows as more pages load.
  const summary = useMemo(() => {
    const now = Date.now();
    const today = now - 24 * 60 * 60 * 1000;
    const week = now - 7 * 24 * 60 * 60 * 1000;
    const todayCount = entries.filter((e) => new Date(e.changed_at).getTime() >= today).length;
    const weekCount = entries.filter((e) => new Date(e.changed_at).getTime() >= week).length;
    const actors = new Set(entries.map((e) => e.actor?.id ?? e.changed_by ?? "unknown")).size;
    return { todayCount, weekCount, actors };
  }, [entries]);

  return (
    <div className="mobile-container" style={{ background: "oklch(0.985 0.004 80)" }}>
      <AppHeader title="Audit Log" subtitle="SYSTEM ACTIVITY" bgImage={HERO_BG} showBack showNotification />

      <div className="px-4 py-4 space-y-5 pb-24 lg:px-8 lg:py-7 lg:space-y-6">
        {/* Admin badge */}
        <div
          className="rounded-xl px-3 py-2 flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, oklch(0.62 0.09 68 / 8%), oklch(1 0 0))",
            border: "1px solid oklch(0.62 0.09 68 / 25%)",
          }}
        >
          <ShieldCheck size={14} style={{ color: "oklch(0.42 0.09 68)" }} />
          <p className="text-[11px]" style={{ color: "oklch(0.35 0.008 65)" }}>
            Admin view — captures every write across all SOP tables. Read-only.
          </p>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          <KpiCard icon={Activity} label="Last 24h" primary={String(summary.todayCount)} tint="oklch(0.42 0.09 68)" tintBg="oklch(0.62 0.09 68 / 10%)" />
          <KpiCard icon={Clock}    label="Last 7d"  primary={String(summary.weekCount)}  tint="oklch(0.45 0.10 55)" tintBg="oklch(0.65 0.10 55 / 10%)" />
          <KpiCard icon={Users}    label="Actors"   primary={String(summary.actors)}     tint="oklch(0.45 0.09 240)" tintBg="oklch(0.55 0.09 240 / 10%)" />
        </div>

        {/* Filters */}
        <div
          className="rounded-2xl p-3 space-y-3"
          style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
        >
          <div className="flex items-center gap-2">
            <Filter size={12} style={{ color: "oklch(0.42 0.09 68)" }} />
            <p className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.10em", fontWeight: 700 }}>
              FILTERS
            </p>
          </div>

          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
            <FilterRow label="TABLE">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible lg:pb-0">
                {TABLE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    active={table === opt.value}
                    onClick={() => setTable(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </FilterRow>

            <FilterRow label="ACTION">
              <div className="flex gap-1.5">
                {ACTION_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value || "any"}
                    active={action === opt.value}
                    onClick={() => setAction(opt.value as AuditAction | "")}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </FilterRow>

            <FilterRow label="WINDOW">
              <div className="flex gap-1.5">
                {DAYS_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.label}
                    active={daysBack === opt.value}
                    onClick={() => setDaysBack(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
            </FilterRow>

            <FilterRow label="ROW ID">
              <div
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5"
                style={{ background: "oklch(0.96 0.006 75)", border: "1px solid oklch(0.90 0.010 75)" }}
              >
                <Search size={12} style={{ color: "oklch(0.52 0.010 68)" }} />
                <input
                  type="text"
                  value={rowIdInput}
                  onChange={(e) => setRowIdInput(e.target.value)}
                  placeholder="e.g. PRJ001 or 42"
                  className="flex-1 bg-transparent text-[11px] outline-none placeholder:opacity-60"
                  style={{ color: "oklch(0.14 0.008 65)" }}
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {rowIdInput && (
                  <button
                    onClick={() => setRowIdInput("")}
                    className="text-[10px] font-label px-1.5 py-0.5 rounded"
                    style={{
                      color: "oklch(0.52 0.010 68)",
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.90 0.010 75)",
                      letterSpacing: "0.04em",
                      fontWeight: 700,
                    }}
                  >
                    CLEAR
                  </button>
                )}
              </div>
              <p className="text-[9px] mt-1" style={{ color: "oklch(0.55 0.008 65)" }}>
                Exact match — finds every event for a specific row (project, payment, signature, etc.).
              </p>
            </FilterRow>
          </div>
        </div>

        {/* Event list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-label text-xs" style={{ color: "oklch(0.20 0.008 65)", letterSpacing: "0.10em", fontWeight: 700 }}>
              EVENTS
            </p>
            <span className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>
              {entries.length} loaded{hasNextPage ? " · more available" : ""}
            </span>
          </div>

          {isLoading && (
            <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
              <p className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>Loading…</p>
            </div>
          )}

          {!isLoading && entries.length === 0 && (
            <div
              className="rounded-2xl p-6 flex flex-col items-center text-center"
              style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}
            >
              <Database size={22} className="mb-2" style={{ color: "oklch(0.75 0.008 68)" }} />
              <p className="text-sm font-semibold" style={{ color: "oklch(0.14 0.008 65)" }}>No events match</p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
                Try a wider time window or removing filters
              </p>
            </div>
          )}

          {!isLoading && entries.length > 0 && (
            <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2 lg:items-start xl:grid-cols-3">
              {entries.map((entry) => (
                <AuditEventCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {!isLoading && entries.length > 0 && hasNextPage && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="w-full mt-3 rounded-xl py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: "oklch(1 0 0)",
                border: "1px solid oklch(0.62 0.09 68 / 35%)",
                boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)",
              }}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 size={13} className="animate-spin" style={{ color: "oklch(0.42 0.09 68)" }} />
                  <span className="text-xs font-label" style={{ color: "oklch(0.42 0.09 68)", letterSpacing: "0.04em", fontWeight: 700 }}>
                    LOADING…
                  </span>
                </>
              ) : (
                <span className="text-xs font-label" style={{ color: "oklch(0.42 0.09 68)", letterSpacing: "0.04em", fontWeight: 700 }}>
                  LOAD {PAGE_SIZE} MORE
                </span>
              )}
            </motion.button>
          )}

          {!isLoading && entries.length > 0 && !hasNextPage && (
            <p className="text-[10px] text-center mt-3" style={{ color: "oklch(0.55 0.008 65)" }}>
              End of results
            </p>
          )}
        </div>

        <p className="text-[10px] text-center font-label pt-2" style={{ color: "oklch(0.65 0.008 68)", letterSpacing: "0.06em" }}>
          SPAZEHAUS · AUDIT LOG · ADMIN VIEW
        </p>

        {/* Quick back to Company */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/company")}
          className="w-full rounded-xl py-2.5 flex items-center justify-center gap-2"
          style={{ background: "oklch(0.96 0.006 75)", border: "1px solid oklch(0.90 0.010 75)" }}
        >
          <ArrowLeft size={13} style={{ color: "oklch(0.42 0.09 68)" }} />
          <span className="text-xs font-label" style={{ color: "oklch(0.42 0.09 68)", letterSpacing: "0.04em", fontWeight: 700 }}>
            BACK TO COMPANY
          </span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── Event card ─────────────────────────────────────────────────────────────

function AuditEventCard({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const visual = actionVisual[entry.action];
  const Icon = visual.icon;
  const summary = summarizeAudit(entry);
  const rel = relativeTime(entry.changed_at);
  const tableLabel = TABLE_OPTIONS.find((t) => t.value === entry.table_name)?.label ?? entry.table_name;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)", boxShadow: "0 1px 8px oklch(0 0 0 / 0.04)" }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-3 flex items-start gap-3 text-left lg:items-center"
      >
        {/* Action icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: visual.bg, border: `1px solid ${visual.border}` }}
        >
          <Icon size={14} style={{ color: visual.tint }} />
        </div>

        {/* On mobile: stacked; on lg: flex row with fixed column widths */}
        <div className="flex-1 min-w-0 lg:flex lg:items-center lg:gap-4">
          {/* Action badge + table — fixed width column on lg */}
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:w-36 lg:shrink-0">
            <span
              className="text-[9px] font-label px-1.5 py-0.5 rounded-md"
              style={{ background: visual.bg, color: visual.tint, border: `1px solid ${visual.border}`, letterSpacing: "0.04em", fontWeight: 700 }}
            >
              {visual.verb.toUpperCase()}
            </span>
            <span className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>
              {tableLabel.toUpperCase()}
            </span>
          </div>

          {/* Summary — flex-grows to fill available space */}
          <p className="text-sm font-semibold mt-1 leading-snug lg:mt-0 lg:flex-1 lg:min-w-0 lg:truncate" style={{ color: "oklch(0.14 0.008 65)" }}>
            {summary}
          </p>

          {/* Row ID + actor + timestamp — right-aligned metadata on lg */}
          <div className="flex items-center gap-2 mt-1 flex-wrap lg:mt-0 lg:flex-nowrap lg:shrink-0 lg:gap-3">
            <span className="text-[10px]" style={{ color: "oklch(0.55 0.008 65)" }}>
              {entry.row_id || "—"}
            </span>
            <span className="text-[10px] hidden lg:inline" style={{ color: "oklch(0.75 0.008 68)" }}>·</span>
            <span className="text-[10px]" style={{ color: "oklch(0.55 0.008 65)" }}>
              {entry.actor?.name ?? (entry.changed_by ? "Unknown user" : "System")}
            </span>
            <span className="text-[10px] hidden lg:inline" style={{ color: "oklch(0.75 0.008 68)" }}>·</span>
            <span className="text-[10px] hidden lg:inline" style={{ color: "oklch(0.55 0.008 65)" }}>{rel}</span>
            {/* Mobile: show rel inline */}
            <span className="text-[10px] lg:hidden" style={{ color: "oklch(0.52 0.010 68)" }}>· {rel}</span>
          </div>
        </div>

        <div className="shrink-0">
          {expanded ? (
            <ChevronUp size={14} style={{ color: "oklch(0.52 0.010 68)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "oklch(0.52 0.010 68)" }} />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3" style={{ borderTop: "1px solid oklch(0.93 0.008 75)" }}>
              <DiffView entry={entry} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Diff view ──────────────────────────────────────────────────────────────

function DiffView({ entry }: { entry: AuditEntry }) {
  const { action } = entry;
  // Audit trigger always serialises row records as JSON objects (never bare
  // scalars or arrays), but Postgres JSONB is typed as `Json` in the schema.
  // Narrow at the boundary so the rest of the diff helpers can treat them as
  // structured records.
  const before_data = entry.before_data as Record<string, unknown> | null;
  const after_data = entry.after_data as Record<string, unknown> | null;

  // For INSERT show only the resulting row's interesting fields.
  if (action === "INSERT") {
    return (
      <div className="pt-3 space-y-1">
        <p className="text-[10px] font-label mb-1.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em", fontWeight: 700 }}>
          INITIAL VALUES
        </p>
        {renderFieldList(after_data)}
        <ChangedAt entry={entry} />
      </div>
    );
  }

  if (action === "DELETE") {
    return (
      <div className="pt-3 space-y-1">
        <p className="text-[10px] font-label mb-1.5" style={{ color: "oklch(0.50 0.12 25)", letterSpacing: "0.08em", fontWeight: 700 }}>
          DELETED RECORD
        </p>
        {renderFieldList(before_data)}
        <ChangedAt entry={entry} />
      </div>
    );
  }

  // UPDATE — show only changed fields
  const changes = diffRows(before_data, after_data);
  if (changes.length === 0) {
    return (
      <div className="pt-3">
        <p className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>No discernible field changes (likely a trigger touch on `updated_at`).</p>
        <ChangedAt entry={entry} />
      </div>
    );
  }
  return (
    <div className="pt-3 space-y-2.5">
      <p className="text-[10px] font-label mb-1" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.08em", fontWeight: 700 }}>
        CHANGES ({changes.length})
      </p>
      {changes.map(({ key, before, after }) => (
        <div key={key} className="text-[11px] leading-snug" style={{ color: "oklch(0.35 0.008 65)" }}>
          <p className="font-label text-[10px] mb-0.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em", fontWeight: 700 }}>
            {key}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <code
              className="px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.60 0.12 25 / 8%)", color: "oklch(0.50 0.12 25)", fontSize: 10 }}
            >
              {fmtValue(before)}
            </code>
            <span style={{ color: "oklch(0.55 0.008 65)" }}>→</span>
            <code
              className="px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.55 0.09 145 / 10%)", color: "oklch(0.38 0.09 145)", fontSize: 10 }}
            >
              {fmtValue(after)}
            </code>
          </div>
        </div>
      ))}
      <ChangedAt entry={entry} />
    </div>
  );
}

function ChangedAt({ entry }: { entry: AuditEntry }) {
  return (
    <p className="text-[10px] mt-3 pt-2.5" style={{ color: "oklch(0.55 0.008 65)", borderTop: "1px solid oklch(0.93 0.008 75)" }}>
      Logged at {new Date(entry.changed_at).toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </p>
  );
}

function renderFieldList(data: Record<string, unknown> | null) {
  if (!data) return <p className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>—</p>;
  const entries = Object.entries(data)
    .filter(([k]) => !INTERNAL_FIELDS.has(k))
    .filter(([, v]) => v !== null && v !== "" && v !== undefined);
  if (entries.length === 0) {
    return <p className="text-[10px]" style={{ color: "oklch(0.52 0.010 68)" }}>(empty)</p>;
  }
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-label" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.04em" }}>{k}</p>
          <p className="text-[10px] text-right truncate" style={{ color: "oklch(0.20 0.008 65)", maxWidth: "55%" }}>
            {fmtValue(v)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-label mb-1.5" style={{ color: "oklch(0.52 0.010 68)", letterSpacing: "0.10em", fontWeight: 700 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-label"
      style={{
        background: active ? "oklch(0.62 0.09 68)" : "oklch(0.96 0.006 75)",
        color: active ? "oklch(1 0 0)" : "oklch(0.45 0.008 65)",
        border: active ? "none" : "1px solid oklch(0.90 0.010 75)",
        letterSpacing: "0.04em",
        fontWeight: active ? 700 : 500,
      }}
    >
      {children}
    </motion.button>
  );
}

function KpiCard({
  icon: Icon,
  label,
  primary,
  tint,
  tintBg,
}: {
  icon: typeof Activity;
  label: string;
  primary: string;
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
      </div>
      <p className="font-display text-xl font-semibold leading-none" style={{ color: "oklch(0.14 0.008 65)" }}>
        {primary}
      </p>
      <p className="text-[10px] mt-1" style={{ color: "oklch(0.52 0.010 68)" }}>
        {label}
      </p>
    </div>
  );
}

// Fields we intentionally hide from the diff/init list — they're noisy or low-value
const INTERNAL_FIELDS = new Set([
  "id", "created_at", "updated_at", "total_score",
]);

/** Format an arbitrary value into a compact, readable string. */
function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    if (v.length === 0) return "(empty)";
    if (v.length > 80) return v.slice(0, 77) + "…";
    return v;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.length}]${v.length > 0 ? ` ${v.slice(0, 3).map(fmtValue).join(", ")}${v.length > 3 ? "…" : ""}` : ""}`;
  if (typeof v === "object") {
    try {
      const s = JSON.stringify(v);
      return s.length > 80 ? s.slice(0, 77) + "…" : s;
    } catch {
      return "{…}";
    }
  }
  return String(v);
}

/** Compute a list of fields whose values differ between before and after. */
function diffRows(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<{ key: string; before: unknown; after: unknown }> {
  if (!before || !after) return [];
  // Build a deduped key list without iterating a Set (avoids the
  // downlevelIteration requirement when the TS target is < ES2015).
  const seen: Record<string, true> = Object.create(null);
  const keys: string[] = [];
  for (const k of Object.keys(before)) if (!seen[k]) { seen[k] = true; keys.push(k); }
  for (const k of Object.keys(after))  if (!seen[k]) { seen[k] = true; keys.push(k); }
  const out: Array<{ key: string; before: unknown; after: unknown }> = [];
  for (const k of keys) {
    if (INTERNAL_FIELDS.has(k)) continue;
    const b = before[k];
    const a = after[k];
    if (!deepEqual(b, a)) {
      out.push({ key: k, before: b, after: a });
    }
  }
  return out.sort((x, y) => x.key.localeCompare(y.key));
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/** Relative time formatter — "5m ago", "2h ago", "3d ago", "12 Feb". */
function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

/** Smart one-line summary for an audit entry. Falls back to a generic verb + table. */
function summarizeAudit(entry: AuditEntry): string {
  const { table_name, action, before_data, after_data } = entry;
  const after = (after_data ?? {}) as Record<string, unknown>;
  const before = (before_data ?? {}) as Record<string, unknown>;

  if (table_name === "payment_records") {
    const gate = (after.gate ?? before.gate) as number | undefined;
    const gateLabel = gate ? ["①", "②", "③", "④", "⑤"][gate - 1] : "?";
    if (action === "UPDATE" && before.status !== "completed" && after.status === "completed") {
      const amount = after.amount as number | undefined;
      return `Marked payment ${gateLabel} collected${amount ? ` — RM ${Number(amount).toLocaleString()}` : ""}`;
    }
    if (action === "INSERT") {
      return `New payment ${gateLabel}${after.amount ? ` — RM ${Number(after.amount).toLocaleString()}` : ""}`;
    }
  }

  if (table_name === "signature_records") {
    const label = (after.label ?? before.label) as string | undefined;
    if (action === "UPDATE") {
      if (before.status !== "completed" && after.status === "completed") {
        return `Signed ${label ?? "document"}${after.signed_by ? ` by ${after.signed_by}` : ""}`;
      }
      if (before.document_ref !== after.document_ref && after.document_ref) {
        return `Uploaded document for ${label ?? "signature"}`;
      }
    }
  }

  if (table_name === "projects") {
    if (action === "INSERT") {
      return `New project ${after.name ?? entry.row_id}`;
    }
    if (action === "UPDATE" && before.current_stage_id !== after.current_stage_id) {
      return `Stage advanced ${before.current_stage_id ?? "—"} → ${after.current_stage_id ?? "—"}`;
    }
    if (action === "UPDATE" && before.status !== after.status) {
      return `Project ${after.name ?? entry.row_id} status: ${after.status}`;
    }
  }

  if (table_name === "inquiries") {
    if (action === "INSERT") return `New inquiry from ${after.client_name ?? entry.row_id}`;
    if (action === "UPDATE" && before.stage !== after.stage) {
      return `Inquiry ${entry.row_id} → ${after.stage}`;
    }
  }

  if (table_name === "leave_requests") {
    if (action === "INSERT") return `Leave request from staff ${after.staff_id ?? entry.row_id}`;
    if (action === "UPDATE" && before.status !== after.status) {
      return `Leave ${entry.row_id} ${after.status}`;
    }
  }

  if (table_name === "quotations") {
    if (action === "INSERT") return `New ${(after.doc_type ?? "quotation")} ${entry.row_id}`;
    if (action === "UPDATE" && before.status !== after.status) {
      return `Quotation ${entry.row_id} → ${after.status}`;
    }
  }

  if (table_name === "staff") {
    if (action === "INSERT") return `New staff ${after.name ?? entry.row_id}`;
    if (action === "UPDATE" && before.auth_user_id !== after.auth_user_id && after.auth_user_id) {
      return `Linked auth account to ${after.name ?? entry.row_id}`;
    }
  }

  // Fallback
  const visual = actionVisual[action];
  return `${visual.verb} ${table_name} ${entry.row_id || ""}`.trim();
}
