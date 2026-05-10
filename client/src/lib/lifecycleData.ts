/*
 * SPAZEHAUS PROJECT LIFECYCLE DATA
 * Source: 2026 Annual Meeting PDF — Design & Renovation Workflow
 *
 * 29 canonical stages across 5 phases (Inquiry → Design → Pre-Build → Build → Closeout)
 * 5 Payment Collection Checkpoints (① ② ③ ④ ⑤)
 * 6 Document Sign Checkpoints — 3 Contracts + 3 Drawings
 */

export type StagePhase = "Inquiry" | "Design" | "Pre-Build" | "Build" | "Closeout";

export type StageType =
  | "milestone"      // generic workflow step
  | "payment"        // payment collection checkpoint
  | "contract-sign"  // formal contract signature (Group A: 3 items)
  | "drawing-sign"   // drawing / selection client sign-off (Group B: 3 items)
  | "loop";          // revision loop (e.g. revised design proposal)

export type PaymentGate = 1 | 2 | 3 | 4 | 5;

export type SignatureKey =
  | "design-contract"
  | "renovation-contract"
  | "handover"
  | "revised-3d"
  | "material-selection"
  | "2d-shopping";

export type LifecycleStage = {
  id: string;
  order: number;
  label: string;
  type: StageType;
  phase: StagePhase;
  paymentGate?: PaymentGate;
  signatureKey?: SignatureKey;
  description?: string;
};

/**
 * The full 29-step workflow, in canonical order.
 * Numbering matches the yellow ① ② ③ ④ ⑤ payment circles and
 * the pink/brown ① ② ③ document-sign circles in the PDF.
 */
export const LIFECYCLE_STAGES: LifecycleStage[] = [
  // —— INQUIRY ——
  { id: "new-inquiry",          order: 1,  label: "New Inquiry",                  type: "milestone", phase: "Inquiry" },
  { id: "inquiry-form",         order: 2,  label: "Fill In Inquiry Form",         type: "milestone", phase: "Inquiry" },
  { id: "showroom-meet",        order: 3,  label: "Showroom Meet Up",             type: "milestone", phase: "Inquiry" },

  // —— DESIGN ——
  { id: "design-prop-signed",   order: 4,  label: "Design Proposal Signed",       type: "milestone", phase: "Design" },
  { id: "proposal-deposit",     order: 5,  label: "Proposal Deposit Collected",   type: "payment",   phase: "Design", paymentGate: 1 },
  { id: "design-proposal",      order: 6,  label: "Design Proposal",              type: "milestone", phase: "Design" },
  { id: "design-quotation",     order: 7,  label: "Design Quotation",             type: "milestone", phase: "Design" },
  { id: "proposal-meeting",     order: 8,  label: "Proposal Meeting",             type: "milestone", phase: "Design", description: "Loop back to Revised Design Proposal if not accepted" },
  { id: "design-contract",      order: 9,  label: "Design Contract Signed",       type: "contract-sign", phase: "Design", signatureKey: "design-contract", paymentGate: 2, description: "Document sign #1 + Payment ②" },

  // —— PRE-BUILD ——
  { id: "3d-drawing",           order: 10, label: "3D Drawing",                   type: "milestone", phase: "Pre-Build" },
  { id: "reno-quotation",       order: 11, label: "Renovation Quotation",         type: "milestone", phase: "Pre-Build" },
  { id: "3d-meeting",           order: 12, label: "3D Meeting",                   type: "milestone", phase: "Pre-Build" },
  { id: "revised-3d",           order: 13, label: "Revised 3D Drawing",           type: "drawing-sign", phase: "Pre-Build", signatureKey: "revised-3d", description: "Sign Drawing #1 — client locks the visual" },
  { id: "reno-contract",        order: 14, label: "Renovation Contract Signed",   type: "contract-sign", phase: "Pre-Build", signatureKey: "renovation-contract", description: "Document sign #2" },
  { id: "reno-deposit",         order: 15, label: "Renovation Deposit Collected", type: "payment",   phase: "Pre-Build", paymentGate: 3 },
  { id: "work-schedule",        order: 16, label: "Work Schedule",                type: "milestone", phase: "Pre-Build" },
  { id: "material-selection",   order: 17, label: "Material Selection",           type: "drawing-sign", phase: "Pre-Build", signatureKey: "material-selection", description: "Sign Drawing #2 — locks finishes" },
  { id: "2d-shopping",          order: 18, label: "2D Drawing / Shopping List",   type: "drawing-sign", phase: "Pre-Build", signatureKey: "2d-shopping", description: "Sign Drawing #3 — locks plan + procurement" },

  // —— BUILD ——
  { id: "kick-off",             order: 19, label: "Kick Off Renovation",          type: "milestone", phase: "Build" },
  { id: "contractor-brief",     order: 20, label: "Contractor Briefing",          type: "milestone", phase: "Build" },
  { id: "site-inspection",      order: 21, label: "Site Inspection",              type: "milestone", phase: "Build" },
  { id: "progressive-pay",      order: 22, label: "Progressive Payment",          type: "payment",   phase: "Build", paymentGate: 4, description: "Billed 2–6 instalments across the build" },
  { id: "site-report",          order: 23, label: "Site Report",                  type: "milestone", phase: "Build" },

  // —— CLOSEOUT ——
  { id: "site-completed",       order: 24, label: "Site Completed / As-Built Drawing", type: "milestone", phase: "Closeout" },
  { id: "furniture-delivery",   order: 25, label: "Furniture Delivery",           type: "milestone", phase: "Closeout" },
  { id: "handover",             order: 26, label: "Handover",                     type: "contract-sign", phase: "Closeout", signatureKey: "handover", description: "Document sign #3 — client acceptance" },
  { id: "final-payment",        order: 27, label: "Final Payment",                type: "payment",   phase: "Closeout", paymentGate: 5 },
  { id: "completion",           order: 28, label: "Project Completion",           type: "milestone", phase: "Closeout" },
  { id: "defect-period",        order: 29, label: "Defect Period",                type: "milestone", phase: "Closeout", description: "Post-handover liability window" },
];

