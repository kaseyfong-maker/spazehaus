-- ============================================================================
-- SPAZEHAUS — Phase 0A Schema
-- Generated: 2026-05-12
--
-- Tables, enums, indexes, audit trigger, updated_at trigger.
-- RLS policies live in 20260512000002_rls.sql.
-- Seed data lives in 20260512000003_seed.sql.
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

create type staff_role         as enum ('admin','principal','designer','sales','site_supervisor','pm','admin_exec');
create type staff_status       as enum ('active','on-leave','on-project','inactive');
create type project_status     as enum ('active','assigned','under-review','completed','on-hold');
create type project_priority   as enum ('high','medium','low');
create type inquiry_stage      as enum ('new-inquiry','showroom-meet','awarded','rejected');
create type customer_category  as enum ('Residential','Commercial','F&B','Office','Investor');
create type customer_tier      as enum ('VIP','Repeat','Referral','Standard');
create type checkpoint_status  as enum ('completed','in-progress','pending','overdue','skipped');
create type quotation_type     as enum ('Quotation','Invoice','Proforma Invoice');
create type quotation_status   as enum ('draft','sent','accepted','rejected','invoiced','paid');
create type line_item_category as enum ('Design','Material','Labour','Furniture','Electrical','Plumbing','Others');
create type leave_status       as enum ('pending','approved','rejected');

-- ─── STAFF ──────────────────────────────────────────────────────────────────
-- Extends auth.users — auth_user_id is set when the staff member logs in
-- for the first time via magic link (Phase 0B wires this).

