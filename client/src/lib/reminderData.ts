/*
 * SPAZEHAUS REMINDERS
 * Source: 2026 Annual Meeting PDF — "Reminder" pillar.
 *
 *   Daily   · Site status / close-door photo (per active site)
 *   Weekly  · Payment review
 *   Weekly  · Site report (per active project)
 *
 * Mock data is anchored to MOCK_TODAY (2026-05-10) so the "missed" / "due today"
 * buckets are deterministic in the demo.
 */

import { projects } from "./mockData";
import { MOCK_TODAY, daysFromToday } from "./lifecycleData";

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

// —————————————————————————————————————————————————————————————
// Daily site-photo log (per active project, last 14 days)
// "true" = photo uploaded that day; "false" = missed
// —————————————————————————————————————————————————————————————

export type SitePhotoLog = {
  projectId: string;
  // map of DD/MM/YYYY → uploaded?
  photos: Record<string, { uploaded: boolean; uploadedAt?: string; by?: string; note?: string }>;
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

/**
 * Build a 14-day site photo log for each active project.
 * Some days are intentionally missed to demonstrate the SOP enforcement.
 */
function buildPhotoLog(projectId: string, missedIndices: number[], supervisor: string): SitePhotoLog {
  const days = lastNDays(14);
  const photos: SitePhotoLog["photos"] = {};
  days.forEach((day, i) => {
    if (missedIndices.includes(i)) {
      photos[day] = { uploaded: false };
    } else {
      photos[day] = {
        uploaded: true,
        uploadedAt: ["18:42", "19:05", "17:55", "18:20", "19:30", "18:10", "17:45"][i % 7],
        by: supervisor,
      };
    }
  });
  return { projectId, photos };
}

/**
 * Site photo logs — only for projects in BUILD phase (active sites).
 * Index 13 = today (2026-05-10). Index 0 = 14 days ago (2026-04-27).
 *
 *   PRJ001 Paragon Residence — supervisor LH (Leong Hui)
 *     missed: index 5 (2026-05-02), 8 (2026-05-05) · 12 (yesterday) — and 13 (today, not yet uploaded)
 *
 *   PRJ005 Austin Heights — supervisor LH
 *     missed: index 9 (2026-05-06), 11 (2026-05-08) · 13 (today, not yet uploaded)
 */
export const sitePhotoLogs: SitePhotoLog[] = [
  buildPhotoLog("PRJ001", [5, 8, 12, 13], "LH"),
  buildPhotoLog("PRJ005", [9, 11, 13], "LH"),
];

export function getPhotoLog(projectId: string): SitePhotoLog | undefined {
  return sitePhotoLogs.find((l) => l.projectId === projectId);
}

// —————————————————————————————————————————————————————————————
// Today / weekly cadence reminders
// —————————————————————————————————————————————————————————————

const ACTIVE_PROJECT_IDS = ["PRJ001", "PRJ002", "PRJ003", "PRJ005"]; // PRJ004 closed

/** Find the upcoming Friday on or after today. */
function upcomingFriday(today: Date = MOCK_TODAY): Date {
  const d = new Date(today);
  // 0 Sun, 1 Mon, ..., 5 Fri
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Build the live reminder list — daily site photos for today, plus weekly cadences,
 * plus any missed daily photos from the last 14 days.
 */
export function getReminders(today: Date = MOCK_TODAY): Reminder[] {
  const todayStr = fmt(today);
  const reminders: Reminder[] = [];

  // —— Daily site photo (today) for each active site ——
  for (const log of sitePhotoLogs) {
    const project = projects.find((p) => p.id === log.projectId);
    if (!project) continue;
    const todayPhoto = log.photos[todayStr];
    const status: ReminderStatus = todayPhoto?.uploaded ? "completed" : "pending";

    reminders.push({
      id: `RM-${log.projectId}-PHOTO-${todayStr}`,
      type: "daily-site-photo",
      title: `Close-door photo · ${project.name}`,
      dueDate: todayStr,
      assignee: todayPhoto?.by || "LH",
      projectId: project.id,
      projectName: project.name,
      status,
      completedAt: todayPhoto?.uploaded ? todayPhoto.uploadedAt : undefined,
      note: status === "completed" ? `Uploaded ${todayPhoto?.uploadedAt}` : "Awaiting upload",
    });
  }

  // —— Missed daily photos (last 14 days, excluding today) ——
  for (const log of sitePhotoLogs) {
    const project = projects.find((p) => p.id === log.projectId);
    if (!project) continue;
    for (const [day, photo] of Object.entries(log.photos)) {
      if (day === todayStr) continue;
      if (photo.uploaded) continue;
      reminders.push({
        id: `RM-${log.projectId}-PHOTO-${day}`,
        type: "daily-site-photo",
        title: `Missed: close-door photo · ${project.name}`,
        dueDate: day,
        assignee: "LH",
        projectId: project.id,
        projectName: project.name,
        status: "overdue",
        note: `No photo logged on ${day}`,
      });
    }
  }

  // —— Weekly payment review (every Friday) — assigned to admin (DN = Denise Ng) ——
  const fri = upcomingFriday(today);
  const friStr = fmt(fri);
  const friDays = daysFromToday(friStr, today) ?? 7;
  reminders.push({
    id: `RM-WEEKLY-PAYMENT-${friStr}`,
    type: "weekly-payment-review",
    title: "Weekly Payment Review",
    dueDate: friStr,
    assignee: "DN",
    status: friDays === 0 ? "pending" : "upcoming",
    note: "Reconcile collected vs outstanding · review overdue gates",
  });

  // —— Weekly site report (every Friday) — per active project, by site supervisor / PM ——
  for (const projectId of ACTIVE_PROJECT_IDS) {
    const project = projects.find((p) => p.id === projectId);
    if (!project) continue;
    reminders.push({
      id: `RM-${projectId}-SITE-REPORT-${friStr}`,
      type: "weekly-site-report",
      title: `Weekly Site Report · ${project.name}`,
      dueDate: friStr,
      assignee: project.team[0] || "WH", // first team member as default reporter
      projectId: project.id,
      projectName: project.name,
      status: friDays === 0 ? "pending" : "upcoming",
      note: "Photos · progress · blockers · next-week plan",
    });
  }

  // Sort: overdue first, then today's pending, then upcoming
  const order: Record<ReminderStatus, number> = { overdue: 0, pending: 1, upcoming: 2, completed: 3 };
  return reminders.sort((a, b) => {
    if (a.status !== b.status) return order[a.status] - order[b.status];
    return a.dueDate.localeCompare(b.dueDate);
  });
}

// —————————————————————————————————————————————————————————————
// Aggregations for the Reminders dashboard + Home widget
// —————————————————————————————————————————————————————————————

export type ReminderSummary = {
  todayPending: number;
  todayCompleted: number;
  thisWeekUpcoming: number;
  overdue: number;
  streak: number;     // consecutive days with all photos in
  total: number;
};

export function reminderSummary(today: Date = MOCK_TODAY): ReminderSummary {
  const list = getReminders(today);
  const todayStr = fmt(today);

  const todayItems = list.filter((r) => r.dueDate === todayStr);
  const todayPending = todayItems.filter((r) => r.status === "pending").length;
  const todayCompleted = todayItems.filter((r) => r.status === "completed").length;
  const thisWeekUpcoming = list.filter((r) => r.status === "upcoming").length;
  const overdue = list.filter((r) => r.status === "overdue").length;

  // Streak: count back from yesterday — how many consecutive days had ALL photos uploaded?
  let streak = 0;
  const days = lastNDays(14, today).slice().reverse();
  // Skip today (might still be incomplete) — start from yesterday
  for (let i = 1; i < days.length; i++) {
    const day = days[i];
    const allUploaded = sitePhotoLogs.every((log) => log.photos[day]?.uploaded);
    if (allUploaded) streak += 1;
    else break;
  }

  return { todayPending, todayCompleted, thisWeekUpcoming, overdue, streak, total: list.length };
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
