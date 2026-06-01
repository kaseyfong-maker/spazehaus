/*
 * SPAZEHAUS — Supabase client singleton
 *
 * Reads the project URL + anon key from Vite env vars (set in .env.local for
 * dev, and in Vercel → Project Settings → Environment Variables for prod).
 *
 * The anon key is intentionally embedded in client code. Security is enforced
 * by Row Level Security policies on the database, NOT by hiding this key.
 * Never commit the service_role key.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Trim to defend against trailing whitespace/newlines pasted into a hosting
// provider's env-var field — a common, hard-to-spot cause of bad values.
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (dev) and in Vercel (prod). " +
      "Remember: Vite bakes these in at BUILD time, so redeploy after changing them.",
  );
}

// Validate the URL ourselves so a malformed value fails with an actionable
// message naming the bad value — instead of the SDK's cryptic
// "Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL". The most common
// mistake is omitting the https:// scheme or swapping the URL with the key.
try {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("not http/https");
  }
} catch {
  throw new Error(
    `Invalid VITE_SUPABASE_URL: "${url}". It must be the full project URL including the scheme, ` +
      `e.g. https://<project-ref>.supabase.co (no quotes, no trailing spaces). ` +
      `Check Vercel → Environment Variables, then redeploy.`,
  );
}

// Generic-typed client so every `.from()` and `.rpc()` is checked against the
// hand-authored `Database` schema in client/src/lib/database.types.ts.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // Persist the session in localStorage so a page refresh keeps the user logged in
    persistSession: true,
    autoRefreshToken: true,
    // Detect the magic-link tokens from the URL fragment on /auth/callback
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

// Convenience re-exports so callers don't import from the SDK directly
export type { Session, User } from "@supabase/supabase-js";
