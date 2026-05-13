/*
 * SPAZEHAUS — Supabase data hooks
 *
 * Every page that used to read from `lib/mockData.ts` / `customerData.ts` /
 * `lifecycleData.ts` / `quotationData.ts` now reads from these hooks instead.
 *
 * Each hook:
 *   • Queries Supabase via the auth-scoped client
 *   • Maps the snake_case DB rows into the camelCase shapes the UI expects
 *   • Returns the same field names the mocks used, so component diffs are minimal
 *
 * Mutations invalidate the query keys they touch, so the UI auto-refreshes.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ProjectRow,
  PaymentRecordRow,
  SignatureRecordRow,
  InquiryRow,
  StaffRow,
  QuotationRow,
  QuotationItemRow,
  LeaveRequestRow,
  LeaveStatus,
  CandidateRow,
  AnnouncementRow,
  SitePhotoRow,
  SalesTargetRow,
  CalendarEventRow,
  KpiRecordRow,
} from "@/lib/dbTypes";
import type { SignatureKey } from "@/lib/lifecycleData";
import type { LineItem } from "@/lib/quotationData";

// ─── DATE HELPERS ───────────────────────────────────────────────────────────
// DB stores YYYY-MM-DD; the UI was built around DD/MM/YYYY (Spazehaus convention).
// We map at the query boundary so components don't change.

function isoToDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function ddmmyyyyToIso(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ─── APP-SHAPE TYPES ────────────────────────────────────────────────────────
// These mirror the shapes the UI components were built against (from mockData.ts).

export type Project = {
  id: string;
  name: string;
  client: string;
  clientContact: string;
  clientEmail?: string;
  type: string;
  propertyType: string;
  location: string;
  size: number;
  budget: number;
  startDate: string;
  targetDate: string;
  status: string;
  priority: string;
  progress: number;
  designer: string;            // resolved name (joined from staff)
  pm: string;                  // resolved name
  team: string[];              // avatar codes
  photoCount: number;
  taskCount: number;
  tasksCompleted: number;
  areas: string[];
  description: string;
  currentStageId: string | null;
  lifecycleStartedAt: string | null;
};

export type PaymentRecord = {
  id: number;
  gate: 1 | 2 | 3 | 4 | 5;
  label: string;
  amount: number;
  status: PaymentRecordRow["status"];
  dueDate?: string;
  collectedDate?: string;
  reference?: string;
  instalment?: number;
  ofInstalments?: number;
  notes?: string;
};

export type DocumentSignRecord = {
  id: number;
  key: SignatureKey;
  label: string;
  group: "contract" | "drawing";
  status: SignatureRecordRow["status"];
  signedDate?: string;
  signedBy?: string;
  documentRef?: string;
  notes?: string;
};

export type ProjectLifecycle = {
  projectId: string;
  currentStageId: string;
  startedAt: string;
  payments: PaymentRecord[];
  signatures: DocumentSignRecord[];
};

// Re-export Inquiry / Staff shapes (close-enough to the existing mock types)
export type Inquiry = InquiryRow & {
  // Aliases so the existing UI keeps working without per-component rewrites
  date: string;
  client: string;
  estimatedSize?: number;
  estimatedBudget?: number;
  assignedTo?: string;            // staff avatar code (resolved)
  awardedProjectId?: string;
  awardedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  lastUpdated: string;
  propertyType: string;
  contactLog: InquiryRow["contact_log"];
};

export type Staff = StaffRow;

// ─── ROW → APP-SHAPE MAPPERS ────────────────────────────────────────────────

type ProjectWithStaffJoin = ProjectRow & {
  designer: { id: string; name: string; avatar_code: string } | null;
  pm: { id: string; name: string; avatar_code: string } | null;
};

function mapProject(row: ProjectWithStaffJoin): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client_name,
    clientContact: row.client_contact ?? "",
    clientEmail: row.client_email ?? undefined,
    type: row.project_type,
    propertyType: row.property_type,
    location: row.location,
    size: row.size_sqft,
    budget: Number(row.budget),
    startDate: isoToDDMMYYYY(row.start_date),
    targetDate: isoToDDMMYYYY(row.target_date),
    status: row.status,
    priority: row.priority,
    progress: row.progress,
    designer: row.designer?.name ?? "",
    pm: row.pm?.name ?? "",
    team: row.team ?? [],
    photoCount: row.photo_count,
    taskCount: row.task_count,
    tasksCompleted: row.tasks_completed,
    areas: row.areas ?? [],
    description: row.description ?? "",
    currentStageId: row.current_stage_id,
    lifecycleStartedAt: row.lifecycle_started_at,
  };
}

function mapPayment(row: PaymentRecordRow): PaymentRecord {
  return {
    id: row.id,
    gate: row.gate,
    label: row.label,
    amount: Number(row.amount),
    status: row.status,
    dueDate: isoToDDMMYYYY(row.due_date) || undefined,
    collectedDate: isoToDDMMYYYY(row.collected_date) || undefined,
    reference: row.reference ?? undefined,
    instalment: row.instalment ?? undefined,
    ofInstalments: row.of_instalments ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapSignature(row: SignatureRecordRow): DocumentSignRecord {
  return {
    id: row.id,
    key: row.signature_key as SignatureKey,
    label: row.label,
    group: row.group_name,
    status: row.status,
    signedDate: isoToDDMMYYYY(row.signed_date) || undefined,
    signedBy: row.signed_by ?? undefined,
    documentRef: row.document_ref ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapInquiry(row: InquiryRow, staffById: Map<string, StaffRow>): Inquiry {
  const assignedAvatar = row.assigned_to_id ? staffById.get(row.assigned_to_id)?.avatar_code : undefined;
  return {
    ...row,
    date: isoToDDMMYYYY(row.inquiry_date),
    client: row.client_name,
    propertyType: row.property_type,
    estimatedSize: row.estimated_size ?? undefined,
    estimatedBudget: row.estimated_budget ?? undefined,
    assignedTo: assignedAvatar,
    awardedProjectId: row.awarded_project_id ?? undefined,
    awardedDate: isoToDDMMYYYY(row.awarded_date) || undefined,
    rejectedDate: isoToDDMMYYYY(row.rejected_date) || undefined,
    rejectionReason: row.rejection_reason ?? undefined,
    lastUpdated: isoToDDMMYYYY(row.last_updated),
    contact_log: (row.contact_log ?? []) as Inquiry["contact_log"],
    contactLog: (row.contact_log ?? []) as Inquiry["contact_log"],
  };
}

// ─── QUERY KEYS ─────────────────────────────────────────────────────────────

export const qk = {
  staff: ["staff"] as const,
  staffOne: (id: string) => ["staff", id] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  projectLifecycle: (id: string) => ["projects", id, "lifecycle"] as const,
  openPayments: ["payments", "open"] as const,
  openSignatures: ["signatures", "open"] as const,
  inquiries: ["inquiries"] as const,
  inquiry: (id: string) => ["inquiries", id] as const,
  quotations: ["quotations"] as const,
  quotation: (id: string) => ["quotations", id] as const,
  leaveRequests: ["leave_requests"] as const,
  candidates: ["candidates"] as const,
  announcements: ["announcements"] as const,
  salesTargets: ["sales_targets"] as const,
  kpiRecords: ["kpi_records"] as const,
  staffKpi: (id: string) => ["kpi_records", id] as const,
  calendarEvents: ["calendar_events"] as const,
  sitePhotos: ["site_photos"] as const,
  projectSitePhotos: (id: string) => ["site_photos", id] as const,
};

// ─── STAFF ──────────────────────────────────────────────────────────────────

export function useAllStaff() {
  return useQuery({
    queryKey: qk.staff,
    queryFn: async (): Promise<StaffRow[]> => {
      const { data, error } = await supabase.from("staff").select("*").order("id");
      if (error) throw error;
      return (data ?? []) as StaffRow[];
    },
  });
}

// ─── PROJECTS ───────────────────────────────────────────────────────────────

const PROJECT_SELECT = `
  *,
  designer:staff!projects_designer_id_fkey(id,name,avatar_code),
  pm:staff!projects_pm_id_fkey(id,name,avatar_code)
`;

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ProjectWithStaffJoin[]).map(mapProject);
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProject(data as unknown as ProjectWithStaffJoin) : null;
    },
  });
}

// ─── LIFECYCLE (PAYMENTS + SIGNATURES PER PROJECT) ──────────────────────────

export function useProjectLifecycle(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.projectLifecycle(projectId ?? ""),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectLifecycle | null> => {
      // Two parallel reads — payments + signatures + the project's stage info
      const [proj, payRes, sigRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, current_stage_id, lifecycle_started_at")
          .eq("id", projectId)
          .maybeSingle(),
        supabase
          .from("payment_records")
          .select("*")
          .eq("project_id", projectId)
          .order("gate")
          .order("instalment", { nullsFirst: true }),
        supabase
          .from("signature_records")
          .select("*")
          .eq("project_id", projectId)
          .order("group_name")
          .order("signature_key"),
      ]);
      if (proj.error) throw proj.error;
      if (payRes.error) throw payRes.error;
      if (sigRes.error) throw sigRes.error;
      if (!proj.data) return null;

      return {
        projectId: proj.data.id,
        currentStageId: proj.data.current_stage_id ?? "",
        startedAt: isoToDDMMYYYY(proj.data.lifecycle_started_at),
        payments: (payRes.data ?? []).map(mapPayment),
        signatures: (sigRes.data ?? []).map(mapSignature),
      };
    },
  });
}

// ─── CROSS-PROJECT: OPEN PAYMENTS + SIGNATURES ──────────────────────────────

export type OpenPaymentRow = PaymentRecord & {
  projectId: string;
  projectName: string;
  client: string;
};
export type OpenSignatureRow = DocumentSignRecord & {
  projectId: string;
  projectName: string;
  client: string;
};

type PaymentWithProject = PaymentRecordRow & {
  project: { id: string; name: string; client_name: string } | null;
};
type SignatureWithProject = SignatureRecordRow & {
  project: { id: string; name: string; client_name: string } | null;
};

export function useOpenPayments() {
  return useQuery({
    queryKey: qk.openPayments,
    queryFn: async (): Promise<OpenPaymentRow[]> => {
      const { data, error } = await supabase
        .from("payment_records")
        .select("*, project:projects!inner(id,name,client_name)")
        .not("status", "in", '("completed","skipped")')
        .order("due_date", { nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as unknown as PaymentWithProject[])
        .filter((r) => r.project !== null)
        .map((r) => ({
          ...mapPayment(r),
          projectId: r.project!.id,
          projectName: r.project!.name,
          client: r.project!.client_name,
        }));
    },
  });
}

export function useOpenSignatures() {
  return useQuery({
    queryKey: qk.openSignatures,
    queryFn: async (): Promise<OpenSignatureRow[]> => {
      const { data, error } = await supabase
        .from("signature_records")
        .select("*, project:projects!inner(id,name,client_name)")
        .not("status", "in", '("completed","skipped")');
      if (error) throw error;
      return ((data ?? []) as unknown as SignatureWithProject[])
        .filter((r) => r.project !== null)
        .map((r) => ({
          ...mapSignature(r),
          projectId: r.project!.id,
          projectName: r.project!.name,
          client: r.project!.client_name,
        }));
    },
  });
}

// ─── PAYMENT MUTATIONS ──────────────────────────────────────────────────────
// Used by the Checkpoints page + ProjectDetail Lifecycle tab so admins can
// mark a payment gate (or instalment) as collected. RLS gates this to the
// OPS tier (principal/admin/admin_exec/pm/site_supervisor) — see Phase 0D.

export type UpdatePaymentArgs = {
  id: number;
  projectId: string;                  // required for cache invalidation
  status?: PaymentRecordRow["status"];
  collectedDate?: string;             // DD/MM/YYYY — null clears
  dueDate?: string;                   // DD/MM/YYYY — null clears
  reference?: string | null;
  notes?: string | null;
};

export function useUpdatePayment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdatePaymentArgs): Promise<PaymentRecordRow> => {
      const payload: Record<string, unknown> = {};
      if (args.status !== undefined) payload.status = args.status;
      if (args.collectedDate !== undefined) {
        payload.collected_date = args.collectedDate ? ddmmyyyyToIso(args.collectedDate) : null;
      }
      if (args.dueDate !== undefined) {
        payload.due_date = args.dueDate ? ddmmyyyyToIso(args.dueDate) : null;
      }
      if (args.reference !== undefined) payload.reference = args.reference;
      if (args.notes !== undefined) payload.notes = args.notes;

      const { data, error } = await supabase
        .from("payment_records")
        .update(payload)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as PaymentRecordRow;
    },
    onSuccess: (_row, args) => {
      qc.invalidateQueries({ queryKey: qk.openPayments });
      qc.invalidateQueries({ queryKey: qk.projectLifecycle(args.projectId) });
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.project(args.projectId) });
    },
  });
}

/** Convenience helper: returns true when the current staff role may write payments. */
export function canEditPayments(role: StaffRow["role"] | null | undefined): boolean {
  if (!role) return false;
  return role === "principal" || role === "admin" || role === "admin_exec"
      || role === "pm" || role === "site_supervisor";
}