// —————————————————————————————————————————————————————————————
// Per-project lifecycle state
// —————————————————————————————————————————————————————————————

export type CheckpointStatus = "completed" | "in-progress" | "pending" | "overdue" | "skipped";

export type PaymentRecord = {
  gate: PaymentGate;
  label: string;
  amount: number;            // RM
  status: CheckpointStatus;
  dueDate?: string;          // DD/MM/YYYY
  collectedDate?: string;
  reference?: string;        // bank ref / receipt no
  instalment?: number;       // for gate 4 progressive payments
  ofInstalments?: number;
  notes?: string;
};

export type DocumentSignRecord = {
  key: SignatureKey;
  label: string;
  group: "contract" | "drawing";
  status: CheckpointStatus;
  signedDate?: string;
  signedBy?: string;        // client name
  documentRef?: string;     // file ref
  notes?: string;
};

export type ProjectLifecycle = {
  projectId: string;
  currentStageId: string;
  startedAt: string;        // DD/MM/YYYY
  payments: PaymentRecord[];
  signatures: DocumentSignRecord[];
};

/**
 * Helpers to look up stage metadata.
 */
export const stageById = (id: string) => LIFECYCLE_STAGES.find((s) => s.id === id);
export const stageOrder = (id: string) => stageById(id)?.order ?? 0;

/**
 * Phase color tokens (matches the existing warm-gold palette).
 */
export const phaseColors: Record<StagePhase, { color: string; bg: string; border: string }> = {
  "Inquiry":   { color: "oklch(0.45 0.10 55)",  bg: "oklch(0.65 0.10 55 / 10%)",  border: "oklch(0.65 0.10 55 / 25%)" },
  "Design":    { color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 10%)",  border: "oklch(0.62 0.09 68 / 25%)" },
  "Pre-Build": { color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 10%)", border: "oklch(0.55 0.09 240 / 25%)" },
  "Build":     { color: "oklch(0.50 0.10 25)",  bg: "oklch(0.60 0.10 25 / 10%)",  border: "oklch(0.60 0.10 25 / 25%)" },
  "Closeout":  { color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 10%)", border: "oklch(0.55 0.09 145 / 25%)" },
};

