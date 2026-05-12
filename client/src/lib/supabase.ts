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

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local (dev) and in Vercel (prod).",
  );
}

export const supabase = createClient(url, anonKey, {
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
