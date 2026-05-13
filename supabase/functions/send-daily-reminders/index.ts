/*
 * SPAZEHAUS — Daily WhatsApp reminder dispatcher (Supabase Edge Function)
 *
 * Designed to be invoked once per day (typically 5pm SGT = 09:00 UTC) via:
 *   • Supabase Dashboard → Database → Cron Jobs → schedule POST to this URL
 *   • OR pg_cron + pg_net (see supabase/functions/send-daily-reminders/README.md)
 *   • OR external scheduler (curl + Authorization header)
 *
 * Auth: every request MUST present `Authorization: Bearer <SERVICE_ROLE_KEY>`.
 * The function uses that key to build a Supabase client that bypasses RLS
 * (we need to query every active project + every site supervisor regardless
 * of who called us).
 *
 * Idempotent: the same call repeated within the same UTC day is safe — the
 * dedup query in `findDispatchTargets()` filters out staff/project pairs
 * already pinged today (regardless of provider outcome).
 *
 * Provider selection: see ./providers.ts → resolveProvider(). Defaults to
 * StubProvider (console.log only). To go live, set WHATSAPP_PROVIDER and the
 * provider-specific env vars in Supabase → Edge Functions → Secrets.
 */

// @ts-expect-error — Deno runtime. TypeScript can't resolve esm.sh URLs at
// the local checker, but Supabase's Deno deployer can.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";
import { resolveProvider } from "./providers.ts";
import type {
  DispatchSummary,
  ReminderAttempt,
  ReminderTarget,
} from "./types.ts";

// Deno's global `Deno` is referenced for env access — declare it for the
// local TS check (the real type ships with the Deno runtime).
declare const Deno: { env: { get(key: string): string | undefined } };

// ─── HTTP entry point ─────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  const startedAt = Date.now();
  const scheduledAtIso = new Date().toISOString();

  // 1. Authenticate. We accept the service role key (for cron-style calls)
  //    OR a custom shared secret if WHATSAPP_DISPATCH_SECRET is set.
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const dispatchSecret = Deno.env.get("WHATSAPP_DISPATCH_SECRET");
  const validBearers = [serviceRoleKey, dispatchSecret].filter(Boolean) as string[];
  if (!bearer || !validBearers.includes(bearer)) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { ok: false, error: "Server misconfigured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing" },
      500,
    );
  }
  // Service-role client bypasses RLS — we need to see every project and every
  // staff member regardless of who triggered the function.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const provider = resolveProvider(Deno.env);

  // 2. Find every (supervisor × project-missing-photo-today) pair.
  const targets = await findDispatchTargets(supabase);

  // 3. Dispatch + log.
  const counts = {
    sent: 0,
    failed: 0,
    skipped_no_phone: 0,
    skipped_opt_out: 0,
    skipped_already_pinged: 0,
    skipped_no_supervisor: 0,
  };
  const attempts: ReminderAttempt[] = [];

  for (const t of targets.toSend) {
    const result = await provider.sendDailySitePhotoReminder(t);
    const attempt: ReminderAttempt = {
      staffId: t.staffId,
      projectId: t.projectId,
      reminderType: "daily_site_photo",
      phone: t.phone,
      provider: provider.name,
      providerMessageId: result.providerMessageId ?? null,
      templateName: result.templateName ?? null,
      templateVariables: result.templateVariables ?? null,
      status: result.status,
      errorMessage: result.errorMessage ?? null,
    };
    attempts.push(attempt);
    if (result.status === "sent") counts.sent += 1;
    else counts.failed += 1;
  }

  counts.skipped_no_phone = targets.skippedNoPhone.length;
  counts.skipped_opt_out = targets.skippedOptOut.length;
  counts.skipped_already_pinged = targets.skippedAlreadyPinged.length;
  counts.skipped_no_supervisor = targets.skippedNoSupervisor.length;

  for (const s of [
    ...targets.skippedNoPhone,
    ...targets.skippedOptOut,
    ...targets.skippedAlreadyPinged,
  ]) {
    attempts.push({
      staffId: s.staffId,
      projectId: s.projectId,
      reminderType: "daily_site_photo",
      phone: s.phone ?? "",
      provider: provider.name,
      providerMessageId: null,
      templateName: null,
      templateVariables: null,
      status: "skipped",
      errorMessage: s.reason,
    });
  }

  // 4. Persist the log (one batch insert for the audit trail).
  if (attempts.length > 0) {
    const { error } = await supabase.from("whatsapp_log").insert(
      attempts.map((a) => ({
        staff_id: a.staffId,
        project_id: a.projectId,
        reminder_type: a.reminderType,
        phone: a.phone,
        provider: a.provider,
        provider_message_id: a.providerMessageId,
        template_name: a.templateName,
        template_variables: a.templateVariables,
        status: a.status,
        error_message: a.errorMessage,
      })),
    );
    if (error) {
      console.error("[dispatch] failed to write whatsapp_log:", error.message);
    }
  }

  const summary: DispatchSummary = {
    ok: true,
    provider: provider.name,
    scheduledAtIso,
    durationMs: Date.now() - startedAt,
    counts,
    attempts,
  };
  return json(summary, 200);
});

// ─── Dispatch query ───────────────────────────────────────────────────────
// Returns the set of (supervisor × project) pairs that need a reminder
// today, plus the explicit skip reasons for diagnostics.

type SupabaseLike = ReturnType<typeof createClient>;

