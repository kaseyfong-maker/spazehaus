/*
 * SPAZEHAUS — Sentry integration
 *
 * Captures uncaught exceptions, unhandled promise rejections, and any errors
 * surfaced through the React ErrorBoundary. No performance traces or session
 * replay yet — those add bundle weight and aren't worth it until we have a
 * paid Sentry plan with quota.
 *
 * Configured via Vite env vars (set in .env.local for dev, Vercel for prod):
 *
 *   VITE_SENTRY_DSN          — required; missing/empty means Sentry is OFF
 *   VITE_SENTRY_ENVIRONMENT  — optional; defaults to "production" / "development"
 *                              based on the Vite mode
 *   VITE_SENTRY_RELEASE      — optional; tagged on every event for source-map
 *                              correlation. We default to import.meta.env.MODE
 *                              plus a short build hash if available.
 *
 * If the DSN is unset, every Sentry call below short-circuits to a no-op so
 * local dev and CI builds work without a DSN configured.
 */
import * as Sentry from "@sentry/react";
import type { StaffRow } from "@/lib/dbTypes";

let _initialized = false;

/** Initialise Sentry. Safe to call multiple times — only the first call binds. */
export function initSentry(): void {
  if (_initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    // Silent no-op in dev / CI when the DSN isn't configured. Console-log
    // once so it's discoverable, but don't spam.
    if (import.meta.env.DEV) {
      console.info("[sentry] VITE_SENTRY_DSN not set — error tracking disabled.");
    }
    return;
  }

  const environment =
    import.meta.env.VITE_SENTRY_ENVIRONMENT ??
    (import.meta.env.PROD ? "production" : "development");

  const release =
    import.meta.env.VITE_SENTRY_RELEASE ??
    `spazehaus@${import.meta.env.MODE}`;

  Sentry.init({
    dsn,
    environment,
    release,
    // Error capture only — no traces, no replay. Add them later if we move to
    // a paid plan.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Filter common dev / Supabase noise that isn't actionable
    beforeSend(event, hint) {
      const err = hint?.originalException;
      // Network blips from Supabase realtime / token refresh — not interesting
      if (err instanceof Error) {
        if (/Load failed|NetworkError when attempting/.test(err.message)) {
          return null;
        }
      }
      return event;
    },
    // Default integrations include global handlers (window.onerror,
    // unhandledrejection) and breadcrumbs for fetch, console, history, etc.
    integrations: [
      Sentry.browserTracingIntegration({ enableInp: false }),
    ],
  });

  _initialized = true;
}

/** Tag the current Sentry user from a Supabase auth user + linked staff row. */
export function setSentryUser(
  authUserId: string | null | undefined,
  email: string | null | undefined,
  staff: StaffRow | null | undefined,
): void {
  if (!_initialized) return;
  if (!authUserId) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: authUserId,
    email: email ?? undefined,
    // staff-specific tags
    staff_id: staff?.id,
    staff_role: staff?.role,
    staff_name: staff?.name,
  });
}

/** Clear the Sentry user (call on sign-out). */
export function clearSentryUser(): void {
  if (!_initialized) return;
  Sentry.setUser(null);
}

/**
 * Manually capture an exception. Most errors get caught by the global handlers
 * and the ErrorBoundary, but we expose this for catch-blocks that want
 * structured context.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!_initialized) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}

/** Re-export the underlying Sentry namespace for components that need React-specific helpers. */
export { Sentry };
