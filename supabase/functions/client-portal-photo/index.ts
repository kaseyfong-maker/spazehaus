/*
 * SPAZEHAUS — Client portal: signed-photo URL minter
 *
 * The /portal/:token page is public (no Supabase auth header). But the
 * site-photos bucket is private — only OPS-tier authenticated staff can
 * call createSignedUrl(). This Edge Function bridges the two: it validates
 * a (token, storage_path) pair against the projects table, then uses the
 * service role key to mint a short-lived signed URL the browser can drop
 * straight into an <img src="...">.
 *
 * Endpoint: POST /functions/v1/client-portal-photo
 * Body:    { "token": "<uuid>", "storagePath": "PRJ001/2026-05-13/abc.jpg" }
 * 200:     { "url": "https://...?token=..." }
 * 401:     { "error": "Invalid token" }
 * 404:     { "error": "Photo not found for this project" }
 *
 * No Authorization header required — auth IS the (token + path) pair.
 */
// @ts-expect-error — esm.sh URL not resolvable by the local TS check;
// Deno runtime resolves it at deploy time.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

declare const Deno: { env: { get(key: string): string | undefined } };

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a page session

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Permissive CORS — this endpoint is called from the portal page which
  // can be opened on any device / browser.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      { error: "Server misconfigured" },
      500,
      corsHeaders,
    );
  }

  let body: { token?: string; storagePath?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const token = (body.token ?? "").trim();
  const storagePath = (body.storagePath ?? "").trim();
  if (!token || !storagePath) {
    return json(
      { error: "Both `token` and `storagePath` are required" },
      400,
      corsHeaders,
    );
  }

  // UUID sanity check — failing fast here avoids a bad query against a
  // text-not-uuid input.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return json({ error: "Invalid token format" }, 401, corsHeaders);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Resolve token → project_id (one row, fast — `client_access_token`
  //    has a unique index).
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id")
    .eq("client_access_token", token)
    .maybeSingle();
  if (projectErr) {
    return json({ error: projectErr.message }, 500, corsHeaders);
  }
  if (!project) {
    return json({ error: "Invalid token" }, 401, corsHeaders);
  }

  // 2. Verify the storagePath belongs to a photo on this project. We
  //    cross-check rather than just trusting the storagePath prefix:
  //    site_photos.project_id is the authoritative link.
  const { data: photo, error: photoErr } = await supabase
    .from("site_photos")
    .select("id, project_id, storage_path")
    .eq("storage_path", storagePath)
    .eq("project_id", project.id)
    .maybeSingle();
  if (photoErr) {
    return json({ error: photoErr.message }, 500, corsHeaders);
  }
  if (!photo) {
    return json(
      { error: "Photo not found for this project" },
      404,
      corsHeaders,
    );
  }

  // 3. Mint the signed URL via service role. The browser receives a fully
  //    qualified Supabase Storage URL with a `token=` query param valid
  //    for SIGNED_URL_TTL_SECONDS.
  const { data: signed, error: signErr } = await supabase
    .storage
    .from("site-photos")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    return json(
      { error: signErr?.message ?? "Failed to mint signed URL" },
      500,
      corsHeaders,
    );
  }

  return json({ url: signed.signedUrl }, 200, corsHeaders);
});

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}