interface SkippedTarget {
  staffId: string;
  projectId: string;
  phone: string | null;
  reason: string;
}

interface DispatchTargets {
  toSend: ReminderTarget[];
  skippedNoPhone: SkippedTarget[];
  skippedOptOut: SkippedTarget[];
  skippedAlreadyPinged: SkippedTarget[];
  skippedNoSupervisor: SkippedTarget[];
}

async function findDispatchTargets(
  supabase: SupabaseLike,
): Promise<DispatchTargets> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const todayDmy = formatDDMMYYYY(today);

  // --- Active build-phase projects whose site-photo for today is missing ---
  const { data: missingProjects, error: projErr } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      status,
      current_stage_id,
      lifecycle_stages!projects_current_stage_id_fkey(phase)
    `)
    .in("status", ["active", "under-review", "assigned"]);
  if (projErr) throw projErr;

  const projectRows = (missingProjects ?? []) as Array<{
    id: string;
    name: string;
    status: string;
    current_stage_id: string | null;
    lifecycle_stages: { phase: string } | null;
  }>;
  // Filter to Build phase only — that's when daily close-door photos are required.
  const buildProjects = projectRows.filter((p) => p.lifecycle_stages?.phase === "Build");

  if (buildProjects.length === 0) {
    return emptyTargets();
  }

  // --- Which of those have already had a photo uploaded today? ---
  const projectIds = buildProjects.map((p) => p.id);
  const { data: photosToday, error: photoErr } = await supabase
    .from("site_photos")
    .select("project_id")
    .in("project_id", projectIds)
    .eq("photo_date", todayIso);
  if (photoErr) throw photoErr;

  const projectsWithPhotoToday = new Set(
    (photosToday ?? []).map((r: { project_id: string }) => r.project_id),
  );
  const projectsMissingPhoto = buildProjects.filter(
    (p) => !projectsWithPhotoToday.has(p.id),
  );

  if (projectsMissingPhoto.length === 0) {
    return emptyTargets();
  }

  // --- The supervisors who should be pinged ---
  const { data: supervisors, error: supErr } = await supabase
    .from("staff")
    .select("id, name, avatar_code, phone, whatsapp_opt_in, status")
    .eq("role", "site_supervisor");
  if (supErr) throw supErr;

  const allSupervisors = (supervisors ?? []) as Array<{
    id: string;
    name: string;
    avatar_code: string;
    phone: string | null;
    whatsapp_opt_in: boolean;
    status: string;
  }>;
  const activeSupervisors = allSupervisors.filter((s) => s.status === "active");

  if (activeSupervisors.length === 0) {
    return {
      ...emptyTargets(),
      skippedNoSupervisor: projectsMissingPhoto.map((p) => ({
        staffId: "",
        projectId: p.id,
        phone: null,
        reason: "no active site_supervisor staff configured",
      })),
    };
  }

  // --- Dedup: which (staff, project) pairs were already pinged today? ---
  const supervisorIds = activeSupervisors.map((s) => s.id);
  const { data: alreadyPinged, error: dedupErr } = await supabase
    .from("whatsapp_log")
    .select("staff_id, project_id")
    .in("staff_id", supervisorIds)
    .in("project_id", projectsMissingPhoto.map((p) => p.id))
    .eq("reminder_type", "daily_site_photo")
    .gte("sent_at", `${todayIso}T00:00:00Z`)
    .lt("sent_at", `${todayIso}T23:59:59Z`);
  if (dedupErr) throw dedupErr;

  const pingedKeys = new Set(
    (alreadyPinged ?? []).map(
      (r: { staff_id: string; project_id: string }) =>
        `${r.staff_id}|${r.project_id}`,
    ),
  );

  // --- Now cross-product and classify each pair ---
  const toSend: ReminderTarget[] = [];
  const skippedNoPhone: SkippedTarget[] = [];
  const skippedOptOut: SkippedTarget[] = [];
  const skippedAlreadyPinged: SkippedTarget[] = [];

  for (const sup of activeSupervisors) {
    for (const proj of projectsMissingPhoto) {
      const key = `${sup.id}|${proj.id}`;
      if (pingedKeys.has(key)) {
        skippedAlreadyPinged.push({
          staffId: sup.id,
          projectId: proj.id,
          phone: sup.phone,
          reason: "already pinged today",
        });
        continue;
      }
      if (!sup.whatsapp_opt_in) {
        skippedOptOut.push({
          staffId: sup.id,
          projectId: proj.id,
          phone: sup.phone,
          reason: "staff opted out of WhatsApp reminders",
        });
        continue;
      }
      if (!sup.phone) {
        skippedNoPhone.push({
          staffId: sup.id,
          projectId: proj.id,
          phone: null,
          reason: "staff has no phone number configured",
        });
        continue;
      }
      toSend.push({
        staffId: sup.id,
        staffName: sup.name,
        staffAvatar: sup.avatar_code,
        phone: sup.phone,
        projectId: proj.id,
        projectName: proj.name,
        photoDateIso: todayDmy,
      });
    }
  }

  return {
    toSend,
    skippedNoPhone,
    skippedOptOut,
    skippedAlreadyPinged,
    skippedNoSupervisor: [],
  };
}

function emptyTargets(): DispatchTargets {
  return {
    toSend: [],
    skippedNoPhone: [],
    skippedOptOut: [],
    skippedAlreadyPinged: [],
    skippedNoSupervisor: [],
  };
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