/** Same OPS-tier predicate, named for the signature/document flow. */
export const canEditSignatures = canEditPayments;

// ─── SIGNATURE MUTATIONS + DOCUMENT UPLOAD (Tier 1 — e-sign) ────────────────
// `signature-docs` is a private Supabase Storage bucket; objects are fetched
// via short-lived signed URLs. Path pattern: {projectId}/{signatureKey}/{ts}.pdf

export type UpdateSignatureArgs = {
  id: number;
  projectId: string;                  // required for cache invalidation
  status?: SignatureRecordRow["status"];
  signedDate?: string | null;         // DD/MM/YYYY — null clears
  signedBy?: string | null;
  documentRef?: string | null;        // Storage path or legacy filename
  notes?: string | null;
};

export function useUpdateSignature() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdateSignatureArgs): Promise<SignatureRecordRow> => {
      const payload: Record<string, unknown> = {};
      if (args.status !== undefined) payload.status = args.status;
      if (args.signedDate !== undefined) {
        payload.signed_date = args.signedDate ? ddmmyyyyToIso(args.signedDate) : null;
      }
      if (args.signedBy !== undefined) payload.signed_by = args.signedBy;
      if (args.documentRef !== undefined) payload.document_ref = args.documentRef;
      if (args.notes !== undefined) payload.notes = args.notes;

      const { data, error } = await supabase
        .from("signature_records")
        .update(payload)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data as SignatureRecordRow;
    },
    onSuccess: (_row, args) => {
      qc.invalidateQueries({ queryKey: qk.openSignatures });
      qc.invalidateQueries({ queryKey: qk.projectLifecycle(args.projectId) });
    },
  });
}