export const checkpointStatusConfig: Record<CheckpointStatus, { label: string; color: string; bg: string; border: string }> = {
  completed:    { label: "Completed",   color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)", border: "oklch(0.55 0.09 145 / 25%)" },
  "in-progress":{ label: "In Progress", color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 12%)", border: "oklch(0.55 0.09 240 / 25%)" },
  pending:      { label: "Pending",     color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)",  border: "oklch(0.62 0.09 68 / 25%)" },
  overdue:      { label: "Overdue",     color: "oklch(0.50 0.12 25)",  bg: "oklch(0.60 0.12 25 / 12%)",  border: "oklch(0.60 0.12 25 / 25%)" },
  skipped:      { label: "Skipped",     color: "oklch(0.55 0.006 80)", bg: "oklch(0.55 0.006 80 / 12%)", border: "oklch(0.55 0.006 80 / 25%)" },
};

// —————————————————————————————————————————————————————————————
// Mock lifecycle data per project (matches existing PRJ001…PRJ005)
// Today (2026-05-10) drives the "current stage" for each.
// —————————————————————————————————————————————————————————————

export const projectLifecycles: ProjectLifecycle[] = [
  // PRJ001 — Paragon Residence — active 65% — currently in BUILD / Progressive Payment
  {
    projectId: "PRJ001",
    currentStageId: "progressive-pay",
    startedAt: "05/01/2026",
    payments: [
      { gate: 1, label: "Proposal Deposit",         amount: 3000,   status: "completed",  collectedDate: "10/12/2025", reference: "PD-2025-021" },
      { gate: 2, label: "Design Contract Fee",      amount: 18000,  status: "completed",  collectedDate: "20/12/2025", reference: "DC-2025-018" },
      { gate: 3, label: "Renovation Deposit (50%)", amount: 130000, status: "completed",  collectedDate: "08/01/2026", reference: "RD-2026-003" },
      { gate: 4, label: "Progressive Payment 1/3",  amount: 39000,  status: "completed",  collectedDate: "15/03/2026", reference: "PP-2026-014", instalment: 1, ofInstalments: 3 },
      { gate: 4, label: "Progressive Payment 2/3",  amount: 39000,  status: "in-progress", dueDate: "15/05/2026", instalment: 2, ofInstalments: 3, notes: "Awaiting site inspection sign-off" },
      { gate: 4, label: "Progressive Payment 3/3",  amount: 39000,  status: "pending",    dueDate: "10/06/2026", instalment: 3, ofInstalments: 3 },
      { gate: 5, label: "Final Payment",            amount: 51000,  status: "pending",    dueDate: "30/04/2026" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "completed", signedDate: "20/12/2025", signedBy: "Mr. & Mrs. Lim", documentRef: "DC-PRJ001.pdf" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "completed", signedDate: "28/12/2025", signedBy: "Mr. & Mrs. Lim", documentRef: "3D-R2-PRJ001.pdf" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "completed", signedDate: "05/01/2026", signedBy: "Mr. & Mrs. Lim", documentRef: "RC-PRJ001.pdf" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "completed", signedDate: "12/01/2026", signedBy: "Mr. & Mrs. Lim", documentRef: "MS-PRJ001.pdf" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "completed", signedDate: "15/01/2026", signedBy: "Mr. & Mrs. Lim", documentRef: "2D-PRJ001.pdf" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "pending" },
    ],
  },

  // PRJ002 — Eco Botanic Office — under-review 92% — at HANDOVER awaiting Final Payment
  {
    projectId: "PRJ002",
    currentStageId: "final-payment",
    startedAt: "15/11/2025",
    payments: [
      { gate: 1, label: "Proposal Deposit",          amount: 5000,   status: "completed", collectedDate: "01/10/2025", reference: "PD-2025-014" },
      { gate: 2, label: "Design Contract Fee",       amount: 52000,  status: "completed", collectedDate: "10/10/2025", reference: "DC-2025-009" },
      { gate: 3, label: "Renovation Deposit (50%)",  amount: 260000, status: "completed", collectedDate: "12/11/2025", reference: "RD-2025-021" },
      { gate: 4, label: "Progressive Payment 1/2",   amount: 80000,  status: "completed", collectedDate: "15/01/2026", reference: "PP-2026-002", instalment: 1, ofInstalments: 2 },
      { gate: 4, label: "Progressive Payment 2/2",   amount: 80000,  status: "completed", collectedDate: "20/02/2026", reference: "PP-2026-008", instalment: 2, ofInstalments: 2 },
      { gate: 5, label: "Final Payment",             amount: 43000,  status: "in-progress", dueDate: "15/05/2026", notes: "Invoice issued, awaiting client transfer" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "completed", signedDate: "10/10/2025", signedBy: "TechVenture Sdn Bhd", documentRef: "DC-PRJ002.pdf" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "completed", signedDate: "28/10/2025", signedBy: "TechVenture Sdn Bhd", documentRef: "3D-R3-PRJ002.pdf" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "completed", signedDate: "08/11/2025", signedBy: "TechVenture Sdn Bhd", documentRef: "RC-PRJ002.pdf" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "completed", signedDate: "20/11/2025", signedBy: "TechVenture Sdn Bhd", documentRef: "MS-PRJ002.pdf" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "completed", signedDate: "25/11/2025", signedBy: "TechVenture Sdn Bhd", documentRef: "2D-PRJ002.pdf" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "completed", signedDate: "20/02/2026", signedBy: "TechVenture Sdn Bhd", documentRef: "HO-PRJ002.pdf" },
    ],
  },

  // PRJ003 — Setia Indah Landed — assigned 15% — just past DESIGN CONTRACT SIGNED
  {
    projectId: "PRJ003",
    currentStageId: "3d-meeting",
    startedAt: "10/02/2026",
    payments: [
      { gate: 1, label: "Proposal Deposit",         amount: 5000,   status: "completed",  collectedDate: "12/01/2026", reference: "PD-2026-002" },
      { gate: 2, label: "Design Contract Fee",      amount: 65000,  status: "completed",  collectedDate: "08/02/2026", reference: "DC-2026-005" },
      { gate: 3, label: "Renovation Deposit (50%)", amount: 325000, status: "pending",    dueDate: "15/05/2026", notes: "Awaiting renovation contract signing" },
      { gate: 4, label: "Progressive Payment",      amount: 162500, status: "pending",    dueDate: "TBD",        notes: "To be split into 4 instalments" },
      { gate: 5, label: "Final Payment",            amount: 97500,  status: "pending",    dueDate: "31/07/2026" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "completed", signedDate: "08/02/2026", signedBy: "Dato' Ahmad Razif", documentRef: "DC-PRJ003.pdf" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "in-progress", notes: "3D meeting scheduled this week" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "pending" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "pending" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "pending" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "pending" },
    ],
  },

  // PRJ004 — Paradigm Mall F&B — completed 100% — full lifecycle done
  {
    projectId: "PRJ004",
    currentStageId: "defect-period",
    startedAt: "20/01/2026",
    payments: [
      { gate: 1, label: "Proposal Deposit",         amount: 4000,   status: "completed", collectedDate: "05/12/2025", reference: "PD-2025-019" },
      { gate: 2, label: "Design Contract Fee",      amount: 38000,  status: "completed", collectedDate: "15/12/2025", reference: "DC-2025-017" },
      { gate: 3, label: "Renovation Deposit (50%)", amount: 190000, status: "completed", collectedDate: "18/01/2026", reference: "RD-2026-007" },
      { gate: 4, label: "Progressive Payment 1/2",  amount: 76000,  status: "completed", collectedDate: "10/02/2026", reference: "PP-2026-005", instalment: 1, ofInstalments: 2 },
      { gate: 4, label: "Progressive Payment 2/2",  amount: 76000,  status: "completed", collectedDate: "01/03/2026", reference: "PP-2026-011", instalment: 2, ofInstalments: 2 },
      { gate: 5, label: "Final Payment",            amount: 38000,  status: "completed", collectedDate: "16/03/2026", reference: "FP-2026-004" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "completed", signedDate: "15/12/2025", signedBy: "Saveur Group", documentRef: "DC-PRJ004.pdf" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "completed", signedDate: "30/12/2025", signedBy: "Saveur Group", documentRef: "3D-R2-PRJ004.pdf" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "completed", signedDate: "15/01/2026", signedBy: "Saveur Group", documentRef: "RC-PRJ004.pdf" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "completed", signedDate: "22/01/2026", signedBy: "Saveur Group", documentRef: "MS-PRJ004.pdf" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "completed", signedDate: "25/01/2026", signedBy: "Saveur Group", documentRef: "2D-PRJ004.pdf" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "completed", signedDate: "15/03/2026", signedBy: "Saveur Group", documentRef: "HO-PRJ004.pdf" },
    ],
  },

  // PRJ005 — Austin Heights — active 30% — RENOVATION DEPOSIT just collected, KICK OFF imminent
  {
    projectId: "PRJ005",
    currentStageId: "work-schedule",
    startedAt: "01/03/2026",
    payments: [
      { gate: 1, label: "Proposal Deposit",         amount: 2000,  status: "completed", collectedDate: "10/02/2026", reference: "PD-2026-006" },
      { gate: 2, label: "Design Contract Fee",      amount: 8000,  status: "completed", collectedDate: "20/02/2026", reference: "DC-2026-008" },
      { gate: 3, label: "Renovation Deposit (50%)", amount: 60000, status: "completed", collectedDate: "28/02/2026", reference: "RD-2026-012" },
      { gate: 4, label: "Progressive Payment",      amount: 36000, status: "pending",   dueDate: "15/04/2026", notes: "To be split into 2 instalments" },
      { gate: 5, label: "Final Payment",            amount: 24000, status: "pending",   dueDate: "31/05/2026" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "completed", signedDate: "20/02/2026", signedBy: "Ms. Tan Wei Lin", documentRef: "DC-PRJ005.pdf" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "completed", signedDate: "25/02/2026", signedBy: "Ms. Tan Wei Lin", documentRef: "3D-R1-PRJ005.pdf" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "completed", signedDate: "27/02/2026", signedBy: "Ms. Tan Wei Lin", documentRef: "RC-PRJ005.pdf" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "in-progress", notes: "Selection meeting on 12/05/2026" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "pending" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "pending" },
    ],
  },
];

