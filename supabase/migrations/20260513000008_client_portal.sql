-- ───────────────────────────────────────────────────────────────────────────
-- SPAZEHAUS — Client portal (read-only)
--
-- Adds per-project access tokens + a SECURITY DEFINER RPC that returns the
-- everything a client needs to see on /portal/:token without any login flow.
--
-- Access model:
--   • Every project gets a unique UUID `client_access_token`.
--   • Anyone with the URL `/portal/<token>` can view that project's
--     progress, payments, signatures, and recent photos.
--   • Staff share the link manually (WhatsApp / email) — there's no
--     directory or enumeration endpoint.
--   • Tokens are unguessable (UUID4, 122 bits of entropy).
--   • If a link leaks, regenerate the token (planned UI: ProjectDetail →
--     "Regenerate portal link"). Until then, run:
--        UPDATE projects SET client_access_token = gen_random_uuid()
--          WHERE id = 'PRJ001';
--
-- ───────────────────────────────────────────────────────────────────────────

-- Make sure pgcrypto is available for gen_random_uuid().
create extension if not exists pgcrypto;

-- ── projects.client_access_token ─────────────────────────────────────────
alter table public.projects
  add column if not exists client_access_token uuid;

-- Backfill any pre-existing rows with a fresh token.
update public.projects
   set client_access_token = gen_random_uuid()
 where client_access_token is null;

-- Now enforce NOT NULL + default + uniqueness.
alter table public.projects
  alter column client_access_token set not null,
  alter column client_access_token set default gen_random_uuid();

-- A regular b-tree unique index — small table, lookup is by exact token.
create unique index if not exists idx_projects_client_access_token
  on public.projects (client_access_token);

comment on column public.projects.client_access_token is
  'Unguessable token used by /portal/:token to grant read-only access without login. Regenerate to revoke a leaked link.';

-- ── RPC: get_client_portal_data(token uuid) → jsonb ──────────────────────
-- SECURITY DEFINER so it bypasses RLS for the joined reads. Returns the
-- entire payload the portal needs in one call:
--   { project, lifecycle: { current, all_stages }, payments, signatures,
--     recent_photos }
-- Returns NULL when token is invalid → the portal shows a clean 404.
create or replace function public.get_client_portal_data(p_token uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_project       projects%rowtype;
  v_designer_name text;
  v_pm_name       text;
  v_current_stage jsonb;
  v_all_stages    jsonb;
  v_payments      jsonb;
  v_signatures    jsonb;
  v_recent_photos jsonb;
begin
  -- 1. Lookup the project by token.
  select * into v_project
    from projects
   where client_access_token = p_token;

  if not found then
    return null;
  end if;

  -- 2. Designer / PM names (no internal ids, no role chips — just names).
  select name into v_designer_name from staff where id = v_project.designer_id;
  select name into v_pm_name       from staff where id = v_project.pm_id;

  -- 3. Lifecycle: current stage + all 29 stages so the portal can render
  --    the full timeline with completed / current / upcoming highlighting.
  select to_jsonb(ls.*) into v_current_stage
    from lifecycle_stages ls
   where ls.id = v_project.current_stage_id;

  -- Cast order_index to int so the JSON-text sort orders 2 before 10.
  -- (Without the cast, jsonb_agg sorts as strings and "10" comes before "2".)
  select coalesce(jsonb_agg(s order by (s->>'order_index')::int), '[]'::jsonb)
    into v_all_stages
    from (
      select to_jsonb(ls.*) as s
        from lifecycle_stages ls
       order by ls.order_index
    ) sub;

  -- 4. Payments — client sees what they owe + what's been collected.
  select coalesce(jsonb_agg(to_jsonb(p) order by p.gate, p.instalment), '[]'::jsonb)
    into v_payments
    from payment_records p
   where p.project_id = v_project.id;

  -- 5. Signatures — pending vs signed, with dates if signed.
  --    Drop internal `document_ref` (Storage path is for the staff app) —
  --    clients don't need direct file access here.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           s.id,
           'signature_key', s.signature_key,
           'label',        s.label,
           'group_name',   s.group_name,
           'status',       s.status,
           'signed_date',  s.signed_date,
           'signed_by',    s.signed_by,
           'notes',        s.notes
         ) order by s.id), '[]'::jsonb)
    into v_signatures
    from signature_records s
   where s.project_id = v_project.id;

  -- 6. Recent photos — last 14 days, newest first. Storage path is exposed
  --    here purely as a lookup key for the client-portal-photo Edge Function
  --    (which validates the token before minting signed URLs).
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',           ph.id,
           'photo_date',   ph.photo_date,
           'storage_path', ph.storage_path,
           'uploaded_at',  ph.uploaded_at,
           'notes',        ph.notes
         ) order by ph.uploaded_at desc), '[]'::jsonb)
    into v_recent_photos
    from site_photos ph
   where ph.project_id = v_project.id
     and ph.photo_date >= current_date - interval '14 days';

  -- 7. Compose the response. Selectively project public fields — drop
  --    internals like client_access_token (already in URL) and audit ids.
  return jsonb_build_object(
    'project', jsonb_build_object(
      'id',            v_project.id,
      'name',          v_project.name,
      'client_name',   v_project.client_name,
      'client_contact', v_project.client_contact,
      'client_email',  v_project.client_email,
      -- Source column is `project_type` (the staff app's `Project.type` is
      -- the camelCase alias). Output key stays `type` to match what
      -- ClientPortalProject expects on the client side.
      'type',          v_project.project_type,
      'property_type', v_project.property_type,
      'location',      v_project.location,
      'size_sqft',     v_project.size_sqft,
      'budget',        v_project.budget,
      'start_date',    v_project.start_date,
      'target_date',   v_project.target_date,
      'status',        v_project.status,
      'progress',      v_project.progress,
      'description',   v_project.description,
      'designer_name', coalesce(v_designer_name, '—'),
      'pm_name',       coalesce(v_pm_name, '—')
    ),
    'lifecycle', jsonb_build_object(
      'current',    v_current_stage,
      'all_stages', v_all_stages
    ),
    'payments',     v_payments,
    'signatures',   v_signatures,
    'recent_photos', v_recent_photos
  );
end;
$$;

comment on function public.get_client_portal_data(uuid) is
  'Returns everything /portal/:token needs to render in one call. SECURITY DEFINER so the public anon role can call it without RLS rights on the underlying tables. Returns NULL when token is invalid.';

-- ── Grants — anon + authenticated can both call ──────────────────────────
-- The portal page is public (no auth header). `anon` is the default role
-- PostgREST uses for unauthenticated requests. We also grant authenticated
-- (staff using their own session) since staff might preview their clients'
-- portals from within the app.
grant execute on function public.get_client_portal_data(uuid) to anon;
grant execute on function public.get_client_portal_data(uuid) to authenticated;
