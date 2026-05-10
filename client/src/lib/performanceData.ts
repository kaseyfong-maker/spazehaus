/*
 * SPAZEHAUS PERFORMANCE REPORTS
 * Source: 2026 Annual Meeting PDF — "Performance Report" pillar.
 *
 *   • Team & Personal Performance — sales target, gross profit target
 *   • Project timeline
 *   • Generate report / analysis
 *
 * Sales attribution is derived from `inquiries` (assignedTo + awardedProjectId),
 * cross-referenced with `projects` for awarded values.
 */

import { inquiries } from "./customerData";
import { projects, staffMembers } from "./mockData";
import { quotations, computeTotals } from "./quotationData";
import { MOCK_TODAY } from "./lifecycleData";

// —————————————————————————————————————————————————————————————
// Targets (per-staff + company-level)
// —————————————————————————————————————————————————————————————

export type StaffTarget = {
  staffId: string;            // matches staffMembers.id (e.g. SH001)
  monthlyTarget: number;      // RM awarded per month
  ytdTarget: number;          // RM awarded year-to-date (Jan–today)
  gpTargetPct: number;        // gross-profit % expected on awarded value
};

export const staffTargets: StaffTarget[] = [
  // Grace Tan — Principal Designer (closes high-end VIP/Commercial)
  { staffId: "SH001", monthlyTarget: 200_000, ytdTarget: 1_000_000, gpTargetPct: 28 },
  // Hong Li — Sales Consultant (residential)
  { staffId: "SH005", monthlyTarget: 100_000, ytdTarget: 500_000,   gpTargetPct: 22 },
  // Chiou Ying — Sales Consultant (residential, junior)
  { staffId: "SH010", monthlyTarget: 60_000,  ytdTarget: 300_000,   gpTargetPct: 22 },
];

export const COMPANY_GP_TARGET_PCT: number = 25;            // overall company target
export const COMPANY_MONTHLY_REVENUE_TARGET: number = 360_000;  // sum of staff monthly targets

// —————————————————————————————————————————————————————————————
// Helpers
// —————————————————————————————————————————————————————————————

/** Map staff avatar code (e.g. "GT") to the canonical staff record. */
function staffByAvatar(avatar: string) {
  return staffMembers.find((s) => s.avatar === avatar);
}

/** Map staff id (SH001) to avatar code (GT). */
function avatarByStaffId(staffId: string): string | undefined {
  return staffMembers.find((s) => s.id === staffId)?.avatar;
}