// —————————————————————————————————————————————————————————————
// Aggregation helpers — used by the Lifecycle tab + future dashboards
// —————————————————————————————————————————————————————————————

export function getLifecycle(projectId: string): ProjectLifecycle | undefined {
  return projectLifecycles.find((l) => l.projectId === projectId);
}

export function paymentSummary(lc: ProjectLifecycle) {
  const collected = lc.payments
    .filter((p) => p.status === "completed")
    .reduce((s, p) => s + p.amount, 0);
  const outstanding = lc.payments
    .filter((p) => p.status !== "completed" && p.status !== "skipped")
    .reduce((s, p) => s + p.amount, 0);
  const total = collected + outstanding;
  return { collected, outstanding, total, pct: total === 0 ? 0 : Math.round((collected / total) * 100) };
}

export function signatureSummary(lc: ProjectLifecycle) {
  const signed = lc.signatures.filter((s) => s.status === "completed").length;
  const total = lc.signatures.length;
  const pending = total - signed;
  return { signed, pending, total, pct: total === 0 ? 0 : Math.round((signed / total) * 100) };
}

/**
 * Resolve the *displayed* status for a stage given a project's currentStageId.
 * Stages before current → completed; the current stage → in-progress; after → pending.
 */
export function stageStatus(stage: LifecycleStage, currentStageId: string): CheckpointStatus {
  const cur = stageOrder(currentStageId);
  if (stage.order < cur) return "completed";
  if (stage.order === cur) return "in-progress";
  return "pending";
}