export type UploadSignatureDocArgs = {
  signatureId: number;
  projectId: string;
  signatureKey: string;
  file: File;
};

/**
 * Upload a signature document (PDF or image) to the `signature-docs` bucket
 * and update the underlying signature_records row's `document_ref` to point
 * at the new storage path. Returns the storage path that was written.
 *
 * Does NOT change the signature's status — call useUpdateSignature separately
 * to mark it as completed (typically as part of the same submit handler).
 */
export function useUploadSignatureDoc() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: UploadSignatureDocArgs): Promise<string> => {
      const ext = args.file.name.split(".").pop()?.toLowerCase() ?? "pdf";
      const path = `${args.projectId}/${args.signatureKey}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("signature-docs")
        .upload(path, args.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: args.file.type || "application/pdf",
        });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from("signature_records")
        .update({ document_ref: path })
        .eq("id", args.signatureId);
      if (dbErr) throw dbErr;

      return path;
    },
    onSuccess: (_path, args) => {
      qc.invalidateQueries({ queryKey: qk.openSignatures });
      qc.invalidateQueries({ queryKey: qk.projectLifecycle(args.projectId) });
    },
  });
}

/** Mint a short-lived signed URL for viewing a signature document. */
export async function getSignatureDocUrl(storagePath: string, expiresInSec = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("signature-docs")
    .createSignedUrl(storagePath, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Returns true when a row's `document_ref` looks like a real Storage path
 * (contains a "/") rather than a legacy filename from the seed data.
 */
export function isStorageDocRef(documentRef: string | null | undefined): boolean {
  return typeof documentRef === "string" && documentRef.includes("/");
}

// ─── INQUIRIES ──────────────────────────────────────────────────────────────

export function useInquiries() {
  return useQuery({
    queryKey: qk.inquiries,
    queryFn: async (): Promise<Inquiry[]> => {
      const [inqRes, staffRes] = await Promise.all([
        supabase.from("inquiries").select("*").order("last_updated", { ascending: false }),
        supabase.from("staff").select("*"),
      ]);
      if (inqRes.error) throw inqRes.error;
      if (staffRes.error) throw staffRes.error;
      const staffById = new Map(((staffRes.data ?? []) as StaffRow[]).map((s) => [s.id, s]));
      return ((inqRes.data ?? []) as InquiryRow[]).map((r) => mapInquiry(r, staffById));
    },
  });
}

export function useInquiry(id: string | undefined) {
  return useQuery({
    queryKey: qk.inquiry(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<Inquiry | null> => {
      const [inqRes, staffRes] = await Promise.all([
        supabase.from("inquiries").select("*").eq("id", id).maybeSingle(),
        supabase.from("staff").select("*"),
      ]);
      if (inqRes.error) throw inqRes.error;
      if (staffRes.error) throw staffRes.error;
      if (!inqRes.data) return null;
      const staffById = new Map(((staffRes.data ?? []) as StaffRow[]).map((s) => [s.id, s]));
      return mapInquiry(inqRes.data as InquiryRow, staffById);
    },
  });
}

// ─── CONVERT INQUIRY MUTATION ───────────────────────────────────────────────

export type ConvertInquiryArgs = {
  inquiryId: string;
  projectName: string;
  designerName: string;
  pmName: string;
  designerAvatar: string;
  pmAvatar: string;
  startDate: string;     // DD/MM/YYYY
  targetDate: string;
  budget: number;
  priority: "high" | "medium" | "low";
  areas: string[];
  proposalDeposit: number;
  assignedToAvatar?: string;
};

export function useConvertInquiry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: ConvertInquiryArgs): Promise<string> => {
      const { data, error } = await supabase.rpc("convert_inquiry_to_project", {
        p_inquiry_id: args.inquiryId,
        p_project_name: args.projectName,
        p_designer_name: args.designerName,
        p_pm_name: args.pmName,
        p_designer_avatar: args.designerAvatar,
        p_pm_avatar: args.pmAvatar,
        p_start_date: ddmmyyyyToIso(args.startDate),
        p_target_date: ddmmyyyyToIso(args.targetDate),
        p_budget: args.budget,
        p_priority: args.priority,
        p_areas: args.areas,
        p_proposal_deposit: args.proposalDeposit,
        p_assigned_to_avatar: args.assignedToAvatar ?? null,
      });
      if (error) throw error;
      return data as string; // new project id (PRJ006…)
    },
    onSuccess: (_newId, args) => {
      // Invalidate everything that could now be stale
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.inquiries });
      qc.invalidateQueries({ queryKey: qk.inquiry(args.inquiryId) });
      qc.invalidateQueries({ queryKey: qk.openPayments });
      qc.invalidateQueries({ queryKey: qk.openSignatures });
    },
  });
}

// ─── CUSTOMER FUNNEL SUMMARY ────────────────────────────────────────────────

export type CustomerSummary = {
  total: number;
  newInquiry: number;
  showroomMeet: number;
  awarded: number;
  rejected: number;
  active: number;
  closedTotal: number;
  winRate: number;     // 0..1
  pipelineRM: number;
  awardedRM: number;
};

export function computeCustomerSummary(inquiries: Inquiry[]): CustomerSummary {
  const newInquiry = inquiries.filter((i) => i.stage === "new-inquiry").length;
  const showroomMeet = inquiries.filter((i) => i.stage === "showroom-meet").length;
  const awarded = inquiries.filter((i) => i.stage === "awarded").length;
  const rejected = inquiries.filter((i) => i.stage === "rejected").length;
  const active = newInquiry + showroomMeet;
  const closedTotal = awarded + rejected;
  const winRate = closedTotal === 0 ? 0 : awarded / closedTotal;
  const pipelineRM = inquiries
    .filter((i) => i.stage === "new-inquiry" || i.stage === "showroom-meet")
    .reduce((s, i) => s + (i.estimated_budget ?? 0), 0);
  const awardedRM = inquiries
    .filter((i) => i.stage === "awarded")
    .reduce((s, i) => s + (i.estimated_budget ?? 0), 0);
  return { total: inquiries.length, newInquiry, showroomMeet, awarded, rejected, active, closedTotal, winRate, pipelineRM, awardedRM };
}

// ─── CROSS-PROJECT CHECKPOINT SUMMARY ───────────────────────────────────────
// Pure function operating on already-fetched data. Same shape as the old
// `checkpointSummary()` from lifecycleData.ts, so existing UI keeps working.

import { bucketDate } from "@/lib/lifecycleData";

export type CheckpointSummary = {
  outstandingRM: number;
  overdueCount: number;
  overdueRM: number;
  thisWeekCount: number;
  pendingSignsCount: number;
  pendingContractsCount: number;
  pendingDrawingsCount: number;
  paymentsCount: number;
};

export function computeCheckpointSummary(
  payments: OpenPaymentRow[],
  signatures: OpenSignatureRow[],
  today: Date = MOCK_TODAY,
): CheckpointSummary {
  const outstandingRM = payments.reduce((s, p) => s + p.amount, 0);
  const overdue = payments.filter((p) => bucketDate(p.dueDate, today) === "overdue");
  const thisWeek = payments.filter((p) => bucketDate(p.dueDate, today) === "this-week");

  return {
    outstandingRM,
    overdueCount: overdue.length,
    overdueRM: overdue.reduce((s, p) => s + p.amount, 0),
    thisWeekCount: thisWeek.length,
    pendingSignsCount: signatures.length,
    pendingContractsCount: signatures.filter((s) => s.group === "contract").length,
    pendingDrawingsCount: signatures.filter((s) => s.group === "drawing").length,
    paymentsCount: payments.length,
  };
}

// ─── QUOTATIONS ─────────────────────────────────────────────────────────────

/** App-shape line item (camelCase, matches the legacy `LineItem` in quotationData.ts). */
function mapQuotationItem(r: QuotationItemRow): LineItem {
  return {
    id: r.id,
    area: r.area,
    description: r.description,
    category: r.category,
    qty: Number(r.qty),
    unit: r.unit,
    unitPrice: Number(r.unit_price),
    discount: Number(r.discount),
  };
}

/**
 * App-shape quotation — keeps the snake_case row fields for direct DB access
 * (status updates, etc.) AND adds the legacy camelCase aliases the UI was
 * built around so existing components don't need a field-rename pass.
 */
export type QuotationWithItems = QuotationRow & {
  items: LineItem[];
  // legacy aliases (camelCase) for compatibility with the existing UI + PDF generator
  projectId: string;
  projectName: string;
  client: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;
  type: QuotationRow["doc_type"];
  issueDate: string;            // DD/MM/YYYY
  validUntil?: string;
  dueDate?: string;
  taxRate: number;
};

type QuotationJoined = QuotationRow & {
  items: QuotationItemRow[];
  project: { id: string; name: string } | null;
};

function mapQuotation(row: QuotationJoined): QuotationWithItems {
  return {
    ...row,
    items: (row.items ?? []).map(mapQuotationItem),
    projectId: row.project_id ?? "",
    projectName: row.project?.name ?? row.project_id ?? "—",
    client: row.client_name,
    clientContact: row.client_contact ?? "",
    clientEmail: row.client_email ?? "",
    clientAddress: row.client_address ?? "",
    type: row.doc_type,
    issueDate: isoToDDMMYYYY(row.issue_date),
    validUntil: isoToDDMMYYYY(row.valid_until) || undefined,
    dueDate: isoToDDMMYYYY(row.due_date) || undefined,
    taxRate: Number(row.tax_rate),
  };
}

const QUOTATION_SELECT = "*, items:quotation_items(*), project:projects(id,name)";

export function useQuotations() {
  return useQuery({
    queryKey: qk.quotations,
    queryFn: async (): Promise<QuotationWithItems[]> => {
      const { data, error } = await supabase
        .from("quotations")
        .select(QUOTATION_SELECT)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as QuotationJoined[]).map(mapQuotation);
    },
  });
}

export function useQuotation(id: string | undefined) {
  return useQuery({
    queryKey: qk.quotation(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<QuotationWithItems | null> => {
      const { data, error } = await supabase
        .from("quotations")
        .select(QUOTATION_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapQuotation(data as unknown as QuotationJoined);
    },
  });
}

export function useUpdateQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuotationRow["status"] }) => {
      const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.quotations });
      qc.invalidateQueries({ queryKey: qk.quotation(id) });
    },
  });
}

export type CreateQuotationArgs = {
  id: string;                             // QT-YYYY-NNN
  projectId: string;
  docType: QuotationRow["doc_type"];
  clientName: string;
  clientContact?: string;
  clientEmail?: string;
  clientAddress?: string;
  issueDate: string;                      // DD/MM/YYYY
  validUntil?: string;
  dueDate?: string;
  taxRate: number;
  notes?: string;
  terms?: string;
  items: Omit<LineItem, "id">[];
};

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreateQuotationArgs): Promise<string> => {
      const issueIso = ddmmyyyyToIso(args.issueDate);
      if (!issueIso) throw new Error("Invalid issue date — expected DD/MM/YYYY");

      const { error: qErr } = await supabase.from("quotations").insert({
        id: args.id,
        project_id: args.projectId,
        doc_type: args.docType,
        status: "draft",
        client_name: args.clientName,
        client_contact: args.clientContact ?? null,
        client_email: args.clientEmail ?? null,
        client_address: args.clientAddress ?? null,
        issue_date: issueIso,
        valid_until: args.validUntil ? ddmmyyyyToIso(args.validUntil) : null,
        due_date: args.dueDate ? ddmmyyyyToIso(args.dueDate) : null,
        tax_rate: args.taxRate,
        notes: args.notes ?? null,
        terms: args.terms ?? null,
        revision: 1,
      });
      if (qErr) throw qErr;

      if (args.items.length > 0) {
        const rows = args.items.map((it, idx) => ({
          id: `${args.id}-${String(idx + 1).padStart(3, "0")}`,
          quotation_id: args.id,
          area: it.area,
          description: it.description,
          category: it.category,
          qty: it.qty,
          unit: it.unit,
          unit_price: it.unitPrice,
          discount: it.discount,
          sort_order: idx,
        }));
        const { error: iErr } = await supabase.from("quotation_items").insert(rows);
        if (iErr) throw iErr;
      }

      return args.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.quotations });
    },
  });
}

// ─── LEAVE REQUESTS ─────────────────────────────────────────────────────────

export type LeaveRequest = LeaveRequestRow & {
  staffName: string;
  staffAvatar: string;
  startDateLabel: string;        // DD/MM/YYYY
  endDateLabel: string;
  appliedDateLabel: string;
};

function mapLeaveRequest(row: LeaveRequestRow, staffById: Map<string, StaffRow>): LeaveRequest {
  const staff = staffById.get(row.staff_id);
  return {
    ...row,
    staffName: staff?.name ?? "—",
    staffAvatar: staff?.avatar_code ?? "?",
    startDateLabel: isoToDDMMYYYY(row.start_date),
    endDateLabel: isoToDDMMYYYY(row.end_date),
    appliedDateLabel: isoToDDMMYYYY(row.applied_date),
  };
}

export function useLeaveRequests() {
  return useQuery({
    queryKey: qk.leaveRequests,
    queryFn: async (): Promise<LeaveRequest[]> => {
      const [lvRes, staffRes] = await Promise.all([
        supabase.from("leave_requests").select("*").order("applied_date", { ascending: false }),
        supabase.from("staff").select("*"),
      ]);
      if (lvRes.error) throw lvRes.error;
      if (staffRes.error) throw staffRes.error;
      const staffById = new Map(((staffRes.data ?? []) as StaffRow[]).map((s) => [s.id, s]));
      return ((lvRes.data ?? []) as LeaveRequestRow[]).map((r) => mapLeaveRequest(r, staffById));
    },
  });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, approverId }: { id: string; status: LeaveStatus; approverId?: string }) => {
      const payload: Partial<LeaveRequestRow> = { status };
      if (approverId) payload.approved_by_id = approverId;
      if (status !== "pending") payload.approved_at = new Date().toISOString();
      const { error } = await supabase.from("leave_requests").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.leaveRequests });
    },
  });
}

export type ApplyLeaveArgs = {
  id: string;
  staffId: string;
  leaveType: string;
  startDate: string;             // DD/MM/YYYY
  endDate: string;
  days: number;
  reason?: string;
};

export function useApplyLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ApplyLeaveArgs) => {
      const startIso = ddmmyyyyToIso(args.startDate);
      const endIso = ddmmyyyyToIso(args.endDate);
      if (!startIso || !endIso) throw new Error("Invalid date — expected DD/MM/YYYY");
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("leave_requests").insert({
        id: args.id,
        staff_id: args.staffId,
        leave_type: args.leaveType,
        start_date: startIso,
        end_date: endIso,
        days: args.days,
        reason: args.reason ?? null,
        status: "pending",
        applied_date: today,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.leaveRequests });
    },
  });
}

// ─── CANDIDATES (RECRUITMENT) ───────────────────────────────────────────────

export type Candidate = CandidateRow & {
  appliedDateLabel: string;
};

function mapCandidate(row: CandidateRow): Candidate {
  return { ...row, appliedDateLabel: isoToDDMMYYYY(row.applied_date) };
}

export function useCandidates() {
  return useQuery({
    queryKey: qk.candidates,
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .order("applied_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as CandidateRow[]).map(mapCandidate);
    },
  });
}

export function useAdvanceCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("candidates").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.candidates });
    },
  });
}

// ─── ANNOUNCEMENTS ──────────────────────────────────────────────────────────

export type Announcement = AnnouncementRow & {
  publishedDateLabel: string;
  authorName: string;
};

function mapAnnouncement(row: AnnouncementRow, staffById: Map<string, StaffRow>): Announcement {
  const author = row.author_id ? staffById.get(row.author_id) : null;
  return {
    ...row,
    publishedDateLabel: isoToDDMMYYYY(row.published_date),
    authorName: author?.name ?? "—",
  };
}

export function useAnnouncements() {
  return useQuery({
    queryKey: qk.announcements,
    queryFn: async (): Promise<Announcement[]> => {
      const [annRes, staffRes] = await Promise.all([
        supabase.from("announcements").select("*").order("published_date", { ascending: false }),
        supabase.from("staff").select("*"),
      ]);
      if (annRes.error) throw annRes.error;
      if (staffRes.error) throw staffRes.error;
      const staffById = new Map(((staffRes.data ?? []) as StaffRow[]).map((s) => [s.id, s]));
      return ((annRes.data ?? []) as AnnouncementRow[]).map((r) => mapAnnouncement(r, staffById));
    },
  });
}

// ─── SALES TARGETS ──────────────────────────────────────────────────────────

export function useSalesTargets() {
  return useQuery({
    queryKey: qk.salesTargets,
    queryFn: async (): Promise<SalesTargetRow[]> => {
      const { data, error } = await supabase
        .from("sales_targets")
        .select("*")
        .order("staff_id");
      if (error) throw error;
      return (data ?? []) as SalesTargetRow[];
    },
  });
}

// ─── KPI RECORDS ────────────────────────────────────────────────────────────

export function useKpiRecords() {
  return useQuery({
    queryKey: qk.kpiRecords,
    queryFn: async (): Promise<KpiRecordRow[]> => {
      const { data, error } = await supabase
        .from("kpi_records")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KpiRecordRow[];
    },
  });
}

export function useStaffKpiRecords(staffId: string | undefined) {
  return useQuery({
    queryKey: qk.staffKpi(staffId ?? ""),
    enabled: Boolean(staffId),
    queryFn: async (): Promise<KpiRecordRow[]> => {
      const { data, error } = await supabase
        .from("kpi_records")
        .select("*")
        .eq("staff_id", staffId)
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KpiRecordRow[];
    },
  });
}

// ─── CALENDAR EVENTS ────────────────────────────────────────────────────────

export function useCalendarEvents() {
  return useQuery({
    queryKey: qk.calendarEvents,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .order("event_date");
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });
}

// ─── STAFF (single) ─────────────────────────────────────────────────────────

export function useStaffById(id: string | undefined) {
  return useQuery({
    queryKey: qk.staffOne(id ?? ""),
    enabled: Boolean(id),
    queryFn: async (): Promise<StaffRow | null> => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as StaffRow | null) ?? null;
    },
  });
}

// ─── SITE PHOTOS (Phase 0C.2b) ──────────────────────────────────────────────

export function useSitePhotos() {
  return useQuery({
    queryKey: qk.sitePhotos,
    queryFn: async (): Promise<SitePhotoRow[]> => {
      const { data, error } = await supabase
        .from("site_photos")
        .select("*")
        .order("photo_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SitePhotoRow[];
    },
  });
}

export function useProjectSitePhotos(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.projectSitePhotos(projectId ?? ""),
    enabled: Boolean(projectId),
    queryFn: async (): Promise<SitePhotoRow[]> => {
      const { data, error } = await supabase
        .from("site_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("photo_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SitePhotoRow[];
    },
  });
}

export type UploadSitePhotoArgs = {
  projectId: string;
  photoDate: string;             // DD/MM/YYYY
  file: File;
  uploadedById?: string;
  notes?: string;
};

export function useUploadSitePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: UploadSitePhotoArgs): Promise<SitePhotoRow> => {
      const iso = ddmmyyyyToIso(args.photoDate);
      if (!iso) throw new Error("Invalid date — expected DD/MM/YYYY");

      // 1. Upload to Storage
      const ext = args.file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${Date.now()}.${ext}`;
      const path = `${args.projectId}/${iso}/${filename}`;
      const { error: upErr } = await supabase.storage
        .from("site-photos")
        .upload(path, args.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: args.file.type || "image/jpeg",
        });
      if (upErr) throw upErr;

      // 2. Insert row (upsert by unique project_id+photo_date — replaces if user re-uploads)
      const { data, error: dbErr } = await supabase
        .from("site_photos")
        .upsert(
          {
            project_id: args.projectId,
            photo_date: iso,
            storage_path: path,
            uploaded_by_id: args.uploadedById ?? null,
            notes: args.notes ?? null,
          },
          { onConflict: "project_id,photo_date" }
        )
        .select()
        .single();
      if (dbErr) throw dbErr;

      return data as SitePhotoRow;
    },
    onSuccess: (_row, args) => {
      qc.invalidateQueries({ queryKey: qk.sitePhotos });
      qc.invalidateQueries({ queryKey: qk.projectSitePhotos(args.projectId) });
    },
  });
}