/** Parse DD/MM/YYYY into a real Date. */
function parse(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

// —————————————————————————————————————————————————————————————
// Per-staff sales performance
// —————————————————————————————————————————————————————————————

export type StaffPerformance = {
  staffId: string;
  name: string;
  avatar: string;
  role: string;
  monthlyTarget: number;
  ytdTarget: number;
  gpTargetPct: number;
  awardedYTD: number;          // RM of awarded inquiries this calendar year
  awardedThisMonth: number;    // RM of awarded inquiries this month
  awardedCount: number;
  pipelineRM: number;          // estimated value of inquiries currently in pipeline (assigned to this staff)
  pipelineCount: number;
  projectedGP: number;         // awardedYTD * gpTargetPct
  ytdAchievementPct: number;   // 0..1+ (>1 = exceeded)
  monthAchievementPct: number;
};

/** Compute one staff member's performance metrics. */
export function staffPerformance(staffId: string, today: Date = MOCK_TODAY): StaffPerformance | undefined {
  const target = staffTargets.find((t) => t.staffId === staffId);
  if (!target) return undefined;
  const staff = staffMembers.find((s) => s.id === staffId);
  if (!staff) return undefined;

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  // Inquiries awarded by this staff (matched via assignedTo avatar code)
  const myInquiries = inquiries.filter((i) => i.assignedTo === staff.avatar);

  let awardedYTD = 0;
  let awardedThisMonth = 0;
  let awardedCount = 0;

  for (const inq of myInquiries) {
    if (inq.stage !== "awarded") continue;
    const awardedDate = parse(inq.awardedDate);
    if (!awardedDate) continue;
    if (awardedDate < startOfYear) continue; // out of YTD window

    awardedCount += 1;
    const value = inq.estimatedBudget ?? 0;
    awardedYTD += value;
    if (awardedDate >= startOfMonth) awardedThisMonth += value;
  }

  // Active pipeline RM
  const pipeline = myInquiries.filter((i) => i.stage === "new-inquiry" || i.stage === "showroom-meet");
  const pipelineRM = pipeline.reduce((s, i) => s + (i.estimatedBudget ?? 0), 0);
  const pipelineCount = pipeline.length;

  const projectedGP = awardedYTD * (target.gpTargetPct / 100);

  return {
    staffId,
    name: staff.name,
    avatar: staff.avatar,
    role: staff.role,
    monthlyTarget: target.monthlyTarget,
    ytdTarget: target.ytdTarget,
    gpTargetPct: target.gpTargetPct,
    awardedYTD,
    awardedThisMonth,
    awardedCount,
    pipelineRM,
    pipelineCount,
    projectedGP,
    ytdAchievementPct: target.ytdTarget === 0 ? 0 : awardedYTD / target.ytdTarget,
    monthAchievementPct: target.monthlyTarget === 0 ? 0 : awardedThisMonth / target.monthlyTarget,
  };
}

/** Get performance for all sales staff who have a target. */
export function teamPerformance(today: Date = MOCK_TODAY): StaffPerformance[] {
  return staffTargets
    .map((t) => staffPerformance(t.staffId, today))
    .filter((p): p is StaffPerformance => p !== undefined)
    .sort((a, b) => b.awardedYTD - a.awardedYTD); // leaderboard: top first
}

// —————————————————————————————————————————————————————————————
// Company-level rollup
// —————————————————————————————————————————————————————————————

export type CompanyPerformance = {
  awardedYTD: number;
  awardedThisMonth: number;
  monthlyRevenueTarget: number;
  ytdRevenueTarget: number;
  monthAchievementPct: number;
  ytdAchievementPct: number;
  projectedGP: number;
  gpTargetPct: number;
  invoicedRM: number;          // sum of all invoices
  collectedRM: number;         // sum of paid invoices
  pipelineRM: number;          // active pipeline RM
};

export function companyPerformance(today: Date = MOCK_TODAY): CompanyPerformance {
  const team = teamPerformance(today);
  const awardedYTD = team.reduce((s, p) => s + p.awardedYTD, 0);
  const awardedThisMonth = team.reduce((s, p) => s + p.awardedThisMonth, 0);
  const pipelineRM = team.reduce((s, p) => s + p.pipelineRM, 0);

  // Sum of YTD targets across staff
  const ytdRevenueTarget = staffTargets.reduce((s, t) => s + t.ytdTarget, 0);

  // Project-level invoiced + collected via quotationData
  let invoicedRM = 0;
  let collectedRM = 0;
  for (const q of quotations) {
    const { total } = computeTotals(q.items, q.taxRate);
    if (q.type === "Invoice" || q.status === "invoiced" || q.status === "paid") {
      invoicedRM += total;
      if (q.status === "paid") collectedRM += total;
    }
  }

  const projectedGP = awardedYTD * (COMPANY_GP_TARGET_PCT / 100);

  return {
    awardedYTD,
    awardedThisMonth,
    monthlyRevenueTarget: COMPANY_MONTHLY_REVENUE_TARGET,
    ytdRevenueTarget,
    monthAchievementPct: COMPANY_MONTHLY_REVENUE_TARGET === 0 ? 0 : awardedThisMonth / COMPANY_MONTHLY_REVENUE_TARGET,
    ytdAchievementPct: ytdRevenueTarget === 0 ? 0 : awardedYTD / ytdRevenueTarget,
    projectedGP,
    gpTargetPct: COMPANY_GP_TARGET_PCT,
    invoicedRM,
    collectedRM,
    pipelineRM,
  };
}

// —————————————————————————————————————————————————————————————
// Project timeline (gantt-ish data)
// —————————————————————————————————————————————————————————————

export type TimelineRow = {
  projectId: string;
  name: string;
  client: string;
  status: string;
  designer: string;
  start: Date;
  end: Date;
  progressPct: number;
  budget: number;
};

/** Build a sorted gantt-friendly timeline for all projects, ordered by start date. */
export function projectTimeline(): TimelineRow[] {
  return projects
    .map((p) => {
      const start = parse(p.startDate);
      const end = parse(p.targetDate);
      if (!start || !end) return null;
      return {
        projectId: p.id,
        name: p.name,
        client: p.client,
        status: p.status,
        designer: p.designer,
        start,
        end,
        progressPct: p.progress,
        budget: p.budget,
      } as TimelineRow;
    })
    .filter((r): r is TimelineRow => r !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** The min start and max end across the entire timeline — used to size the gantt scale. */
export function timelineBounds(rows: TimelineRow[]): { min: Date; max: Date } {
  if (rows.length === 0) {
    return { min: new Date(2026, 0, 1), max: new Date(2026, 11, 31) };
  }
  const minMs = Math.min(...rows.map((r) => r.start.getTime()));
  const maxMs = Math.max(...rows.map((r) => r.end.getTime()));
  return { min: new Date(minMs), max: new Date(maxMs) };
}

/** Position a date as a fractional 0..1 along the timeline bounds. */
export function timelinePos(d: Date, bounds: { min: Date; max: Date }): number {
  const span = bounds.max.getTime() - bounds.min.getTime();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (d.getTime() - bounds.min.getTime()) / span));
}

// —————————————————————————————————————————————————————————————
// Currency formatter for compact display
// —————————————————————————————————————————————————————————————

/** Compact RM formatter for KPI tiles: 1,200,000 → RM 1.2M; 150,000 → RM 150K */
export function formatRMCompact(value: number): string {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value.toFixed(0)}`;
}

// staff lookups for the report
export { staffByAvatar, avatarByStaffId };
