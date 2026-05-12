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
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  projectLifecycle: (id: string) => ["projects", id, "lifecycle"] as const,
  openPayments: ["payments", "open"] as const,
  openSignatures: ["signatures", "open"] as const,
  inquiries: ["inquiries"] as const,
  inquiry: (id: string) => ["inquiries", id] as const,
  quotations: ["quotations"] as const,
  quotation: (id: string) => ["quotations", id] as const,
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

import { bucketDate, MOCK_TODAY } from "@/lib/lifecycleData";

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

export type QuotationWithItems = QuotationRow & { items: LineItem[] };

export function useQuotations() {
  return useQuery({
    queryKey: qk.quotations,
    queryFn: async (): Promise<QuotationWithItems[]> => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*, items:quotation_items(*)")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as (QuotationRow & { items: QuotationItemRow[] })[]).map((q) => ({
        ...q,
        items: (q.items ?? []).map(mapQuotationItem),
      }));
    },
  });
}