/** Generate a short-lived signed URL for a private site-photo storage path. */
export async function getSitePhotoUrl(storagePath: string, expiresInSec = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("site-photos")
    .createSignedUrl(storagePath, expiresInSec);
  if (error || !data) return null;
  return data.signedUrl;
}

// ─── ANALYTICS / COMPUTED VIEWS ─────────────────────────────────────────────
//
// These are pure functions operating on already-fetched data. Components
// fetch via the hooks above, then call these to derive the views they need.
// Mirrors the old performanceData.ts / reminderData.ts helpers but with
// no implicit dependency on mock arrays.

import {
  MOCK_TODAY,
  daysFromToday as _daysFromToday,
} from "@/lib/lifecycleData";

export { MOCK_TODAY };
export { _daysFromToday as daysFromToday };

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfYear (d: Date): Date { return new Date(d.getFullYear(), 0, 1); }
function parseISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// ── Performance: per-staff sales metrics ──

export type StaffPerformance = {
  staffId: string;
  name: string;
  avatar: string;
  role: string;
  monthlyTarget: number;
  ytdTarget: number;
  gpTargetPct: number;
  awardedYTD: number;
  awardedThisMonth: number;
  awardedCount: number;
  pipelineRM: number;
  pipelineCount: number;
  projectedGP: number;
  ytdAchievementPct: number;
  monthAchievementPct: number;
};

