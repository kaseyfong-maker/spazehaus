/*
 * SPAZEHAUS — Reminder UI tokens + date helper
 *
 * Historically this file held the in-memory site-photo log, the `getReminders`
 * builder, and a summary aggregator. All three now live in `queries.ts` as
 * `buildReminders` / `reminderSummary` / `buildSitePhotoMaps`, computed off
 * real Supabase rows. What remains here are the three TypeScript types
 * (`ReminderType` / `ReminderStatus` / `Reminder`), the `lastNDays` helper
 * (used by the Reminders page 14-day photo grid), and the two badge palettes
 * still referenced by the Reminders page for badge rendering.
 */

import { MOCK_TODAY } from "./lifecycleData";

export type ReminderType = "daily-site-photo" | "weekly-payment-review" | "weekly-site-report";

export type ReminderStatus = "completed" | "pending" | "overdue" | "upcoming";

export type Reminder = {
  id: string;
  type: ReminderType;
  title: string;
  dueDate: string;            // DD/MM/YYYY
  assignee: string;            // staff avatar code
  projectId?: string;          // when project-scoped
  projectName?: string;
  status: ReminderStatus;
  completedAt?: string;
  note?: string;
};

/** Format a date as DD/MM/YYYY */
function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Generate the past N days as DD/MM/YYYY strings (most recent last). */
export function lastNDays(n: number, today: Date = MOCK_TODAY): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(fmt(d));
  }
  return out;
}

export const reminderTypeConfig: Record<ReminderType, { label: string; color: string; bg: string }> = {
  "daily-site-photo":      { label: "Daily Site Photo",      color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)" },
  "weekly-payment-review": { label: "Weekly Payment Review", color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 12%)" },
  "weekly-site-report":    { label: "Weekly Site Report",    color: "oklch(0.45 0.10 55)",  bg: "oklch(0.65 0.10 55 / 12%)" },
};

export const reminderStatusConfig: Record<ReminderStatus, { label: string; color: string; bg: string; border: string }> = {
  completed: { label: "Done",     color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)", border: "oklch(0.55 0.09 145 / 25%)" },
  pending:   { label: "Due Today", color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)",  border: "oklch(0.62 0.09 68 / 25%)" },
  overdue:   { label: "Missed",   color: "oklch(0.50 0.12 25)",  bg: "oklch(0.60 0.12 25 / 12%)",  border: "oklch(0.60 0.12 25 / 25%)" },
  upcoming:  { label: "Upcoming", color: "oklch(0.55 0.006 80)", bg: "oklch(0.55 0.006 80 / 12%)", border: "oklch(0.55 0.006 80 / 25%)" },
};
