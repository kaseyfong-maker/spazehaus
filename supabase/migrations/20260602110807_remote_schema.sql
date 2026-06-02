


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."calendar_event_type" AS ENUM (
    'project',
    'meeting',
    'leave',
    'event'
);


ALTER TYPE "public"."calendar_event_type" OWNER TO "postgres";


CREATE TYPE "public"."checkpoint_status" AS ENUM (
    'completed',
    'in-progress',
    'pending',
    'overdue',
    'skipped'
);


ALTER TYPE "public"."checkpoint_status" OWNER TO "postgres";


CREATE TYPE "public"."customer_category" AS ENUM (
    'Residential',
    'Commercial',
    'F&B',
    'Office',
    'Investor'
);


ALTER TYPE "public"."customer_category" OWNER TO "postgres";


CREATE TYPE "public"."customer_tier" AS ENUM (
    'VIP',
    'Repeat',
    'Referral',
    'Standard'
);


ALTER TYPE "public"."customer_tier" OWNER TO "postgres";


CREATE TYPE "public"."inquiry_stage" AS ENUM (
    'new-inquiry',
    'showroom-meet',
    'awarded',
    'rejected'
);


ALTER TYPE "public"."inquiry_stage" OWNER TO "postgres";


CREATE TYPE "public"."leave_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."leave_status" OWNER TO "postgres";


CREATE TYPE "public"."line_item_category" AS ENUM (
    'Design',
    'Material',
    'Labour',
    'Furniture',
    'Electrical',
    'Plumbing',
    'Others'
);


ALTER TYPE "public"."line_item_category" OWNER TO "postgres";


CREATE TYPE "public"."project_priority" AS ENUM (
    'high',
    'medium',
    'low'
);


ALTER TYPE "public"."project_priority" OWNER TO "postgres";


CREATE TYPE "public"."project_status" AS ENUM (
    'active',
    'assigned',
    'under-review',
    'completed',
    'on-hold'
);


ALTER TYPE "public"."project_status" OWNER TO "postgres";


CREATE TYPE "public"."quotation_status" AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'invoiced',
    'paid'
);


ALTER TYPE "public"."quotation_status" OWNER TO "postgres";


CREATE TYPE "public"."quotation_type" AS ENUM (
    'Quotation',
    'Invoice',
    'Proforma Invoice'
);


ALTER TYPE "public"."quotation_type" OWNER TO "postgres";


CREATE TYPE "public"."staff_role" AS ENUM (
    'admin',
    'principal',
    'designer',
    'sales',
    'site_supervisor',
    'pm',
    'admin_exec'
);


ALTER TYPE "public"."staff_role" OWNER TO "postgres";


CREATE TYPE "public"."staff_status" AS ENUM (
    'active',
    'on-leave',
    'on-project',
    'inactive'
);