export function computeStaffPerformance(
  staff: StaffRow,
  target: SalesTargetRow,
  inquiries: Inquiry[],
  today: Date = MOCK_TODAY,
): StaffPerformance {
  const sMonth = startOfMonth(today);
  const sYear = startOfYear(today);
  const mine = inquiries.filter((i) => i.assignedTo === staff.avatar_code);

  let awardedYTD = 0;
  let awardedThisMonth = 0;
  let awardedCount = 0;
  for (const inq of mine) {
    if (inq.stage !== "awarded") continue;
    const d = parseISODate(inq.awarded_date);
    if (!d || d < sYear) continue;
    awardedCount += 1;
    const v = Number(inq.estimated_budget ?? 0);
    awardedYTD += v;
    if (d >= sMonth) awardedThisMonth += v;
  }

  const pipeline = mine.filter((i) => i.stage === "new-inquiry" || i.stage === "showroom-meet");
  const pipelineRM = pipeline.reduce((s, i) => s + Number(i.estimated_budget ?? 0), 0);
  const projectedGP = awardedYTD * (Number(target.gp_target_pct) / 100);

  return {
    staffId: staff.id,
    name: staff.name,
    avatar: staff.avatar_code,
    role: staff.job_title,
    monthlyTarget: Number(target.monthly_target),
    ytdTarget: Number(target.ytd_target),
    gpTargetPct: Number(target.gp_target_pct),
    awardedYTD,
    awardedThisMonth,
    awardedCount,
    pipelineRM,
    pipelineCount: pipeline.length,
    projectedGP,
    ytdAchievementPct: Number(target.ytd_target) === 0 ? 0 : awardedYTD / Number(target.ytd_target),
    monthAchievementPct: Number(target.monthly_target) === 0 ? 0 : awardedThisMonth / Number(target.monthly_target),
  };
}

