/*
 * SPAZEHAUS — Shared status/priority UI tokens
 *
 * Historically this file held in-memory mock arrays (staff, projects, leave,
 * candidates, announcements, KPI, calendar events). All of those have been
 * migrated to Supabase queries in `queries.ts`. What remains here are two
 * style-config objects still consumed by Projects.tsx, ProjectDetail.tsx,
 * StaffDirectory.tsx, StaffProfile.tsx, and LeaveManagement.tsx for badge
 * rendering — these are pure UI tokens, not data.
 */

export const statusConfig = {
  "active": { label: "Active", bg: "oklch(0.55 0.07 240 / 20%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.55 0.07 240 / 30%)" },
  "assigned": { label: "Assigned", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  "under-review": { label: "Under Review", bg: "oklch(0.75 0.12 68 / 15%)", color: "oklch(0.80 0.12 68)", border: "oklch(0.75 0.12 68 / 25%)" },
  "completed": { label: "Completed", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
  "on-hold": { label: "On Hold", bg: "oklch(0.55 0.006 80 / 15%)", color: "oklch(0.65 0.006 80)", border: "oklch(0.55 0.006 80 / 25%)" },
  "pending": { label: "Pending", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  "approved": { label: "Approved", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
  "rejected": { label: "Rejected", bg: "oklch(0.58 0.12 25 / 20%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 30%)" },
  "on-leave": { label: "On Leave", bg: "oklch(0.58 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 25%)" },
  "on-project": { label: "On Project", bg: "oklch(0.55 0.07 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.55 0.07 240 / 25%)" },
};

export const priorityConfig = {
  "high": { label: "High", color: "oklch(0.68 0.12 25)" },
  "medium": { label: "Medium", color: "oklch(0.72 0.09 68)" },
  "low": { label: "Low", color: "oklch(0.60 0.07 145)" },
};