create table staff (
  id text primary key,                             -- SH001 style
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  name text not null,
  role staff_role not null,
  job_title text not null,
  dept text not null,
  avatar_code text not null,                       -- "GT", "WL", "JL", ...
  status staff_status not null default 'active',
  join_date date not null,
  leave_balance_annual int not null default 0,
  leave_balance_medical int not null default 0,
  kpi_grade text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── PROJECTS ───────────────────────────────────────────────────────────────

create table projects (
  id text primary key,                             -- PRJ001 style
  name text not null,
  client_name text not null,
  client_contact text,
  client_email text,
  client_address text,
  project_type text not null,                      -- Residential / Commercial
  property_type text not null,                     -- Condominium / Landed / Office / F&B
  location text not null,
  size_sqft int not null,
  budget numeric(12,2) not null,
  start_date date,
  target_date date,
  status project_status not null default 'assigned',
  priority project_priority not null default 'medium',
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  designer_id text references staff(id) on delete set null,
  pm_id text references staff(id) on delete set null,
  team text[] not null default '{}',               -- avatar codes
  -- Lifecycle (1:1 with project)
  current_stage_id text,                           -- e.g. 'progressive-pay'
  lifecycle_started_at date,
  -- Operational counters (denormalised for fast cards)
  photo_count int not null default 0,
  task_count int not null default 0,
  tasks_completed int not null default 0,
  areas text[] not null default '{}',
  description text,
  created_by text references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── PAYMENT RECORDS ────────────────────────────────────────────────────────
-- One row per payment gate (gate 4 can have multiple rows for instalments)

create table payment_records (
  id bigserial primary key,
  project_id text not null references projects(id) on delete cascade,
  gate smallint not null check (gate between 1 and 5),
  label text not null,
  amount numeric(12,2) not null,
  status checkpoint_status not null default 'pending',
  due_date date,
  collected_date date,
  reference text,
  instalment smallint,
  of_instalments smallint,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── SIGNATURE RECORDS ──────────────────────────────────────────────────────
-- 6 per project: design-contract / reno-contract / handover + revised-3d / material-selection / 2d-shopping

create table signature_records (
  id bigserial primary key,
  project_id text not null references projects(id) on delete cascade,
  signature_key text not null,
  label text not null,
  group_name text not null check (group_name in ('contract','drawing')),
  status checkpoint_status not null default 'pending',
  signed_date date,
  signed_by text,
  document_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, signature_key)
);

-- ─── INQUIRIES (CUSTOMER DATABASE) ──────────────────────────────────────────

create table inquiries (
  id text primary key,                             -- INQ-2026-XXX
  inquiry_date date not null,
  client_name text not null,
  contact text,
  email text,
  category customer_category not null,
  tier customer_tier not null default 'Standard',
  source text not null,
  property_type text not null,
  location text not null,
  estimated_size int,
  estimated_budget numeric(12,2),
  stage inquiry_stage not null default 'new-inquiry',
  assigned_to_id text references staff(id) on delete set null,
  notes text,
  awarded_project_id text references projects(id) on delete set null,
  awarded_date date,
  rejected_date date,
  rejection_reason text,
  contact_log jsonb not null default '[]'::jsonb,  -- [{date,type,note,by}]
  last_updated date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── QUOTATIONS + LINE ITEMS ────────────────────────────────────────────────

create table quotations (
  id text primary key,
  project_id text references projects(id) on delete set null,
  doc_type quotation_type not null default 'Quotation',
  status quotation_status not null default 'draft',
  client_name text not null,
  client_contact text,
  client_email text,
  client_address text,
  issue_date date not null,
  valid_until date,
  due_date date,
  tax_rate numeric(5,2) not null default 0,
  notes text,
  terms text,
  revision int not null default 1,
  created_by text references staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quotation_items (
  id text primary key,
  quotation_id text not null references quotations(id) on delete cascade,
  area text not null,
  description text not null,
  category line_item_category not null,
  qty numeric(10,2) not null,
  unit text not null,
  unit_price numeric(12,2) not null,
  discount numeric(5,2) not null default 0,
  sort_order int not null default 0
);

-- ─── HR: LEAVE + RECRUITMENT + ANNOUNCEMENTS ────────────────────────────────

create table leave_requests (
  id text primary key,
  staff_id text not null references staff(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  days int not null,
  reason text,
  status leave_status not null default 'pending',
  applied_date date not null,
  approved_by_id text references staff(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table candidates (
  id text primary key,
  name text not null,
  applied_for_role text not null,
  source text not null,
  stage text not null,
  applied_date date not null,
  experience text,
  portfolio_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table announcements (
  id text primary key,
  title text not null,
  content text not null,
  priority text not null default 'low',
  author_id text references staff(id) on delete set null,
  published_date date not null,
  created_at timestamptz not null default now()
);

-- ─── SITE PHOTOS (daily close-door) ─────────────────────────────────────────

create table site_photos (
  id bigserial primary key,
  project_id text not null references projects(id) on delete cascade,
  photo_date date not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by_id text references staff(id) on delete set null,
  storage_path text,                               -- Supabase Storage path (filled in Phase 0C)
  notes text,
  lat numeric(9,6),
  lng numeric(9,6),
  unique (project_id, photo_date)
);

-- ─── SALES TARGETS ──────────────────────────────────────────────────────────

create table sales_targets (
  staff_id text primary key references staff(id) on delete cascade,
  monthly_target numeric(12,2) not null,
  ytd_target numeric(12,2) not null,
  gp_target_pct numeric(5,2) not null,
  effective_from date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── AUDIT LOG ──────────────────────────────────────────────────────────────

create table audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────

create index idx_staff_avatar             on staff(avatar_code);
create index idx_projects_status          on projects(status);
create index idx_projects_designer        on projects(designer_id);
create index idx_projects_pm              on projects(pm_id);
create index idx_payments_project         on payment_records(project_id);
create index idx_payments_status          on payment_records(status);
create index idx_payments_due_date        on payment_records(due_date);
create index idx_signatures_project       on signature_records(project_id);
create index idx_signatures_status        on signature_records(status);
create index idx_inquiries_stage          on inquiries(stage);
create index idx_inquiries_assigned       on inquiries(assigned_to_id);
create index idx_inquiries_awarded_proj   on inquiries(awarded_project_id);
create index idx_quotations_project       on quotations(project_id);
create index idx_quotations_status        on quotations(status);
create index idx_quotation_items_quote    on quotation_items(quotation_id);
create index idx_leave_requests_staff     on leave_requests(staff_id);
create index idx_leave_requests_status    on leave_requests(status);
create index idx_site_photos_project_dt   on site_photos(project_id, photo_date);
create index idx_audit_log_table_row      on audit_log(table_name, row_id);
create index idx_audit_log_changed_at     on audit_log(changed_at desc);

-- ─── updated_at AUTO-TOUCH ──────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_staff_uat               before update on staff             for each row execute function set_updated_at();
create trigger trg_projects_uat            before update on projects          for each row execute function set_updated_at();
create trigger trg_payments_uat            before update on payment_records   for each row execute function set_updated_at();
create trigger trg_signatures_uat          before update on signature_records for each row execute function set_updated_at();
create trigger trg_inquiries_uat           before update on inquiries         for each row execute function set_updated_at();
create trigger trg_quotations_uat          before update on quotations        for each row execute function set_updated_at();
create trigger trg_leave_requests_uat      before update on leave_requests    for each row execute function set_updated_at();
create trigger trg_candidates_uat          before update on candidates        for each row execute function set_updated_at();
create trigger trg_sales_targets_uat       before update on sales_targets     for each row execute function set_updated_at();

-- ─── AUDIT TRIGGER ──────────────────────────────────────────────────────────

create or replace function audit_change()
returns trigger
language plpgsql
security definer
as $$
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

create trigger trg_audit_projects          after insert or update or delete on projects          for each row execute function audit_change();
create trigger trg_audit_payments          after insert or update or delete on payment_records   for each row execute function audit_change();
create trigger trg_audit_signatures        after insert or update or delete on signature_records for each row execute function audit_change();
create trigger trg_audit_inquiries         after insert or update or delete on inquiries         for each row execute function audit_change();
create trigger trg_audit_quotations        after insert or update or delete on quotations        for each row execute function audit_change();
create trigger trg_audit_leave_requests    after insert or update or delete on leave_requests    for each row execute function audit_change();
create trigger trg_audit_staff             after insert or update or delete on staff             for each row execute function audit_change();