/** Returns a sorted leaderboard (top awarded YTD first). */
export function computeTeamPerformance(
  staffList: StaffRow[],
  targets: SalesTargetRow[],
  inquiries: Inquiry[],
  today: Date = MOCK_TODAY,
): StaffPerformance[] {
  const staffById = new Map(staffList.map((s) => [s.id, s]));
  return targets
    .map((t) => {
      const s = staffById.get(t.staff_id);
      return s ? computeStaffPerformance(s, t, inquiries, today) : null;
    })
    .filter((p): p is StaffPerformance => p !== null)
    .sort((a, b) => b.awardedYTD - a.awardedYTD);
}

export type CompanyPerformance = {
  awardedYTD: number;
  awardedThisMonth: number;
  monthlyRevenueTarget: number;
  ytdRevenueTarget: number;
  monthAchievementPct: number;
  ytdAchievementPct: number;
  projectedGP: number;
  gpTargetPct: number;
  invoicedRM: number;
  collectedRM: number;
  pipelineRM: number;
};

export const COMPANY_GP_TARGET_PCT = 25;

export function computeCompanyPerformance(
  team: StaffPerformance[],
  targets: SalesTargetRow[],
  quotations: QuotationWithItems[],
): CompanyPerformance {
  const awardedYTD = team.reduce((s, p) => s + p.awardedYTD, 0);
  const awardedThisMonth = team.reduce((s, p) => s + p.awardedThisMonth, 0);
  const pipelineRM = team.reduce((s, p) => s + p.pipelineRM, 0);
  const ytdRevenueTarget = targets.reduce((s, t) => s + Number(t.ytd_target), 0);
  const monthlyRevenueTarget = targets.reduce((s, t) => s + Number(t.monthly_target), 0);

  let invoicedRM = 0;
  let collectedRM = 0;
  for (const q of quotations) {
    const isInvoice = q.doc_type === "Invoice" || q.status === "invoiced" || q.status === "paid";
    if (!isInvoice) continue;
    const total = q.items.reduce(
      (s, it) => s + it.qty * it.unitPrice * (1 - it.discount / 100),
      0,
    );
    const withTax = total * (1 + Number(q.tax_rate) / 100);
    invoicedRM += withTax;
    if (q.status === "paid") collectedRM += withTax;
  }

  return {
    awardedYTD,
    awardedThisMonth,
    monthlyRevenueTarget,
    ytdRevenueTarget,
    monthAchievementPct: monthlyRevenueTarget === 0 ? 0 : awardedThisMonth / monthlyRevenueTarget,
    ytdAchievementPct: ytdRevenueTarget === 0 ? 0 : awardedYTD / ytdRevenueTarget,
    projectedGP: awardedYTD * (COMPANY_GP_TARGET_PCT / 100),
    gpTargetPct: COMPANY_GP_TARGET_PCT,
    invoicedRM,
    collectedRM,
    pipelineRM,
  };
}

