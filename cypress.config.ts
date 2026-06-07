import { defineConfig } from "cypress";
import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// ── Local-only test config ───────────────────────────────────────────────────
// These are LOCAL Supabase credentials (printed by `supabase status`). They are
// safe to commit only because they're the well-known local dev defaults — never
// put cloud/service keys here. baseUrl uses 127.0.0.1 so it shares a superdomain
// with the Supabase URL (auth redirects work) and dodges the localhost service
// worker. Override any of these via CYPRESS_* env vars if your ports differ.
const SUPABASE_URL = process.env.CYPRESS_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON_KEY = process.env.CYPRESS_ANON_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SERVICE_KEY = process.env.CYPRESS_SERVICE_KEY ?? "sb_secret_LOCAL_PLACEHOLDER";
const MAILPIT_URL = process.env.CYPRESS_MAILPIT_URL ?? "http://127.0.0.1:54324";
const DB_CONTAINER = process.env.CYPRESS_DB_CONTAINER ?? "supabase_db_Web";
const BASE_URL = process.env.CYPRESS_BASE_URL ?? "http://127.0.0.1:3000";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Make sure an auth user exists for this email (creates it confirmed if not),
// which also fires the link_staff_to_auth_user trigger → links the staff row.
async function ensureAuthUser(email: string) {
  const { error } = await admin().auth.admin.createUser({ email, email_confirm: true });
  // "already registered" is fine — we just need the user to exist.
  if (error && !/already|registered|exists/i.test(error.message)) throw new Error(error.message);
}

export default defineConfig({
  e2e: {
    baseUrl: BASE_URL,
    supportFile: "cypress/support/e2e.ts",
    specPattern: "cypress/e2e/**/*.cy.ts",
    chromeWebSecurity: false, // allow the cross-port auth-verify redirect
    defaultCommandTimeout: 10000,
    video: false,
    env: { SUPABASE_URL, ANON_KEY, SERVICE_KEY, MAILPIT_URL, BASE_URL },
    setupNodeEvents(on) {
      on("task", {
        // Reset the DB to the clean seed (deterministic state per spec). The seed
        // re-creates staff with auth_user_id = null, so we re-link any auth users
        // created by earlier tests (the link trigger only fires on INSERT, and
        // those auth.users rows already exist) — otherwise is_admin_tier/is_ops_tier
        // would resolve to nothing after a reset.
        "db:reset"() {
          const sql = readFileSync("supabase/seed.sql", "utf8");
          execSync(`docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres`, { input: sql, stdio: ["pipe", "ignore", "inherit"] });
          execSync(
            `docker exec ${DB_CONTAINER} psql -U postgres -d postgres -c ` +
              JSON.stringify(
                "update public.staff s set auth_user_id = u.id from auth.users u where lower(s.email)=lower(u.email) and s.auth_user_id is null;",
              ),
          );
          return null;
        },
        // Run a read query, return pipe-delimited rows as a trimmed string.
        "db:query"(sql: string) {
          return execSync(`docker exec ${DB_CONTAINER} psql -U postgres -d postgres -t -A -F'|' -c ${JSON.stringify(sql)}`).toString().trim();
        },
        // Run a write statement (no rows returned).
        "db:exec"(sql: string) {
          execSync(`docker exec ${DB_CONTAINER} psql -U postgres -d postgres -c ${JSON.stringify(sql)}`);
          return null;
        },
        // Fast login: returns a GoTrue action_link that, when visited, establishes
        // a browser session and redirects to the app callback.
        async "auth:actionLink"(email: string) {
          await ensureAuthUser(email);
          const { data, error } = await admin().auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${BASE_URL}/auth/callback` },
          });
          if (error) throw new Error(error.message);
          return data.properties?.action_link;
        },
        // Returns a real user access token for authenticated cy.request() calls.
        async "auth:token"(email: string) {
          await ensureAuthUser(email);
          const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
          if (error) throw new Error(error.message);
          const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: s, error: e2 } = await anon.auth.verifyOtp({ token_hash: data.properties!.hashed_token, type: "email" });
          if (e2) throw new Error(e2.message);
          return s.session?.access_token;
        },
        // Latest Mailpit message body (HTML) for the faithful magic-link test.
        async "mailpit:latestLink"(toEmail: string) {
          const list = await fetch(`${MAILPIT_URL}/api/v1/messages`).then((r) => r.json());
          const msg = (list.messages ?? []).find((m: any) => (m.To ?? []).some((t: any) => t.Address === toEmail));
          if (!msg) return null;
          const full = await fetch(`${MAILPIT_URL}/api/v1/message/${msg.ID}`).then((r) => r.json());
          const html: string = full.HTML ?? full.Text ?? "";
          const m = html.match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/) ?? html.match(/(https?:\/\/[^\s"']*token[^\s"']*)/);
          return m ? m[1].replace(/&amp;/g, "&") : null;
        },
        "mailpit:clear"() {
          return fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" }).then(() => null);
        },
        async "mailpit:count"(toEmail: string) {
          const list = await fetch(`${MAILPIT_URL}/api/v1/messages`).then((r) => r.json());
          return (list.messages ?? []).filter((m: any) => (m.To ?? []).some((t: any) => t.Address === toEmail)).length;
        },
      });
    },
  },
});
