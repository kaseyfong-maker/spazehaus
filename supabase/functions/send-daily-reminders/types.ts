/*
 * SPAZEHAUS — WhatsApp reminders: shared types
 *
 * Lives next to the Edge Function (Deno runtime) — these types are NOT used
 * by the client app (which gets its types from client/src/lib/database.types.ts).
 */

/** A single dispatch target — one staff person for one project on one day. */
export interface ReminderTarget {
  staffId: string;
  staffName: string;
  staffAvatar: string;
  phone: string;
  projectId: string;
  projectName: string;
  // The dueDate the reminder is about (DD/MM/YYYY for display, ISO for keying).
  photoDateIso: string;
}

/** Whatever payload a provider wants to attach to the audit log. */
export interface ProviderResult {
  status: "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
}

/** Every WhatsApp provider implementation conforms to this interface so the
 *  dispatcher in index.ts is provider-agnostic. */
export interface WhatsAppProvider {
  /** Human-readable name for logging / audit trail ('stub', 'meta', 'twilio'). */
  readonly name: string;

  /** Send one reminder. MUST return a result — never throw past the boundary;
   *  errors become `{ status: "failed", errorMessage }`. */
  sendDailySitePhotoReminder(target: ReminderTarget): Promise<ProviderResult>;
}

/** Outcome of a single reminder attempt — what we write to whatsapp_log. */
export interface ReminderAttempt {
  staffId: string;
  projectId: string;
  reminderType: "daily_site_photo";
  phone: string;
  provider: string;
  providerMessageId: string | null;
  templateName: string | null;
  templateVariables: Record<string, unknown> | null;
  status: "sent" | "failed" | "skipped";
  errorMessage: string | null;
}

/** Aggregate response the Edge Function returns to the caller (cron / curl). */
export interface DispatchSummary {
  ok: true;
  provider: string;
  scheduledAtIso: string;
  durationMs: number;
  counts: {
    sent: number;
    failed: number;
    skipped_no_phone: number;
    skipped_opt_out: number;
    skipped_already_pinged: number;
    skipped_no_supervisor: number;
  };
  attempts: ReminderAttempt[];
}