// ── Reminders: compose from real data ──

export type ReminderType = "daily-site-photo" | "weekly-payment-review" | "weekly-site-report";
export type ReminderStatus = "completed" | "pending" | "overdue" | "upcoming";

export type Reminder = {
  id: string;
  type: ReminderType;
  title: string;
  dueDate: string;             // DD/MM/YYYY
  assignee: string;            // avatar code
  projectId?: string;
  projectName?: string;
  status: ReminderStatus;
  completedAt?: string;
  note?: string;
};

export type SitePhotoMap = {
  // map of DD/MM/YYYY → photo metadata (uploaded if a row exists)
  projectId: string;
  photos: Record<string, { uploaded: boolean; uploadedAt?: string; by?: string; storagePath?: string }>;
};

function fmtDDMM(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function lastNDays(n: number, today: Date = MOCK_TODAY): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(fmtDDMM(d));
  }
  return out;
}

/** Build a 14-day photo map for each active project from real site_photos rows. */
export function buildSitePhotoMaps(
  activeProjectIds: string[],
  photos: SitePhotoRow[],
  staff: StaffRow[],
  today: Date = MOCK_TODAY,
): SitePhotoMap[] {
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const days = lastNDays(14, today);
  return activeProjectIds.map((projectId) => {
    const log: SitePhotoMap["photos"] = {};
    for (const day of days) {
      const iso = ddmmyyyyToIso(day);
      const match = photos.find((p) => p.project_id === projectId && p.photo_date === iso);
      if (match) {
        const uploader = match.uploaded_by_id ? staffById.get(match.uploaded_by_id) : null;
        const uploadedDate = new Date(match.uploaded_at);
        const hh = String(uploadedDate.getHours()).padStart(2, "0");
        const mn = String(uploadedDate.getMinutes()).padStart(2, "0");
        log[day] = {
          uploaded: true,
          uploadedAt: `${hh}:${mn}`,
          by: uploader?.avatar_code,
          storagePath: match.storage_path ?? undefined,
        };
      } else {
        log[day] = { uploaded: false };
      }
    }
    return { projectId, photos: log };
  });
}

