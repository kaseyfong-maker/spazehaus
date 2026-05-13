/*
 * SPAZEHAUS — Database type schema
 *
 * Hand-authored to mirror the exact shape `supabase gen types typescript` would
 * emit for project `jifrzsvqdshjbqptubgz`. Drop-in replaceable: once anyone on
 * the team has a Supabase access token, they can regenerate this file via:
 *
 *   export SUPABASE_ACCESS_TOKEN=...
 *   bun x supabase gen types typescript --project-id jifrzsvqdshjbqptubgz \
 *     > client/src/lib/database.types.ts
 *
 * The hand-authored version is kept in lockstep with the SQL migrations under
 * supabase/migrations/. If you change a table's columns, update both places.
 *
 * Structure note: Row / Insert / Update for each table are defined as top-level
 * type aliases first, then composed into the Database interface. This avoids
 * the circular-type-reference quirk TypeScript hits when an Update uses
 * `Partial<Database["public"]["Tables"][T]["Row"]>` inside the Database
 * declaration itself.
 */

// ─── JSON HELPER (matches supabase-cli output) ──────────────────────────────

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── COLUMN-TYPE ALIASES ────────────────────────────────────────────────────

type Timestamptz = string;       // ISO 8601 from PostgREST
type DateOnly = string;          // YYYY-MM-DD
type TimeOnly = string;          // HH:MM:SS

// ─── ENUMS ──────────────────────────────────────────────────────────────────

type StaffRoleEnum =
  | "admin"
  | "principal"
  | "designer"
  | "sales"
  | "site_supervisor"
  | "pm"
  | "admin_exec";

type StaffStatusEnum = "active" | "on-leave" | "on-project" | "inactive";

type ProjectStatusEnum =
  | "active"
  | "assigned"
  | "under-review"
  | "completed"
  | "on-hold";

type ProjectPriorityEnum = "high" | "medium" | "low";

type InquiryStageEnum = "new-inquiry" | "showroom-meet" | "awarded" | "rejected";

type CustomerCategoryEnum =
  | "Residential"
  | "Commercial"
  | "F&B"
  | "Office"
  | "Investor";

type CustomerTierEnum = "VIP" | "Repeat" | "Referral" | "Standard";

type CheckpointStatusEnum =
  | "completed"
  | "in-progress"
  | "pending"
  | "overdue"
  | "skipped";

type QuotationTypeEnum = "Quotation" | "Invoice" | "Proforma Invoice";

type QuotationStatusEnum =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "invoiced"
  | "paid";

type LineItemCategoryEnum =
  | "Design"
  | "Material"
  | "Labour"
  | "Furniture"
  | "Electrical"
  | "Plumbing"
  | "Others";

type LeaveStatusEnum = "pending" | "approved" | "rejected";

type CalendarEventTypeEnum = "project" | "meeting" | "leave" | "event";

// ─── STAFF ──────────────────────────────────────────────────────────────────

type StaffRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string;
  role: StaffRoleEnum;
  job_title: string;
  dept: string;
  avatar_code: string;
  status: StaffStatusEnum;
  join_date: DateOnly;
  leave_balance_annual: number;
  leave_balance_medical: number;
  kpi_grade: string | null;
  phone: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type StaffInsert = {
  id: string;
  auth_user_id?: string | null;
  email: string;
  name: string;
  role: StaffRoleEnum;
  job_title: string;
  dept: string;
  avatar_code: string;
  status?: StaffStatusEnum;
  join_date: DateOnly;
  leave_balance_annual?: number;
  leave_balance_medical?: number;
  kpi_grade?: string | null;
  phone?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type StaffUpdate = Partial<StaffRow>;

// ─── PROJECTS ───────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string;
  name: string;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_address: string | null;
  project_type: string;
  property_type: string;
  location: string;
  size_sqft: number;
  budget: number;
  start_date: DateOnly | null;
  target_date: DateOnly | null;
  status: ProjectStatusEnum;
  priority: ProjectPriorityEnum;
  progress: number;
  designer_id: string | null;
  pm_id: string | null;
  team: string[];
  current_stage_id: string | null;
  lifecycle_started_at: DateOnly | null;
  photo_count: number;
  task_count: number;
  tasks_completed: number;
  areas: string[];
  description: string | null;
  created_by: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type ProjectInsert = {
  id: string;
  name: string;
  client_name: string;
  client_contact?: string | null;
  client_email?: string | null;
  client_address?: string | null;
  project_type: string;
  property_type: string;
  location: string;
  size_sqft: number;
  budget: number;
  start_date?: DateOnly | null;
  target_date?: DateOnly | null;
  status?: ProjectStatusEnum;
  priority?: ProjectPriorityEnum;
  progress?: number;
  designer_id?: string | null;
  pm_id?: string | null;
  team?: string[];
  current_stage_id?: string | null;
  lifecycle_started_at?: DateOnly | null;
  photo_count?: number;
  task_count?: number;
  tasks_completed?: number;
  areas?: string[];
  description?: string | null;
  created_by?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type ProjectUpdate = Partial<ProjectRow>;

// ─── PAYMENT RECORDS ────────────────────────────────────────────────────────

type PaymentRecordRow = {
  id: number;
  project_id: string;
  gate: 1 | 2 | 3 | 4 | 5;
  label: string;
  amount: number;
  status: CheckpointStatusEnum;
  due_date: DateOnly | null;
  collected_date: DateOnly | null;
  reference: string | null;
  instalment: number | null;
  of_instalments: number | null;
  notes: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type PaymentRecordInsert = {
  id?: number;
  project_id: string;
  gate: 1 | 2 | 3 | 4 | 5;
  label: string;
  amount: number;
  status?: CheckpointStatusEnum;
  due_date?: DateOnly | null;
  collected_date?: DateOnly | null;
  reference?: string | null;
  instalment?: number | null;
  of_instalments?: number | null;
  notes?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type PaymentRecordUpdate = Partial<PaymentRecordRow>;

// ─── SIGNATURE RECORDS ──────────────────────────────────────────────────────

type SignatureRecordRow = {
  id: number;
  project_id: string;
  signature_key: string;
  label: string;
  group_name: "contract" | "drawing";
  status: CheckpointStatusEnum;
  signed_date: DateOnly | null;
  signed_by: string | null;
  document_ref: string | null;
  notes: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type SignatureRecordInsert = {
  id?: number;
  project_id: string;
  signature_key: string;
  label: string;
  group_name: "contract" | "drawing";
  status?: CheckpointStatusEnum;
  signed_date?: DateOnly | null;
  signed_by?: string | null;
  document_ref?: string | null;
  notes?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type SignatureRecordUpdate = Partial<SignatureRecordRow>;

// ─── INQUIRIES ──────────────────────────────────────────────────────────────

type InquiryRow = {
  id: string;
  inquiry_date: DateOnly;
  client_name: string;
  contact: string | null;
  email: string | null;
  category: CustomerCategoryEnum;
  tier: CustomerTierEnum;
  source: string;
  property_type: string;
  location: string;
  estimated_size: number | null;
  estimated_budget: number | null;
  stage: InquiryStageEnum;
  assigned_to_id: string | null;
  notes: string | null;
  awarded_project_id: string | null;
  awarded_date: DateOnly | null;
  rejected_date: DateOnly | null;
  rejection_reason: string | null;
  contact_log: Json;
  last_updated: DateOnly;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type InquiryInsert = {
  id: string;
  inquiry_date: DateOnly;
  client_name: string;
  contact?: string | null;
  email?: string | null;
  category: CustomerCategoryEnum;
  tier?: CustomerTierEnum;
  source: string;
  property_type: string;
  location: string;
  estimated_size?: number | null;
  estimated_budget?: number | null;
  stage?: InquiryStageEnum;
  assigned_to_id?: string | null;
  notes?: string | null;
  awarded_project_id?: string | null;
  awarded_date?: DateOnly | null;
  rejected_date?: DateOnly | null;
  rejection_reason?: string | null;
  contact_log?: Json;
  last_updated: DateOnly;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type InquiryUpdate = Partial<InquiryRow>;

// ─── QUOTATIONS + ITEMS ─────────────────────────────────────────────────────

type QuotationRow = {
  id: string;
  project_id: string | null;
  doc_type: QuotationTypeEnum;
  status: QuotationStatusEnum;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_address: string | null;
  issue_date: DateOnly;
  valid_until: DateOnly | null;
  due_date: DateOnly | null;
  tax_rate: number;
  notes: string | null;
  terms: string | null;
  revision: number;
  created_by: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type QuotationInsert = {
  id: string;
  project_id?: string | null;
  doc_type?: QuotationTypeEnum;
  status?: QuotationStatusEnum;
  client_name: string;
  client_contact?: string | null;
  client_email?: string | null;
  client_address?: string | null;
  issue_date: DateOnly;
  valid_until?: DateOnly | null;
  due_date?: DateOnly | null;
  tax_rate?: number;
  notes?: string | null;
  terms?: string | null;
  revision?: number;
  created_by?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type QuotationUpdate = Partial<QuotationRow>;

type QuotationItemRow = {
  id: string;
  quotation_id: string;
  area: string;
  description: string;
  category: LineItemCategoryEnum;
  qty: number;
  unit: string;
  unit_price: number;
  discount: number;
  sort_order: number;
};
type QuotationItemInsert = {
  id: string;
  quotation_id: string;
  area: string;
  description: string;
  category: LineItemCategoryEnum;
  qty: number;
  unit: string;
  unit_price: number;
  discount?: number;
  sort_order?: number;
};
type QuotationItemUpdate = Partial<QuotationItemRow>;

// ─── LEAVE REQUESTS ─────────────────────────────────────────────────────────

type LeaveRequestRow = {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: DateOnly;
  end_date: DateOnly;
  days: number;
  reason: string | null;
  status: LeaveStatusEnum;
  applied_date: DateOnly;
  approved_by_id: string | null;
  approved_at: Timestamptz | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type LeaveRequestInsert = {
  id: string;
  staff_id: string;
  leave_type: string;
  start_date: DateOnly;
  end_date: DateOnly;
  days: number;
  reason?: string | null;
  status?: LeaveStatusEnum;
  applied_date: DateOnly;
  approved_by_id?: string | null;
  approved_at?: Timestamptz | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type LeaveRequestUpdate = Partial<LeaveRequestRow>;

// ─── CANDIDATES ─────────────────────────────────────────────────────────────

type CandidateRow = {
  id: string;
  name: string;
  applied_for_role: string;
  source: string;
  stage: string;
  applied_date: DateOnly;
  experience: string | null;
  portfolio_url: string | null;
  notes: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type CandidateInsert = {
  id: string;
  name: string;
  applied_for_role: string;
  source: string;
  stage: string;
  applied_date: DateOnly;
  experience?: string | null;
  portfolio_url?: string | null;
  notes?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type CandidateUpdate = Partial<CandidateRow>;

// ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────

type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  priority: string;
  author_id: string | null;
  published_date: DateOnly;
  created_at: Timestamptz;
};
type AnnouncementInsert = {
  id: string;
  title: string;
  content: string;
  priority?: string;
  author_id?: string | null;
  published_date: DateOnly;
  created_at?: Timestamptz;
};
type AnnouncementUpdate = Partial<AnnouncementRow>;

// ─── SITE PHOTOS ────────────────────────────────────────────────────────────

type SitePhotoRow = {
  id: number;
  project_id: string;
  photo_date: DateOnly;
  uploaded_at: Timestamptz;
  uploaded_by_id: string | null;
  storage_path: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
};
type SitePhotoInsert = {
  id?: number;
  project_id: string;
  photo_date: DateOnly;
  uploaded_at?: Timestamptz;
  uploaded_by_id?: string | null;
  storage_path?: string | null;
  notes?: string | null;
  lat?: number | null;
  lng?: number | null;
};
type SitePhotoUpdate = Partial<SitePhotoRow>;

// ─── SALES TARGETS ──────────────────────────────────────────────────────────

type SalesTargetRow = {
  staff_id: string;
  monthly_target: number;
  ytd_target: number;
  gp_target_pct: number;
  effective_from: DateOnly;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type SalesTargetInsert = {
  staff_id: string;
  monthly_target: number;
  ytd_target: number;
  gp_target_pct: number;
  effective_from: DateOnly;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type SalesTargetUpdate = Partial<SalesTargetRow>;

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────

type AuditLogRow = {
  id: number;
  table_name: string;
  row_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_at: Timestamptz;
  before_data: Json | null;
  after_data: Json | null;
};
type AuditLogInsert = {
  id?: number;
  table_name: string;
  row_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by?: string | null;
  changed_at?: Timestamptz;
  before_data?: Json | null;
  after_data?: Json | null;
};
type AuditLogUpdate = Partial<AuditLogRow>;

// ─── CALENDAR EVENTS ────────────────────────────────────────────────────────

type CalendarEventRow = {
  id: string;
  title: string;
  event_date: DateOnly;
  start_time: TimeOnly | null;
  end_time: TimeOnly | null;
  event_type: CalendarEventTypeEnum;
  color: string;
  project_id: string | null;
  leave_id: string | null;
  staff_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type CalendarEventInsert = {
  id: string;
  title: string;
  event_date: DateOnly;
  start_time?: TimeOnly | null;
  end_time?: TimeOnly | null;
  event_type: CalendarEventTypeEnum;
  color: string;
  project_id?: string | null;
  leave_id?: string | null;
  staff_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type CalendarEventUpdate = Partial<CalendarEventRow>;

// ─── KPI RECORDS ────────────────────────────────────────────────────────────

type KpiRecordRow = {
  id: number;
  staff_id: string;
  year: number;
  month: number;
  part_a_score: number;
  part_b_score: number;
  part_c_score: number;
  total_score: number;          // generated column = a + b + c
  rating: "A" | "B" | "C";
  reviewer_id: string | null;
  notes: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};
type KpiRecordInsert = {
  id?: number;
  staff_id: string;
  year: number;
  month: number;
  part_a_score: number;
  part_b_score: number;
  part_c_score: number;
  rating: "A" | "B" | "C";
  reviewer_id?: string | null;
  notes?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};
type KpiRecordUpdate = Partial<KpiRecordRow>;

// ─── LIFECYCLE STAGES ───────────────────────────────────────────────────────

type LifecycleStageRow = {
  id: string;
  order_index: number;
  label: string;
  phase: "Inquiry" | "Design" | "Pre-Build" | "Build" | "Closeout";
  stage_type: "milestone" | "payment" | "contract-sign" | "drawing-sign" | "loop";
  payment_gate: 1 | 2 | 3 | 4 | 5 | null;
  signature_key: string | null;
};
type LifecycleStageInsert = LifecycleStageRow;
type LifecycleStageUpdate = Partial<LifecycleStageRow>;

// ─── DATABASE ───────────────────────────────────────────────────────────────

// Every Tables entry in supabase-js v2's GenericSchema must include a
// `Relationships` array (foreign-key relationship descriptors). We don't use
// the typed embeds, so we leave it as an empty mutable array — readonly tuples
// here would *not* satisfy the constraint and the entire Schema would collapse
// to `never`, making every `.from()` / `.rpc()` call silently untyped.
type NoRel = [];

export type Database = {
  public: {
    Tables: {
      staff:              { Row: StaffRow;            Insert: StaffInsert;            Update: StaffUpdate;            Relationships: NoRel };
      projects:           { Row: ProjectRow;          Insert: ProjectInsert;          Update: ProjectUpdate;          Relationships: NoRel };
      payment_records:    { Row: PaymentRecordRow;    Insert: PaymentRecordInsert;    Update: PaymentRecordUpdate;    Relationships: NoRel };
      signature_records:  { Row: SignatureRecordRow;  Insert: SignatureRecordInsert;  Update: SignatureRecordUpdate;  Relationships: NoRel };
      inquiries:          { Row: InquiryRow;          Insert: InquiryInsert;          Update: InquiryUpdate;          Relationships: NoRel };
      quotations:         { Row: QuotationRow;        Insert: QuotationInsert;        Update: QuotationUpdate;        Relationships: NoRel };
      quotation_items:    { Row: QuotationItemRow;    Insert: QuotationItemInsert;    Update: QuotationItemUpdate;    Relationships: NoRel };
      leave_requests:     { Row: LeaveRequestRow;     Insert: LeaveRequestInsert;     Update: LeaveRequestUpdate;     Relationships: NoRel };
      candidates:         { Row: CandidateRow;        Insert: CandidateInsert;        Update: CandidateUpdate;        Relationships: NoRel };
      announcements:      { Row: AnnouncementRow;     Insert: AnnouncementInsert;     Update: AnnouncementUpdate;     Relationships: NoRel };
      site_photos:        { Row: SitePhotoRow;        Insert: SitePhotoInsert;        Update: SitePhotoUpdate;        Relationships: NoRel };
      sales_targets:      { Row: SalesTargetRow;      Insert: SalesTargetInsert;      Update: SalesTargetUpdate;      Relationships: NoRel };
      audit_log:          { Row: AuditLogRow;         Insert: AuditLogInsert;         Update: AuditLogUpdate;         Relationships: NoRel };
      calendar_events:    { Row: CalendarEventRow;    Insert: CalendarEventInsert;    Update: CalendarEventUpdate;    Relationships: NoRel };
      kpi_records:        { Row: KpiRecordRow;        Insert: KpiRecordInsert;        Update: KpiRecordUpdate;        Relationships: NoRel };
      lifecycle_stages:   { Row: LifecycleStageRow;   Insert: LifecycleStageInsert;   Update: LifecycleStageUpdate;   Relationships: NoRel };
    };

    Views: Record<string, never>;

    Functions: {
      /** Atomic flow that turns an inquiry into a project + initial payments + signatures. */
      convert_inquiry_to_project: {
        Args: {
          p_inquiry_id: string;
          p_project_name: string;
          p_designer_name: string;
          p_pm_name: string;
          p_designer_avatar: string;
          p_pm_avatar: string;
          p_start_date: string | null;       // YYYY-MM-DD
          p_target_date: string | null;
          p_budget: number;
          p_priority: "high" | "medium" | "low";
          p_areas: string[];
          p_proposal_deposit: number;
          p_assigned_to_avatar: string | null;
        };
        Returns: string;                     // new project id (PRJ006 …)
      };

      /**
       * Tier 1 — advance the project's current_stage_id past every stage whose
       * requirements are satisfied. Usually called server-side by triggers.
       */
      maybe_advance_project_stage: {
        Args: { p_project_id: string };
        Returns: string;
      };

      // Phase 0D RLS helpers (SECURITY DEFINER, callable from policies)
      current_staff_id:     { Args: Record<string, never>; Returns: string | null };
      current_staff_role:   { Args: Record<string, never>; Returns: StaffRoleEnum | null };
      current_staff_avatar: { Args: Record<string, never>; Returns: string | null };
      is_admin_tier:        { Args: Record<string, never>; Returns: boolean };
      is_ops_tier:          { Args: Record<string, never>; Returns: boolean };
    };

    Enums: {
      staff_role:          StaffRoleEnum;
      staff_status:        StaffStatusEnum;
      project_status:      ProjectStatusEnum;
      project_priority:    ProjectPriorityEnum;
      inquiry_stage:       InquiryStageEnum;
      customer_category:   CustomerCategoryEnum;
      customer_tier:       CustomerTierEnum;
      checkpoint_status:   CheckpointStatusEnum;
      quotation_type:      QuotationTypeEnum;
      quotation_status:    QuotationStatusEnum;
      line_item_category:  LineItemCategoryEnum;
      leave_status:        LeaveStatusEnum;
      calendar_event_type: CalendarEventTypeEnum;
    };

    CompositeTypes: Record<string, never>;
  };
};

// ─── ROW / INSERT / UPDATE EXTRACTION HELPERS ───────────────────────────────
// Mirror the helpers `supabase gen types` emits at the bottom of its output.
//
//   import type { Tables, TablesInsert } from "@/lib/database.types";
//   function take(row: Tables<"staff">) { ... }
//   function update(patch: TablesUpdate<"projects">) { ... }
//

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<E extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][E];

export type RpcArgs<F extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][F]["Args"];

export type RpcReturns<F extends keyof PublicSchema["Functions"]> =
  PublicSchema["Functions"][F]["Returns"];
