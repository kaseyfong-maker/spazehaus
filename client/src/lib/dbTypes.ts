/*
 * SPAZEHAUS — Database row types
 *
 * Hand-written for now to match the Supabase schema (Phase 0A migrations).
 * In Phase 0E we'll generate these automatically via `supabase gen types
 * typescript`. Until then, keep these in lockstep with the SQL.
 */

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export type StaffRole =
  | "admin"
  | "principal"
  | "designer"
  | "sales"
  | "site_supervisor"
  | "pm"
  | "admin_exec";

export type StaffStatus = "active" | "on-leave" | "on-project" | "inactive";

export type ProjectStatus = "active" | "assigned" | "under-review" | "completed" | "on-hold";
export type ProjectPriority = "high" | "medium" | "low";

export type InquiryStage = "new-inquiry" | "showroom-meet" | "awarded" | "rejected";
export type CustomerCategory = "Residential" | "Commercial" | "F&B" | "Office" | "Investor";
export type CustomerTier = "VIP" | "Repeat" | "Referral" | "Standard";

export type CheckpointStatus = "completed" | "in-progress" | "pending" | "overdue" | "skipped";

export type QuotationType = "Quotation" | "Invoice" | "Proforma Invoice";
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "invoiced" | "paid";
export type LineItemCategory = "Design" | "Material" | "Labour" | "Furniture" | "Electrical" | "Plumbing" | "Others";

// ─── ROW SHAPES ─────────────────────────────────────────────────────────────

export type StaffRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  name: string;
  role: StaffRole;
  job_title: string;
  dept: string;
  avatar_code: string;
  status: StaffStatus;
  join_date: string;            // YYYY-MM-DD
  leave_balance_annual: number;
  leave_balance_medical: number;
  kpi_grade: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = {
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
  start_date: string | null;     // YYYY-MM-DD
  target_date: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  designer_id: string | null;
  pm_id: string | null;
  team: string[];                // avatar codes
  current_stage_id: string | null;
  lifecycle_started_at: string | null;
  photo_count: number;
  task_count: number;
  tasks_completed: number;
  areas: string[];
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentRecordRow = {
  id: number;
  project_id: string;
  gate: 1 | 2 | 3 | 4 | 5;
  label: string;
  amount: number;
  status: CheckpointStatus;
  due_date: string | null;
  collected_date: string | null;
  reference: string | null;
  instalment: number | null;
  of_instalments: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SignatureRecordRow = {
  id: number;
  project_id: string;
  signature_key: string;
  label: string;
  group_name: "contract" | "drawing";
  status: CheckpointStatus;
  signed_date: string | null;
  signed_by: string | null;
  document_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContactLogEntryDb = {
  date: string;                  // DD/MM/YYYY (mirrors the mock format for compatibility)
  type: "call" | "email" | "whatsapp" | "meet" | "site-visit";
  note: string;
  by: string;
};

export type InquiryRow = {
  id: string;
  inquiry_date: string;          // YYYY-MM-DD
  client_name: string;
  contact: string | null;
  email: string | null;
  category: CustomerCategory;
  tier: CustomerTier;
  source: string;
  property_type: string;
  location: string;
  estimated_size: number | null;
  estimated_budget: number | null;
  stage: InquiryStage;
  assigned_to_id: string | null;
  notes: string | null;
  awarded_project_id: string | null;
  awarded_date: string | null;
  rejected_date: string | null;
  rejection_reason: string | null;
  contact_log: ContactLogEntryDb[];
  last_updated: string;
  created_at: string;
  updated_at: string;
};

export type QuotationRow = {
  id: string;
  project_id: string | null;
  doc_type: QuotationType;
  status: QuotationStatus;
  client_name: string;
  client_contact: string | null;
  client_email: string | null;
  client_address: string | null;
  issue_date: string;
  valid_until: string | null;
  due_date: string | null;
  tax_rate: number;
  notes: string | null;
  terms: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type QuotationItemRow = {
  id: string;
  quotation_id: string;
  area: string;
  description: string;
  category: LineItemCategory;
  qty: number;
  unit: string;
  unit_price: number;
  discount: number;
  sort_order: number;
};

// ─── HR / RECRUITMENT / ANNOUNCEMENTS ───────────────────────────────────────

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequestRow = {
  id: string;
  staff_id: string;
  leave_type: string;            // "Annual Leave" | "Medical Leave" | ...
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: LeaveStatus;
  applied_date: string;
  approved_by_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CandidateRow = {
  id: string;
  name: string;
  applied_for_role: string;
  source: string;
  stage: string;                 // free-form (Sourced / Shortlisted / Interview / 2nd Interview / Offer / Onboarded)
  applied_date: string;
  experience: string | null;
  portfolio_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  priority: string;              // "high" | "medium" | "low"
  author_id: string | null;
  published_date: string;
  created_at: string;
};

// ─── SITE PHOTOS ────────────────────────────────────────────────────────────

export type SitePhotoRow = {
  id: number;
  project_id: string;
  photo_date: string;
  uploaded_at: string;
  uploaded_by_id: string | null;
  storage_path: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
};

// ─── SALES TARGETS ──────────────────────────────────────────────────────────

export type SalesTargetRow = {
  staff_id: string;
  monthly_target: number;
  ytd_target: number;
  gp_target_pct: number;
  effective_from: string;
  created_at: string;
  updated_at: string;
};

// ─── CALENDAR EVENTS (Phase 0C.2) ───────────────────────────────────────────

export type CalendarEventType = "project" | "meeting" | "leave" | "event";

export type CalendarEventRow = {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: CalendarEventType;
  color: string;
  project_id: string | null;
  leave_id: string | null;
  staff_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

// ─── KPI RECORDS (Phase 0C.2) ───────────────────────────────────────────────

export type KpiRating = "A" | "B" | "C";

export type KpiRecordRow = {
  id: number;
  staff_id: string;
  year: number;
  month: number;                 // 1..12
  part_a_score: number;          // 0..30
  part_b_score: number;          // 0..50
  part_c_score: number;          // 0..20
  total_score: number;           // generated column = a + b + c
  rating: KpiRating;
  reviewer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