function upcomingFriday(today: Date): Date {
  const d = new Date(today);
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Generate the live reminder list from real projects + photo maps + active assignment. */
export function buildReminders(
  projects: Project[],
  photoMaps: SitePhotoMap[],
  today: Date = MOCK_TODAY,
  paymentAdminAvatar = "DN",      // Denise Ng (Admin Exec) handles weekly payment review
): Reminder[] {
  const todayStr = fmtDDMM(today);
  const reminders: Reminder[] = [];

  // — Today's close-door photos —
  for (const map of photoMaps) {
    const project = projects.find((p) => p.id === map.projectId);
    if (!project) continue;
    const todayPhoto = map.photos[todayStr];
    const status: ReminderStatus = todayPhoto?.uploaded ? "completed" : "pending";
    reminders.push({
      id: `RM-${map.projectId}-PHOTO-${todayStr}`,
      type: "daily-site-photo",
      title: `Close-door photo · ${project.name}`,
      dueDate: todayStr,
      assignee: todayPhoto?.by || "LH",
      projectId: project.id,
      projectName: project.name,
      status,
      completedAt: todayPhoto?.uploaded ? todayPhoto.uploadedAt : undefined,
      note: status === "completed" ? `Uploaded ${todayPhoto?.uploadedAt}` : "Awaiting upload",
    });
  }

  // — Missed photos in the last 14 days —
  for (const map of photoMaps) {
    const project = projects.find((p) => p.id === map.projectId);
    if (!project) continue;
    for (const [day, photo] of Object.entries(map.photos)) {
      if (day === todayStr) continue;
      if (photo.uploaded) continue;
      reminders.push({
        id: `RM-${map.projectId}-PHOTO-${day}`,
        type: "daily-site-photo",
        title: `Missed: close-door photo · ${project.name}`,
        dueDate: day,
        assignee: "LH",
        projectId: project.id,
        projectName: project.name,
        status: "overdue",
        note: `No photo logged on ${day}`,
      });
    }
  }

  // — Weekly payment review (Friday) —
  const fri = upcomingFriday(today);
  const friStr = fmtDDMM(fri);
  const friDays = _daysFromToday(friStr, today) ?? 7;
  reminders.push({
    id: `RM-WEEKLY-PAYMENT-${friStr}`,
    type: "weekly-payment-review",
    title: "Weekly Payment Review",
    dueDate: friStr,
    assignee: paymentAdminAvatar,
    status: friDays === 0 ? "pending" : "upcoming",
    note: "Reconcile collected vs outstanding · review overdue gates",
  });

  // — Weekly site report per active project —
  const ACTIVE_STATUSES = new Set(["active", "assigned", "under-review"]);
  for (const project of projects) {
    if (!ACTIVE_STATUSES.has(project.status)) continue;
    reminders.push({
      id: `RM-${project.id}-SITE-REPORT-${friStr}`,
      type: "weekly-site-report",
      title: `Weekly Site Report · ${project.name}`,
      dueDate: friStr,
      assignee: project.team[0] || "WH",
      projectId: project.id,
      projectName: project.name,
      status: friDays === 0 ? "pending" : "upcoming",
      note: "Photos · progress · blockers · next-week plan",
    });
  }

  const order: Record<ReminderStatus, number> = { overdue: 0, pending: 1, upcoming: 2, completed: 3 };
  return reminders.sort((a, b) => {
    if (a.status !== b.status) return order[a.status] - order[b.status];
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export type ReminderSummary = {
  todayPending: number;
  todayCompleted: number;
  thisWeekUpcoming: number;
  overdue: number;
  streak: number;
  total: number;
};

export function reminderSummary(
  reminders: Reminder[],
  photoMaps: SitePhotoMap[],
  today: Date = MOCK_TODAY,
): ReminderSummary {
  const todayStr = fmtDDMM(today);
  const todayItems = reminders.filter((r) => r.dueDate === todayStr);
  const todayPending = todayItems.filter((r) => r.status === "pending").length;
  const todayCompleted = todayItems.filter((r) => r.status === "completed").length;
  const thisWeekUpcoming = reminders.filter((r) => r.status === "upcoming").length;
  const overdue = reminders.filter((r) => r.status === "overdue").length;

  // Streak = consecutive days *before* today where every active site logged a photo
  let streak = 0;
  const days = lastNDays(14, today).slice().reverse();
  for (let i = 1; i < days.length; i++) {
    const day = days[i];
    const allUploaded = photoMaps.every((m) => m.photos[day]?.uploaded);
    if (allUploaded) streak += 1;
    else break;
  }

  return { todayPending, todayCompleted, thisWeekUpcoming, overdue, streak, total: reminders.length };
}

// ── Project timeline ──

export type TimelineRow = {
  projectId: string;
  name: string;
  client: string;
  status: string;
  designer: string;
  start: Date;
  end: Date;
  progressPct: number;
  budget: number;
};

function parseDDMMYYYYDate(s?: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

export function buildProjectTimeline(projects: Project[]): TimelineRow[] {
  return projects
    .map((p) => {
      const start = parseDDMMYYYYDate(p.startDate);
      const end = parseDDMMYYYYDate(p.targetDate);
      if (!start || !end) return null;
      return {
        projectId: p.id,
        name: p.name,
        client: p.client,
        status: p.status,
        designer: p.designer,
        start,
        end,
        progressPct: p.progress,
        budget: p.budget,
      } as TimelineRow;
    })
    .filter((r): r is TimelineRow => r !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function timelineBounds(rows: TimelineRow[]): { min: Date; max: Date } {
  if (rows.length === 0) return { min: new Date(2026, 0, 1), max: new Date(2026, 11, 31) };
  const minMs = Math.min(...rows.map((r) => r.start.getTime()));
  const maxMs = Math.max(...rows.map((r) => r.end.getTime()));
  return { min: new Date(minMs), max: new Date(maxMs) };
}

export function timelinePos(d: Date, bounds: { min: Date; max: Date }): number {
  const span = bounds.max.getTime() - bounds.min.getTime();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (d.getTime() - bounds.min.getTime()) / span));
}

/** Compact RM formatter: 1,200,000 → RM 1.2M; 150,000 → RM 150K */
export function formatRMCompact(value: number): string {
  if (value >= 1_000_000) return `RM ${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `RM ${(value / 1_000).toFixed(0)}K`;
  return `RM ${value.toFixed(0)}`;
}