ALTER TYPE "public"."staff_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_row_id text;
begin
  -- Pull row id flexibly (handles bigserial PKs that are int)
  if tg_op = 'DELETE' then
    v_row_id := coalesce((row_to_json(old)->>'id'), '');
  else
    v_row_id := coalesce((row_to_json(new)->>'id'), '');
  end if;

  insert into audit_log (table_name, row_id, action, changed_by, before_data, after_data)
  values (
    tg_table_name,
    v_row_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;


ALTER FUNCTION "public"."audit_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_inquiry_to_project"("p_inquiry_id" "text", "p_project_name" "text", "p_designer_name" "text", "p_pm_name" "text", "p_designer_avatar" "text", "p_pm_avatar" "text", "p_start_date" "date", "p_target_date" "date", "p_budget" numeric, "p_priority" "text", "p_areas" "text"[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_inq         inquiries%rowtype;
  v_new_id      text;
  v_max         int;
  v_today       date := current_date;
  v_design_fee  numeric;
  v_reno_total  numeric;
  v_reno_dep    numeric;
  v_progressive numeric;
  v_final       numeric;
  v_type        text;
  v_log_entry   jsonb;
begin
  -- Load + validate the inquiry
  select * into v_inq from inquiries where id = p_inquiry_id;
  if not found then
    raise exception 'Inquiry % not found', p_inquiry_id;
  end if;
  if v_inq.stage = 'awarded' then
    raise exception 'Inquiry % is already awarded', p_inquiry_id;
  end if;
  if v_inq.stage = 'rejected' then
    raise exception 'Cannot convert rejected inquiry %', p_inquiry_id;
  end if;

  -- Generate next PRJ id (PRJ001, PRJ002, …)
  select coalesce(max(substring(id from 4)::int), 0) into v_max
    from projects
   where id ~ '^PRJ\d+$';
  v_new_id := 'PRJ' || lpad((v_max + 1)::text, 3, '0');

  -- Map customer category → project type (Residential vs Commercial)
  v_type := case when v_inq.category = 'Residential' then 'Residential' else 'Commercial' end;

  -- Payment allocation
  v_design_fee  := round(p_budget * 0.07);
  v_reno_total  := greatest(0, p_budget - p_proposal_deposit - v_design_fee);
  v_reno_dep    := round(v_reno_total * 0.5);
  v_progressive := round(v_reno_total * 0.3);
  v_final       := v_reno_total - v_reno_dep - v_progressive;

  -- 1. Insert new project
  insert into projects (
    id, name, client_name, client_contact, client_email,
    project_type, property_type, location, size_sqft, budget,
    start_date, target_date, status, priority, progress,
    designer_id, pm_id, team,
    current_stage_id, lifecycle_started_at,
    photo_count, task_count, tasks_completed,
    areas, description
  )
  values (
    v_new_id, p_project_name, v_inq.client_name, v_inq.contact, v_inq.email,
    v_type, v_inq.property_type, v_inq.location, coalesce(v_inq.estimated_size, 1000), p_budget,
    p_start_date, p_target_date, 'assigned', p_priority, 0,
    null, null, coalesce(array[p_designer_avatar, p_pm_avatar], '{}'),
    'design-prop-signed', v_today,
    0, 0, 0,
    coalesce(p_areas, '{}'), format('Converted from inquiry %s on %s.', v_inq.id, to_char(v_today, 'DD/MM/YYYY'))
  );

  -- Designer/PM are stored by name in mock; resolve staff_id by avatar code for the FK
  update projects
     set designer_id = (select id from staff where avatar_code = p_designer_avatar limit 1),
         pm_id       = (select id from staff where avatar_code = p_pm_avatar       limit 1)
   where id = v_new_id;

  -- 2. Insert payment records (5 gates; gate 1 collected today)
  insert into payment_records (project_id, gate, label, amount, status, collected_date, reference) values
    (v_new_id, 1, 'Proposal Deposit',          p_proposal_deposit, 'completed', v_today, 'PD-' || to_char(v_today, 'YYYY') || '-NEW');
  insert into payment_records (project_id, gate, label, amount, status) values
    (v_new_id, 2, 'Design Contract Fee',       v_design_fee, 'pending'),
    (v_new_id, 3, 'Renovation Deposit (50%)',  v_reno_dep,    'pending'),
    (v_new_id, 4, 'Progressive Payment',       v_progressive, 'pending'),
    (v_new_id, 5, 'Final Payment',             v_final,       'pending');

  -- Notes on gate 4
  update payment_records
     set notes = 'To be split into instalments'
   where project_id = v_new_id and gate = 4;

  -- 3. Insert signature records (all 6 pending)
  insert into signature_records (project_id, signature_key, label, group_name, status) values
    (v_new_id, 'design-contract',     'Design Contract',            'contract', 'pending'),
    (v_new_id, 'revised-3d',          'Revised 3D Drawing',         'drawing',  'pending'),
    (v_new_id, 'renovation-contract', 'Renovation Contract',        'contract', 'pending'),
    (v_new_id, 'material-selection',  'Material Selection',         'drawing',  'pending'),
    (v_new_id, '2d-shopping',         '2D Drawing / Shopping List', 'drawing',  'pending'),
    (v_new_id, 'handover',            'Handover Acceptance',        'contract', 'pending');

  -- 4. Flip the inquiry to awarded + append contact log entry
  v_log_entry := jsonb_build_object(
    'date', to_char(v_today, 'DD/MM/YYYY'),
    'type', 'meet',
    'note', format('Design proposal signed · converted to project %s (RM %s)', v_new_id, to_char(p_budget, 'FM999G999G999')),
    'by', coalesce(p_assigned_to_avatar, v_inq.assigned_to_id, 'GT')
  );

  update inquiries
     set stage              = 'awarded',
         awarded_project_id = v_new_id,
         awarded_date       = v_today,
         last_updated       = v_today,
         contact_log        = contact_log || jsonb_build_array(v_log_entry)
   where id = p_inquiry_id;

  return v_new_id;
end;
$_$;


ALTER FUNCTION "public"."convert_inquiry_to_project"("p_inquiry_id" "text", "p_project_name" "text", "p_designer_name" "text", "p_pm_name" "text", "p_designer_avatar" "text", "p_pm_avatar" "text", "p_start_date" "date", "p_target_date" "date", "p_budget" numeric, "p_priority" "text", "p_areas" "text"[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_avatar"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select avatar_code from public.staff where auth_user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_staff_avatar"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select id from public.staff where auth_user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_staff_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_role"() RETURNS "public"."staff_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role from public.staff where auth_user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_staff_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_portal_data"("p_token" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_client_portal_data"("p_token" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_client_portal_data"("p_token" "uuid") IS 'Returns everything /portal/:token needs to render in one call. SECURITY DEFINER so the public anon role can call it without RLS rights on the underlying tables. Returns NULL when token is invalid.';



CREATE OR REPLACE FUNCTION "public"."guard_staff_sensitive_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- System / service-role context (no end-user JWT). This covers the
  -- auth-linking trigger that stamps auth_user_id on first sign-in, plus any
  -- admin/maintenance writes via the service role. Allow unconditionally.
  if auth.uid() is null then
    return new;
  end if;

  -- Admin tier may change anything.
  if public.is_admin_tier() then
    return new;
  end if;

  -- Everyone else (a staff member self-editing their own row) may not touch
  -- the privileged columns. `is distinct from` is null-safe.
  if new.role is distinct from old.role then
    raise exception 'Only an admin can change a staff member''s role';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only an admin can change a staff member''s status';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Only an admin can change a staff member''s email (it is the magic-link key)';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'auth_user_id is managed by the system';
  end if;
  if new.id is distinct from old.id then
    raise exception 'staff id is immutable';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_staff_sensitive_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_tier"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select role from public.staff where auth_user_id = auth.uid() limit 1)
      in ('principal','admin','admin_exec'),
    false
  );
$$;


ALTER FUNCTION "public"."is_admin_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_ops_tier"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select role from public.staff where auth_user_id = auth.uid() limit 1)
      in ('principal','admin','admin_exec','pm','site_supervisor'),
    false
  );
$$;


ALTER FUNCTION "public"."is_ops_tier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_staff_to_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.staff
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end;
$$;


ALTER FUNCTION "public"."link_staff_to_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."maybe_advance_project_stage"("p_project_id" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_stage record;
  v_satisfied boolean;
  v_next_id text;
  v_iterations int := 0;
  v_max_iter int := 35;          -- > 29 stages, with safety margin
begin
  -- Loop forward until the current stage isn't satisfied (or we hit the end)
  loop
    v_iterations := v_iterations + 1;
    if v_iterations > v_max_iter then
      exit;                       -- safety belt — should never trip
    end if;

    -- Re-read the project's current stage every iteration
    select s.*
      into v_stage
    from projects p
    join lifecycle_stages s on s.id = p.current_stage_id
    where p.id = p_project_id;

    if not found then
      return null;                -- project has no current_stage_id set
    end if;

    -- Evaluate the current stage's requirements
    v_satisfied := case
      -- Design Contract Signed (stage 9) — needs BOTH signature + payment gate 2
      when v_stage.id = 'design-contract' then
        exists (
          select 1 from payment_records
          where project_id = p_project_id and gate = 2 and status = 'completed'
        )
        and exists (
          select 1 from signature_records
          where project_id = p_project_id
            and signature_key = 'design-contract'
            and status = 'completed'
        )

      -- Progressive Payment (stage 22, gate 4) — needs EVERY instalment completed
      when v_stage.id = 'progressive-pay' then
        not exists (
          select 1 from payment_records
          where project_id = p_project_id
            and gate = 4
            and status not in ('completed','skipped')
        )
        and exists (
          select 1 from payment_records
          where project_id = p_project_id and gate = 4
        )

      -- Other payment-gated stages — just need that gate completed
      when v_stage.payment_gate is not null then
        exists (
          select 1 from payment_records
          where project_id = p_project_id
            and gate = v_stage.payment_gate
            and status = 'completed'
        )

      -- Signature-only stages — that signature must be completed
      when v_stage.signature_key is not null then
        exists (
          select 1 from signature_records
          where project_id = p_project_id
            and signature_key = v_stage.signature_key
            and status = 'completed'
        )

      -- Milestone-only stages — auto-pass when we're transiting through them
      -- (the user has no UI to manually advance, so we treat them as "complete"
      --  once a downstream checkpoint has driven us into them)
      else true
    end;

    exit when not v_satisfied;

    -- Find the next stage by order; stop if we're already at the last one
    select id
      into v_next_id
    from lifecycle_stages
    where order_index = v_stage.order_index + 1;

    exit when v_next_id is null;

    update projects
       set current_stage_id = v_next_id
     where id = p_project_id;
  end loop;

  return v_stage.id;
end;
$$;


ALTER FUNCTION "public"."maybe_advance_project_stage"("p_project_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_payment_status_advance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW.status = 'completed'
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.maybe_advance_project_stage(NEW.project_id);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tr_payment_status_advance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tr_signature_status_advance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if NEW.status = 'completed'
     and (TG_OP = 'INSERT' or OLD.status is distinct from NEW.status) then
    perform public.maybe_advance_project_stage(NEW.project_id);
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION "public"."tr_signature_status_advance"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" DEFAULT 'low'::"text" NOT NULL,
    "author_id" "text",
    "published_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "table_name" "text" NOT NULL,
    "row_id" "text" NOT NULL,
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    CONSTRAINT "audit_log_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";



CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "text" NOT NULL,
    "title" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "event_type" "public"."calendar_event_type" NOT NULL,
    "color" "text" NOT NULL,
    "project_id" "text",
    "leave_id" "text",
    "staff_id" "text",
    "notes" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "applied_for_role" "text" NOT NULL,
    "source" "text" NOT NULL,
    "stage" "text" NOT NULL,
    "applied_date" "date" NOT NULL,
    "experience" "text",
    "portfolio_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inquiries" (
    "id" "text" NOT NULL,
    "inquiry_date" "date" NOT NULL,
    "client_name" "text" NOT NULL,
    "contact" "text",
    "email" "text",
    "category" "public"."customer_category" NOT NULL,
    "tier" "public"."customer_tier" DEFAULT 'Standard'::"public"."customer_tier" NOT NULL,
    "source" "text" NOT NULL,
    "property_type" "text" NOT NULL,
    "location" "text" NOT NULL,
    "estimated_size" integer,
    "estimated_budget" numeric(12,2),
    "stage" "public"."inquiry_stage" DEFAULT 'new-inquiry'::"public"."inquiry_stage" NOT NULL,
    "assigned_to_id" "text",
    "notes" "text",
    "awarded_project_id" "text",
    "awarded_date" "date",
    "rejected_date" "date",
    "rejection_reason" "text",
    "contact_log" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "last_updated" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kpi_records" (
    "id" bigint NOT NULL,
    "staff_id" "text" NOT NULL,
    "year" integer NOT NULL,
    "month" integer NOT NULL,
    "part_a_score" integer NOT NULL,
    "part_b_score" integer NOT NULL,
    "part_c_score" integer NOT NULL,
    "total_score" integer GENERATED ALWAYS AS ((("part_a_score" + "part_b_score") + "part_c_score")) STORED,
    "rating" "text" NOT NULL,
    "reviewer_id" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kpi_records_month_check" CHECK ((("month" >= 1) AND ("month" <= 12))),
    CONSTRAINT "kpi_records_part_a_score_check" CHECK ((("part_a_score" >= 0) AND ("part_a_score" <= 30))),
    CONSTRAINT "kpi_records_part_b_score_check" CHECK ((("part_b_score" >= 0) AND ("part_b_score" <= 50))),
    CONSTRAINT "kpi_records_part_c_score_check" CHECK ((("part_c_score" >= 0) AND ("part_c_score" <= 20))),
    CONSTRAINT "kpi_records_rating_check" CHECK (("rating" = ANY (ARRAY['A'::"text", 'B'::"text", 'C'::"text"]))),
    CONSTRAINT "kpi_records_year_check" CHECK ((("year" >= 2020) AND ("year" <= 2099)))
);


ALTER TABLE "public"."kpi_records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."kpi_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."kpi_records_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."kpi_records_id_seq" OWNED BY "public"."kpi_records"."id";



CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "text" NOT NULL,
    "staff_id" "text" NOT NULL,
    "leave_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "days" integer NOT NULL,
    "reason" "text",
    "status" "public"."leave_status" DEFAULT 'pending'::"public"."leave_status" NOT NULL,
    "applied_date" "date" NOT NULL,
    "approved_by_id" "text",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lifecycle_stages" (
    "id" "text" NOT NULL,
    "order_index" integer NOT NULL,
    "label" "text" NOT NULL,
    "phase" "text" NOT NULL,
    "stage_type" "text" NOT NULL,
    "payment_gate" smallint,
    "signature_key" "text",
    CONSTRAINT "lifecycle_stages_order_index_check" CHECK ((("order_index" >= 1) AND ("order_index" <= 99))),
    CONSTRAINT "lifecycle_stages_payment_gate_check" CHECK ((("payment_gate" >= 1) AND ("payment_gate" <= 5))),
    CONSTRAINT "lifecycle_stages_phase_check" CHECK (("phase" = ANY (ARRAY['Inquiry'::"text", 'Design'::"text", 'Pre-Build'::"text", 'Build'::"text", 'Closeout'::"text"]))),
    CONSTRAINT "lifecycle_stages_stage_type_check" CHECK (("stage_type" = ANY (ARRAY['milestone'::"text", 'payment'::"text", 'contract-sign'::"text", 'drawing-sign'::"text", 'loop'::"text"])))
);


ALTER TABLE "public"."lifecycle_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_records" (
    "id" bigint NOT NULL,
    "project_id" "text" NOT NULL,
    "gate" smallint NOT NULL,
    "label" "text" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "status" "public"."checkpoint_status" DEFAULT 'pending'::"public"."checkpoint_status" NOT NULL,
    "due_date" "date",
    "collected_date" "date",
    "reference" "text",
    "instalment" smallint,
    "of_instalments" smallint,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_records_gate_check" CHECK ((("gate" >= 1) AND ("gate" <= 5)))
);


ALTER TABLE "public"."payment_records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payment_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payment_records_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payment_records_id_seq" OWNED BY "public"."payment_records"."id";



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_name" "text" NOT NULL,
    "client_contact" "text",
    "client_email" "text",
    "client_address" "text",
    "project_type" "text" NOT NULL,
    "property_type" "text" NOT NULL,
    "location" "text" NOT NULL,
    "size_sqft" integer NOT NULL,
    "budget" numeric(12,2) NOT NULL,
    "start_date" "date",
    "target_date" "date",
    "status" "public"."project_status" DEFAULT 'assigned'::"public"."project_status" NOT NULL,
    "priority" "public"."project_priority" DEFAULT 'medium'::"public"."project_priority" NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "designer_id" "text",
    "pm_id" "text",
    "team" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "current_stage_id" "text",
    "lifecycle_started_at" "date",
    "photo_count" integer DEFAULT 0 NOT NULL,
    "task_count" integer DEFAULT 0 NOT NULL,
    "tasks_completed" integer DEFAULT 0 NOT NULL,
    "areas" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "description" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_access_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    CONSTRAINT "projects_progress_check" CHECK ((("progress" >= 0) AND ("progress" <= 100)))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON COLUMN "public"."projects"."client_access_token" IS 'Unguessable token used by /portal/:token to grant read-only access without login. Regenerate to revoke a leaked link.';



CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" "text" NOT NULL,
    "quotation_id" "text" NOT NULL,
    "area" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "public"."line_item_category" NOT NULL,
    "qty" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "unit_price" numeric(12,2) NOT NULL,
    "discount" numeric(5,2) DEFAULT 0 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" "text" NOT NULL,
    "project_id" "text",
    "doc_type" "public"."quotation_type" DEFAULT 'Quotation'::"public"."quotation_type" NOT NULL,
    "status" "public"."quotation_status" DEFAULT 'draft'::"public"."quotation_status" NOT NULL,
    "client_name" "text" NOT NULL,
    "client_contact" "text",
    "client_email" "text",
    "client_address" "text",
    "issue_date" "date" NOT NULL,
    "valid_until" "date",
    "due_date" "date",
    "tax_rate" numeric(5,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "terms" "text",
    "revision" integer DEFAULT 1 NOT NULL,
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_targets" (
    "staff_id" "text" NOT NULL,
    "monthly_target" numeric(12,2) NOT NULL,
    "ytd_target" numeric(12,2) NOT NULL,
    "gp_target_pct" numeric(5,2) NOT NULL,
    "effective_from" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sales_targets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."signature_records" (
    "id" bigint NOT NULL,
    "project_id" "text" NOT NULL,
    "signature_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "group_name" "text" NOT NULL,
    "status" "public"."checkpoint_status" DEFAULT 'pending'::"public"."checkpoint_status" NOT NULL,
    "signed_date" "date",
    "signed_by" "text",
    "document_ref" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "signature_records_group_name_check" CHECK (("group_name" = ANY (ARRAY['contract'::"text", 'drawing'::"text"])))
);


ALTER TABLE "public"."signature_records" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."signature_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."signature_records_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."signature_records_id_seq" OWNED BY "public"."signature_records"."id";



CREATE TABLE IF NOT EXISTS "public"."site_photos" (
    "id" bigint NOT NULL,
    "project_id" "text" NOT NULL,
    "photo_date" "date" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by_id" "text",
    "storage_path" "text",
    "notes" "text",
    "lat" numeric(9,6),
    "lng" numeric(9,6)
);


ALTER TABLE "public"."site_photos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."site_photos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."site_photos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."site_photos_id_seq" OWNED BY "public"."site_photos"."id";



CREATE TABLE IF NOT EXISTS "public"."staff" (
    "id" "text" NOT NULL,
    "auth_user_id" "uuid",
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "public"."staff_role" NOT NULL,
    "job_title" "text" NOT NULL,
    "dept" "text" NOT NULL,
    "avatar_code" "text" NOT NULL,
    "status" "public"."staff_status" DEFAULT 'active'::"public"."staff_status" NOT NULL,
    "join_date" "date" NOT NULL,
    "leave_balance_annual" integer DEFAULT 0 NOT NULL,
    "leave_balance_medical" integer DEFAULT 0 NOT NULL,
    "kpi_grade" "text",
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "whatsapp_opt_in" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."staff" OWNER TO "postgres";


COMMENT ON COLUMN "public"."staff"."whatsapp_opt_in" IS 'When false, send-daily-reminders skips this staff member even if their phone is set.';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_log" (
    "id" bigint NOT NULL,
    "staff_id" "text" NOT NULL,
    "project_id" "text",
    "reminder_type" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "provider_message_id" "text",
    "template_name" "text",
    "template_variables" "jsonb",
    "status" "text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "whatsapp_log_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."whatsapp_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_log" IS 'Audit log of every WhatsApp reminder attempt. Used for dedup + diagnostics.';



CREATE SEQUENCE IF NOT EXISTS "public"."whatsapp_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."whatsapp_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."whatsapp_log_id_seq" OWNED BY "public"."whatsapp_log"."id";



ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."kpi_records" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."kpi_records_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payment_records" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payment_records_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."signature_records" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."signature_records_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."site_photos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."site_photos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."whatsapp_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."whatsapp_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kpi_records"
    ADD CONSTRAINT "kpi_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kpi_records"
    ADD CONSTRAINT "kpi_records_staff_id_year_month_key" UNIQUE ("staff_id", "year", "month");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lifecycle_stages"
    ADD CONSTRAINT "lifecycle_stages_order_index_key" UNIQUE ("order_index");



ALTER TABLE ONLY "public"."lifecycle_stages"
    ADD CONSTRAINT "lifecycle_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_targets"
    ADD CONSTRAINT "sales_targets_pkey" PRIMARY KEY ("staff_id");



ALTER TABLE ONLY "public"."signature_records"
    ADD CONSTRAINT "signature_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signature_records"
    ADD CONSTRAINT "signature_records_project_id_signature_key_key" UNIQUE ("project_id", "signature_key");



ALTER TABLE ONLY "public"."site_photos"
    ADD CONSTRAINT "site_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_photos"
    ADD CONSTRAINT "site_photos_project_id_photo_date_key" UNIQUE ("project_id", "photo_date");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_log"
    ADD CONSTRAINT "whatsapp_log_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_log_changed_at" ON "public"."audit_log" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_audit_log_table_row" ON "public"."audit_log" USING "btree" ("table_name", "row_id");



CREATE INDEX "idx_calendar_events_date" ON "public"."calendar_events" USING "btree" ("event_date");



CREATE INDEX "idx_calendar_events_project" ON "public"."calendar_events" USING "btree" ("project_id");



CREATE INDEX "idx_calendar_events_staff" ON "public"."calendar_events" USING "btree" ("staff_id");



CREATE INDEX "idx_inquiries_assigned" ON "public"."inquiries" USING "btree" ("assigned_to_id");



CREATE INDEX "idx_inquiries_awarded_proj" ON "public"."inquiries" USING "btree" ("awarded_project_id");



CREATE INDEX "idx_inquiries_stage" ON "public"."inquiries" USING "btree" ("stage");



CREATE INDEX "idx_kpi_records_staff_year" ON "public"."kpi_records" USING "btree" ("staff_id", "year");



CREATE INDEX "idx_leave_requests_staff" ON "public"."leave_requests" USING "btree" ("staff_id");



CREATE INDEX "idx_leave_requests_status" ON "public"."leave_requests" USING "btree" ("status");



CREATE INDEX "idx_payments_due_date" ON "public"."payment_records" USING "btree" ("due_date");



CREATE INDEX "idx_payments_project" ON "public"."payment_records" USING "btree" ("project_id");



CREATE INDEX "idx_payments_status" ON "public"."payment_records" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_projects_client_access_token" ON "public"."projects" USING "btree" ("client_access_token");



CREATE INDEX "idx_projects_designer" ON "public"."projects" USING "btree" ("designer_id");



CREATE INDEX "idx_projects_pm" ON "public"."projects" USING "btree" ("pm_id");



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("status");



CREATE INDEX "idx_quotation_items_quote" ON "public"."quotation_items" USING "btree" ("quotation_id");



CREATE INDEX "idx_quotations_project" ON "public"."quotations" USING "btree" ("project_id");



CREATE INDEX "idx_quotations_status" ON "public"."quotations" USING "btree" ("status");



CREATE INDEX "idx_signatures_project" ON "public"."signature_records" USING "btree" ("project_id");



CREATE INDEX "idx_signatures_status" ON "public"."signature_records" USING "btree" ("status");



CREATE INDEX "idx_site_photos_project_dt" ON "public"."site_photos" USING "btree" ("project_id", "photo_date");



CREATE INDEX "idx_staff_avatar" ON "public"."staff" USING "btree" ("avatar_code");



CREATE INDEX "idx_whatsapp_log_dedup" ON "public"."whatsapp_log" USING "btree" ("staff_id", "project_id", "reminder_type", ((("sent_at" AT TIME ZONE 'UTC'::"text"))::"date"));



CREATE INDEX "idx_whatsapp_log_status" ON "public"."whatsapp_log" USING "btree" ("status", "sent_at" DESC);



CREATE OR REPLACE TRIGGER "trg_audit_calendar_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_inquiries" AFTER INSERT OR DELETE OR UPDATE ON "public"."inquiries" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_kpi_records" AFTER INSERT OR DELETE OR UPDATE ON "public"."kpi_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_leave_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_payments" AFTER INSERT OR DELETE OR UPDATE ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_projects" AFTER INSERT OR DELETE OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_quotations" AFTER INSERT OR DELETE OR UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_signatures" AFTER INSERT OR DELETE OR UPDATE ON "public"."signature_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_audit_staff" AFTER INSERT OR DELETE OR UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."audit_change"();



CREATE OR REPLACE TRIGGER "trg_calendar_events_uat" BEFORE UPDATE ON "public"."calendar_events" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_candidates_uat" BEFORE UPDATE ON "public"."candidates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_guard_staff_sensitive" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."guard_staff_sensitive_columns"();



CREATE OR REPLACE TRIGGER "trg_inquiries_uat" BEFORE UPDATE ON "public"."inquiries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_kpi_records_uat" BEFORE UPDATE ON "public"."kpi_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leave_requests_uat" BEFORE UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_payments_advance_stage" AFTER INSERT OR UPDATE OF "status" ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."tr_payment_status_advance"();



CREATE OR REPLACE TRIGGER "trg_payments_uat" BEFORE UPDATE ON "public"."payment_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_projects_uat" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_quotations_uat" BEFORE UPDATE ON "public"."quotations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_targets_uat" BEFORE UPDATE ON "public"."sales_targets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_signatures_advance_stage" AFTER INSERT OR UPDATE OF "status" ON "public"."signature_records" FOR EACH ROW EXECUTE FUNCTION "public"."tr_signature_status_advance"();



CREATE OR REPLACE TRIGGER "trg_signatures_uat" BEFORE UPDATE ON "public"."signature_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_staff_uat" BEFORE UPDATE ON "public"."staff" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "public"."leave_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inquiries"
    ADD CONSTRAINT "inquiries_awarded_project_id_fkey" FOREIGN KEY ("awarded_project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kpi_records"
    ADD CONSTRAINT "kpi_records_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kpi_records"
    ADD CONSTRAINT "kpi_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_records"
    ADD CONSTRAINT "payment_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "public"."lifecycle_stages"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_designer_id_fkey" FOREIGN KEY ("designer_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pm_id_fkey" FOREIGN KEY ("pm_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_targets"
    ADD CONSTRAINT "sales_targets_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signature_records"
    ADD CONSTRAINT "signature_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_photos"
    ADD CONSTRAINT "site_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_photos"
    ADD CONSTRAINT "site_photos_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff"
    ADD CONSTRAINT "staff_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_log"
    ADD CONSTRAINT "whatsapp_log_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."whatsapp_log"
    ADD CONSTRAINT "whatsapp_log_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE CASCADE;



ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "announcements_read_all" ON "public"."announcements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "announcements_write_admin" ON "public"."announcements" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_read_admin" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin_tier"());



CREATE POLICY "audit_log_read_own" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("changed_by" = "auth"."uid"()));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_events_insert_self" ON "public"."calendar_events" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "public"."current_staff_id"()) OR ("staff_id" = "public"."current_staff_id"())));



CREATE POLICY "calendar_events_read_all" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "calendar_events_update_self" ON "public"."calendar_events" FOR UPDATE TO "authenticated" USING ((("created_by" = "public"."current_staff_id"()) OR ("staff_id" = "public"."current_staff_id"()))) WITH CHECK ((("created_by" = "public"."current_staff_id"()) OR ("staff_id" = "public"."current_staff_id"())));



CREATE POLICY "calendar_events_write_admin" ON "public"."calendar_events" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidates_read_all" ON "public"."candidates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "candidates_write_admin" ON "public"."candidates" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inquiries_insert_any_authenticated" ON "public"."inquiries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "inquiries_read_all" ON "public"."inquiries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "inquiries_update_own" ON "public"."inquiries" FOR UPDATE TO "authenticated" USING (("assigned_to_id" = "public"."current_staff_id"())) WITH CHECK (("assigned_to_id" = "public"."current_staff_id"()));



CREATE POLICY "inquiries_write_ops" ON "public"."inquiries" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



CREATE POLICY "kpi_read_self_or_admin" ON "public"."kpi_records" FOR SELECT TO "authenticated" USING ((("staff_id" = "public"."current_staff_id"()) OR "public"."is_admin_tier"()));



ALTER TABLE "public"."kpi_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kpi_write_admin" ON "public"."kpi_records" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



CREATE POLICY "leave_insert_self" ON "public"."leave_requests" FOR INSERT TO "authenticated" WITH CHECK (("staff_id" = "public"."current_staff_id"()));



CREATE POLICY "leave_read_all" ON "public"."leave_requests" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "leave_update_self_pending" ON "public"."leave_requests" FOR UPDATE TO "authenticated" USING ((("staff_id" = "public"."current_staff_id"()) AND ("status" = 'pending'::"public"."leave_status"))) WITH CHECK (("staff_id" = "public"."current_staff_id"()));



CREATE POLICY "leave_write_admin" ON "public"."leave_requests" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."lifecycle_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lifecycle_stages_read_all" ON "public"."lifecycle_stages" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."payment_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_read_all" ON "public"."payment_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "payments_write_ops" ON "public"."payment_records" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_read_all" ON "public"."projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "projects_update_assigned" ON "public"."projects" FOR UPDATE TO "authenticated" USING ((("designer_id" = "public"."current_staff_id"()) OR ("pm_id" = "public"."current_staff_id"()) OR ("public"."current_staff_avatar"() = ANY ("team")))) WITH CHECK ((("designer_id" = "public"."current_staff_id"()) OR ("pm_id" = "public"."current_staff_id"()) OR ("public"."current_staff_avatar"() = ANY ("team"))));



CREATE POLICY "projects_write_admin_or_ops" ON "public"."projects" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



ALTER TABLE "public"."quotation_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotation_items_read_all" ON "public"."quotation_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "quotation_items_via_quotation" ON "public"."quotation_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_items"."quotation_id") AND ("q"."created_by" = "public"."current_staff_id"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."quotations" "q"
  WHERE (("q"."id" = "quotation_items"."quotation_id") AND ("q"."created_by" = "public"."current_staff_id"())))));



CREATE POLICY "quotation_items_write_ops" ON "public"."quotation_items" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



ALTER TABLE "public"."quotations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotations_insert_any_authenticated" ON "public"."quotations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "quotations_read_all" ON "public"."quotations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "quotations_update_creator" ON "public"."quotations" FOR UPDATE TO "authenticated" USING (("created_by" = "public"."current_staff_id"())) WITH CHECK (("created_by" = "public"."current_staff_id"()));



CREATE POLICY "quotations_write_ops" ON "public"."quotations" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



ALTER TABLE "public"."sales_targets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_targets_read_self_or_admin" ON "public"."sales_targets" FOR SELECT TO "authenticated" USING ((("staff_id" = "public"."current_staff_id"()) OR "public"."is_admin_tier"()));



CREATE POLICY "sales_targets_write_admin" ON "public"."sales_targets" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."signature_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signatures_read_all" ON "public"."signature_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "signatures_write_ops" ON "public"."signature_records" TO "authenticated" USING ("public"."is_ops_tier"()) WITH CHECK ("public"."is_ops_tier"());



ALTER TABLE "public"."site_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_photos_delete_ops" ON "public"."site_photos" FOR DELETE TO "authenticated" USING ("public"."is_ops_tier"());



CREATE POLICY "site_photos_insert_any" ON "public"."site_photos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "site_photos_read_all" ON "public"."site_photos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "site_photos_update_uploader" ON "public"."site_photos" FOR UPDATE TO "authenticated" USING ((("uploaded_by_id" = "public"."current_staff_id"()) OR "public"."is_ops_tier"())) WITH CHECK ((("uploaded_by_id" = "public"."current_staff_id"()) OR "public"."is_ops_tier"()));



ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_read_all" ON "public"."staff" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "staff_update_self" ON "public"."staff" FOR UPDATE TO "authenticated" USING (("auth_user_id" = "auth"."uid"())) WITH CHECK (("auth_user_id" = "auth"."uid"()));



CREATE POLICY "staff_write_admin" ON "public"."staff" TO "authenticated" USING ("public"."is_admin_tier"()) WITH CHECK ("public"."is_admin_tier"());



ALTER TABLE "public"."whatsapp_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "whatsapp_log_admin_read" ON "public"."whatsapp_log" FOR SELECT TO "authenticated" USING ("public"."is_admin_tier"());



CREATE POLICY "whatsapp_log_own_read" ON "public"."whatsapp_log" FOR SELECT TO "authenticated" USING (("staff_id" = "public"."current_staff_id"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."audit_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_inquiry_to_project"("p_inquiry_id" "text", "p_project_name" "text", "p_designer_name" "text", "p_pm_name" "text", "p_designer_avatar" "text", "p_pm_avatar" "text", "p_start_date" "date", "p_target_date" "date", "p_budget" numeric, "p_priority" "text", "p_areas" "text"[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_inquiry_to_project"("p_inquiry_id" "text", "p_project_name" "text", "p_designer_name" "text", "p_pm_name" "text", "p_designer_avatar" "text", "p_pm_avatar" "text", "p_start_date" "date", "p_target_date" "date", "p_budget" numeric, "p_priority" "text", "p_areas" "text"[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_inquiry_to_project"("p_inquiry_id" "text", "p_project_name" "text", "p_designer_name" "text", "p_pm_name" "text", "p_designer_avatar" "text", "p_pm_avatar" "text", "p_start_date" "date", "p_target_date" "date", "p_budget" numeric, "p_priority" "text", "p_areas" "text"[], "p_proposal_deposit" numeric, "p_assigned_to_avatar" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_staff_avatar"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_avatar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_avatar"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_staff_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_portal_data"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_portal_data"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_portal_data"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_staff_sensitive_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_staff_sensitive_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_staff_sensitive_columns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_ops_tier"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_ops_tier"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_ops_tier"() TO "service_role";



GRANT ALL ON FUNCTION "public"."link_staff_to_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_staff_to_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_staff_to_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."maybe_advance_project_stage"("p_project_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."maybe_advance_project_stage"("p_project_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."maybe_advance_project_stage"("p_project_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tr_payment_status_advance"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_payment_status_advance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_payment_status_advance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."tr_signature_status_advance"() TO "anon";
GRANT ALL ON FUNCTION "public"."tr_signature_status_advance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tr_signature_status_advance"() TO "service_role";


















GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."inquiries" TO "anon";
GRANT ALL ON TABLE "public"."inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."kpi_records" TO "anon";
GRANT ALL ON TABLE "public"."kpi_records" TO "authenticated";
GRANT ALL ON TABLE "public"."kpi_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."kpi_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."kpi_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."kpi_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."lifecycle_stages" TO "anon";
GRANT ALL ON TABLE "public"."lifecycle_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."lifecycle_stages" TO "service_role";



GRANT ALL ON TABLE "public"."payment_records" TO "anon";
GRANT ALL ON TABLE "public"."payment_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."sales_targets" TO "anon";
GRANT ALL ON TABLE "public"."sales_targets" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_targets" TO "service_role";



GRANT ALL ON TABLE "public"."signature_records" TO "anon";
GRANT ALL ON TABLE "public"."signature_records" TO "authenticated";
GRANT ALL ON TABLE "public"."signature_records" TO "service_role";



GRANT ALL ON SEQUENCE "public"."signature_records_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."signature_records_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."signature_records_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."site_photos" TO "anon";
GRANT ALL ON TABLE "public"."site_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."site_photos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."site_photos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."site_photos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."site_photos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."staff" TO "anon";
GRANT ALL ON TABLE "public"."staff" TO "authenticated";
GRANT ALL ON TABLE "public"."staff" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_log" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_log" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."whatsapp_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."whatsapp_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."whatsapp_log_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































