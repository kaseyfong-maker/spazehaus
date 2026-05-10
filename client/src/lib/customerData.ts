/*
 * SPAZEHAUS CUSTOMER DATABASE
 * Source: 2026 Annual Meeting PDF — "Customer Database" pillar.
 *
 * Tracks every inquiry from first contact through:
 *   New Inquiry → Showroom Meet Up → Design Proposal Signed (= Awarded)
 * with rejected leads preserved for win-rate analysis.
 *
 * Awarded inquiries link 1:1 to projects (PRJ001..PRJ005).
 */

import { projects, type Project } from "./mockData";
import { projectLifecycles, type ProjectLifecycle } from "./lifecycleData";

export type InquiryStage = "new-inquiry" | "showroom-meet" | "awarded" | "rejected";

export type CustomerCategory = "Residential" | "Commercial" | "F&B" | "Office" | "Investor";

export type CustomerTier = "VIP" | "Repeat" | "Referral" | "Standard";

export type LeadSource =
  | "Walk-in"
  | "Referral"
  | "Website"
  | "Instagram"
  | "Facebook"
  | "Google"
  | "Property Agent"
  | "Past Client"
  | "Showroom Walk-in";

export type ContactLogEntry = {
  date: string;                // DD/MM/YYYY
  type: "call" | "email" | "whatsapp" | "meet" | "site-visit";
  note: string;
  by: string;                  // staff avatar code (e.g. HL, CY, GT)
};

export type Inquiry = {
  id: string;
  date: string;                // DD/MM/YYYY — when the inquiry was logged
  client: string;
  contact: string;
  email?: string;
  category: CustomerCategory;
  tier: CustomerTier;
  source: LeadSource;
  propertyType: string;        // Condominium, Landed, Office, F&B, etc.
  location: string;
  estimatedSize?: number;      // sqft
  estimatedBudget?: number;    // RM
  stage: InquiryStage;
  assignedTo?: string;         // staff avatar code (HL = Hong Li, CY = Chiou Ying, etc.)
  notes?: string;
  awardedProjectId?: string;
  awardedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  lastUpdated: string;
  contactLog?: ContactLogEntry[];
};

// —————————————————————————————————————————————————————————————
// Mock inquiries — 14 records covering the full funnel
// 5 awarded (linked to PRJ001..PRJ005), 4 active, 3 rejected, 2 fresh
// —————————————————————————————————————————————————————————————

export const inquiries: Inquiry[] = [
  // ——— AWARDED (linked to existing projects) ———
  {
    id: "INQ-2025-014",
    date: "10/11/2025",
    client: "Mr. & Mrs. Lim",
    contact: "+60 11-234 5678",
    email: "lim.family@gmail.com",
    category: "Residential",
    tier: "Standard",
    source: "Property Agent",
    propertyType: "Condominium",
    location: "Bukit Indah, Johor Bahru",
    estimatedSize: 1850,
    estimatedBudget: 280000,
    stage: "awarded",
    assignedTo: "HL",
    awardedProjectId: "PRJ001",
    awardedDate: "10/12/2025",
    lastUpdated: "10/12/2025",
    notes: "Wanted modern luxury aesthetic. Dark tones with warm gold accents.",
    contactLog: [
      { date: "10/11/2025", type: "call",       note: "Initial inquiry via Property Agent referral", by: "HL" },
      { date: "18/11/2025", type: "meet",       note: "Showroom visit — viewed 3 sample fit-outs",     by: "HL" },
      { date: "01/12/2025", type: "site-visit", note: "Site measurement at Paragon unit",              by: "WL" },
      { date: "10/12/2025", type: "meet",       note: "Design proposal signed · deposit collected",    by: "GT" },
    ],
  },
  {
    id: "INQ-2025-009",
    date: "20/09/2025",
    client: "TechVenture Sdn Bhd",
    contact: "+60 7-456 7890",
    email: "admin@techventure.com.my",
    category: "Commercial",
    tier: "VIP",
    source: "Referral",
    propertyType: "Office",
    location: "Eco Botanic, Iskandar Puteri",
    estimatedSize: 3200,
    estimatedBudget: 520000,
    stage: "awarded",
    assignedTo: "GT",
    awardedProjectId: "PRJ002",
    awardedDate: "01/10/2025",
    lastUpdated: "01/10/2025",
    notes: "Tech startup — wants biophilic office, smart lighting, sit-stand desks.",
    contactLog: [
      { date: "20/09/2025", type: "email", note: "Inbound enquiry referred by ex-client (Saveur Group)", by: "GT" },
      { date: "25/09/2025", type: "meet",  note: "Showroom + portfolio review",                            by: "GT" },
      { date: "01/10/2025", type: "meet",  note: "Design proposal signed",                                 by: "GT" },
    ],
  },
  {
    id: "INQ-2025-026",
    date: "15/12/2025",
    client: "Dato' Ahmad Razif",
    contact: "+60 12-678 9012",
    email: "dato.razif@gmail.com",
    category: "Residential",
    tier: "VIP",
    source: "Referral",
    propertyType: "Landed",
    location: "Setia Indah, Johor Bahru",
    estimatedSize: 4200,
    estimatedBudget: 650000,
    stage: "awarded",
    assignedTo: "GT",
    awardedProjectId: "PRJ003",
    awardedDate: "08/02/2026",
    lastUpdated: "08/02/2026",
    notes: "Luxury landed home. Prefers blend of contemporary + traditional Malaysian.",
    contactLog: [
      { date: "15/12/2025", type: "call", note: "Referred by Dato's neighbour (past client)",        by: "HL" },
      { date: "22/12/2025", type: "meet", note: "Private showroom session — VIP treatment",           by: "GT" },
      { date: "15/01/2026", type: "site-visit", note: "Initial site walkthrough",                    by: "GT" },
      { date: "08/02/2026", type: "meet", note: "Design contract signed",                              by: "GT" },
    ],
  },
  {
    id: "INQ-2025-018",
    date: "01/11/2025",
    client: "Saveur Group",
    contact: "+60 7-890 1234",
    email: "ops@saveurgroup.com",
    category: "F&B",
    tier: "Repeat",
    source: "Past Client",
    propertyType: "F&B",
    location: "Paradigm Mall, Johor Bahru",
    estimatedSize: 1200,
    estimatedBudget: 380000,
    stage: "awarded",
    assignedTo: "GT",
    awardedProjectId: "PRJ004",
    awardedDate: "05/12/2025",
    lastUpdated: "05/12/2025",
    notes: "3rd outlet with Spazehaus. Japanese-inspired minimalist, warm timber + stone.",
    contactLog: [
      { date: "01/11/2025", type: "whatsapp", note: "Repeat client — direct WhatsApp to GT",  by: "GT" },
      { date: "10/11/2025", type: "meet",     note: "Concept presentation",                    by: "GT" },
      { date: "05/12/2025", type: "meet",     note: "Design contract signed",                  by: "GT" },
    ],
  },
  {
    id: "INQ-2026-002",
    date: "05/01/2026",
    client: "Ms. Tan Wei Lin",
    contact: "+60 16-345 6789",
    email: "tanweilin@gmail.com",
    category: "Residential",
    tier: "Standard",
    source: "Instagram",
    propertyType: "Condominium",
    location: "Austin Heights, Johor Bahru",
    estimatedSize: 980,
    estimatedBudget: 120000,
    stage: "awarded",
    assignedTo: "CY",
    awardedProjectId: "PRJ005",
    awardedDate: "20/02/2026",
    lastUpdated: "20/02/2026",
    notes: "First-home buyer. Followed Spazehaus on IG. Compact studio renovation.",
    contactLog: [
      { date: "05/01/2026", type: "email", note: "DM via Instagram",                                  by: "CY" },
      { date: "12/01/2026", type: "meet",  note: "Showroom walk-in",                                  by: "CY" },
      { date: "10/02/2026", type: "site-visit", note: "Site measurement",                             by: "DC" },
      { date: "20/02/2026", type: "meet",  note: "Design contract signed",                            by: "CY" },
    ],
  },

  // ——— ACTIVE PIPELINE ———
  {
    id: "INQ-2026-008",
    date: "12/04/2026",
    client: "Mr. Faizal Hassan",
    contact: "+60 13-456 7890",
    email: "faizal.h@outlook.com",
    category: "Residential",
    tier: "Standard",
    source: "Walk-in",
    propertyType: "Condominium",
    location: "Iskandar Residences, Iskandar Puteri",
    estimatedSize: 1420,
    estimatedBudget: 180000,
    stage: "showroom-meet",
    assignedTo: "HL",
    notes: "Newly married couple. Comparing 2 firms. Likes minimalist Scandinavian style.",
    lastUpdated: "28/04/2026",
    contactLog: [
      { date: "12/04/2026", type: "meet",   note: "Walked in to showroom — mood-board chat",       by: "HL" },
      { date: "20/04/2026", type: "call",   note: "Follow-up call · confirmed next meeting",       by: "HL" },
      { date: "28/04/2026", type: "meet",   note: "2nd showroom visit with spouse · positive",     by: "HL" },
    ],
  },
  {
    id: "INQ-2026-010",
    date: "20/04/2026",
    client: "Bean & Brew Café",
    contact: "+60 17-234 5678",
    email: "hello@beanandbrew.my",
    category: "F&B",
    tier: "Standard",
    source: "Instagram",
    propertyType: "F&B",
    location: "Mount Austin, Johor Bahru",
    estimatedSize: 850,
    estimatedBudget: 220000,
    stage: "showroom-meet",
    assignedTo: "CY",
    notes: "Boutique cafe chain expansion. 3rd outlet. Wants industrial/Japandi blend.",
    lastUpdated: "05/05/2026",
    contactLog: [
      { date: "20/04/2026", type: "email", note: "IG inbox enquiry · auto-routed to CY",            by: "CY" },
      { date: "28/04/2026", type: "meet",  note: "Showroom + sample fit-out tour",                  by: "CY" },
      { date: "05/05/2026", type: "site-visit", note: "Site visit at Mount Austin shop lot",        by: "CY" },
    ],
  },
  {
    id: "INQ-2026-012",
    date: "02/05/2026",
    client: "Cheong Family",
    contact: "+60 19-876 5432",
    email: "lily.cheong@gmail.com",
    category: "Residential",
    tier: "Referral",
    source: "Referral",
    propertyType: "Landed",
    location: "Setia Tropika, Johor Bahru",
    estimatedSize: 3800,
    estimatedBudget: 580000,
    stage: "showroom-meet",
    assignedTo: "GT",
    notes: "Referred by Dato' Ahmad Razif (PRJ003). Family of 5. Multi-generational living.",
    lastUpdated: "08/05/2026",
    contactLog: [
      { date: "02/05/2026", type: "call",  note: "Inbound referral call from Dato' Ahmad",          by: "HL" },
      { date: "08/05/2026", type: "meet",  note: "VIP showroom session with GT · very engaged",     by: "GT" },
    ],
  },
  {
    id: "INQ-2026-013",
    date: "06/05/2026",
    client: "Pixel Studio Sdn Bhd",
    contact: "+60 12-345 9876",
    email: "admin@pixelstudio.my",
    category: "Office",
    tier: "Standard",
    source: "Google",
    propertyType: "Office",
    location: "JB CBD (Jalan Wong Ah Fook)",
    estimatedSize: 1100,
    estimatedBudget: 160000,
    stage: "new-inquiry",
    assignedTo: "CY",
    notes: "Small design agency, 8-person team. Wants productive open-plan.",
    lastUpdated: "08/05/2026",
    contactLog: [
      { date: "06/05/2026", type: "email", note: "Web form submission via Google ad",                 by: "CY" },
      { date: "08/05/2026", type: "call",  note: "Qualifier call · scheduled showroom for next week", by: "CY" },
    ],
  },
  {
    id: "INQ-2026-014",
    date: "08/05/2026",
    client: "Dr. Rachel Goh",
    contact: "+60 14-789 1234",
    email: "rachel.goh.dr@gmail.com",
    category: "Residential",
    tier: "Standard",
    source: "Instagram",
    propertyType: "Condominium",
    location: "Country Garden Danga Bay",
    estimatedSize: 1650,
    estimatedBudget: 240000,
    stage: "new-inquiry",
    assignedTo: "HL",
    notes: "Dentist — high-end finishes important. Saw a reel about PRJ001.",
    lastUpdated: "09/05/2026",
    contactLog: [
      { date: "08/05/2026", type: "email", note: "DM via Instagram — interested in Paragon-style finish", by: "HL" },
      { date: "09/05/2026", type: "whatsapp", note: "Sent portfolio PDF · awaiting reply",                by: "HL" },
    ],
  },

  // ——— REJECTED ———
  {
    id: "INQ-2025-019",
    date: "12/11/2025",
    client: "Ms. Zara Ibrahim",
    contact: "+60 18-123 4567",
    email: "zara.ibrahim@yahoo.com",
    category: "Residential",
    tier: "Standard",
    source: "Walk-in",
    propertyType: "Condominium",
    location: "Sutera Utama, Johor Bahru",
    estimatedSize: 1100,
    estimatedBudget: 80000,
    stage: "rejected",
    assignedTo: "CY",
    rejectedDate: "08/12/2025",
    rejectionReason: "Budget mismatch — went with cheaper local contractor",
    notes: "Came in with RM80k budget for a 1,100 sqft full reno. Educated her on realistic costing.",
    lastUpdated: "08/12/2025",
    contactLog: [
      { date: "12/11/2025", type: "meet",     note: "Showroom walk-in",                                  by: "CY" },
      { date: "20/11/2025", type: "email",    note: "Quotation sent · est. RM 145,000",                  by: "CY" },
      { date: "08/12/2025", type: "whatsapp", note: "Decided to engage another contractor",              by: "CY" },
    ],
  },
  {
    id: "INQ-2026-001",
    date: "03/01/2026",
    client: "Horizon Logistics Sdn Bhd",
    contact: "+60 7-321 4567",
    email: "facilities@horizonlogistics.com.my",
    category: "Commercial",
    tier: "Standard",
    source: "Website",
    propertyType: "Office",
    location: "Senai Airport City",
    estimatedSize: 4500,
    estimatedBudget: 320000,
    stage: "rejected",
    assignedTo: "GT",
    rejectedDate: "20/02/2026",
    rejectionReason: "Project shelved — parent company restructure",
    notes: "Promising lead but they shelved the office relocation entirely.",
    lastUpdated: "20/02/2026",
    contactLog: [
      { date: "03/01/2026", type: "email", note: "Web form · scoping a 4,500 sqft fit-out",                  by: "GT" },
      { date: "10/01/2026", type: "meet",  note: "Showroom + concept review",                                by: "GT" },
      { date: "25/01/2026", type: "meet",  note: "Quotation pitched, RM 380k",                               by: "GT" },
      { date: "20/02/2026", type: "email", note: "Project shelved — group restructure paused all capex",    by: "GT" },
    ],
  },
  {
    id: "INQ-2026-006",
    date: "20/03/2026",
    client: "Ms. Vivien Ng",
    contact: "+60 11-987 6543",
    category: "Residential",
    tier: "Standard",
    source: "Facebook",
    propertyType: "Condominium",
    location: "Skudai, Johor Bahru",
    estimatedSize: 950,
    estimatedBudget: 95000,
    stage: "rejected",
    assignedTo: "CY",
    rejectedDate: "10/04/2026",
    rejectionReason: "Went silent after 2nd follow-up · presumed lost",
    notes: "FB ad lead. Lost interest after seeing quotation.",
    lastUpdated: "10/04/2026",
    contactLog: [
      { date: "20/03/2026", type: "call",     note: "Inbound from FB ad",                                  by: "CY" },
      { date: "28/03/2026", type: "meet",     note: "Showroom walk-in · seemed engaged",                   by: "CY" },
      { date: "01/04/2026", type: "email",    note: "Quotation sent",                                       by: "CY" },
      { date: "06/04/2026", type: "whatsapp", note: "Follow-up — no reply",                                by: "CY" },
      { date: "10/04/2026", type: "whatsapp", note: "2nd follow-up — no reply · marked lost",              by: "CY" },
    ],
  },
];

// —————————————————————————————————————————————————————————————
// Stage / category / tier visual config (matches existing palette)
// —————————————————————————————————————————————————————————————

export const stageConfig: Record<InquiryStage, { label: string; color: string; bg: string; border: string; order: number }> = {
  "new-inquiry":   { label: "New Inquiry",     color: "oklch(0.45 0.10 55)",  bg: "oklch(0.65 0.10 55 / 12%)",  border: "oklch(0.65 0.10 55 / 25%)",  order: 1 },
  "showroom-meet": { label: "Showroom Meet",   color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)",  border: "oklch(0.62 0.09 68 / 25%)",  order: 2 },
  "awarded":       { label: "Awarded",         color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)", border: "oklch(0.55 0.09 145 / 25%)", order: 3 },
  "rejected":      { label: "Rejected",        color: "oklch(0.50 0.12 25)",  bg: "oklch(0.60 0.12 25 / 12%)",  border: "oklch(0.60 0.12 25 / 25%)",  order: 4 },
};

export const categoryConfig: Record<CustomerCategory, { color: string; bg: string }> = {
  Residential: { color: "oklch(0.42 0.09 68)",  bg: "oklch(0.62 0.09 68 / 12%)" },
  Commercial:  { color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 12%)" },
  "F&B":       { color: "oklch(0.50 0.10 25)",  bg: "oklch(0.60 0.10 25 / 12%)" },
  Office:      { color: "oklch(0.45 0.10 55)",  bg: "oklch(0.65 0.10 55 / 12%)" },
  Investor:    { color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)" },
};

export const tierConfig: Record<CustomerTier, { color: string; bg: string }> = {
  VIP:      { color: "oklch(0.50 0.10 25)",  bg: "oklch(0.60 0.10 25 / 12%)" },
  Repeat:   { color: "oklch(0.38 0.09 145)", bg: "oklch(0.55 0.09 145 / 12%)" },
  Referral: { color: "oklch(0.38 0.09 240)", bg: "oklch(0.55 0.09 240 / 12%)" },
  Standard: { color: "oklch(0.55 0.006 80)", bg: "oklch(0.55 0.006 80 / 12%)" },
};

// —————————————————————————————————————————————————————————————
// Lookups + aggregations
// —————————————————————————————————————————————————————————————

export function getInquiry(id: string): Inquiry | undefined {
  return inquiries.find((i) => i.id === id);
}

export function getInquiryByProjectId(projectId: string): Inquiry | undefined {
  return inquiries.find((i) => i.awardedProjectId === projectId);
}

export type CustomerSummary = {
  total: number;
  newInquiry: number;
  showroomMeet: number;
  awarded: number;
  rejected: number;
  active: number;             // newInquiry + showroomMeet
  closedTotal: number;        // awarded + rejected
  winRate: number;            // awarded / closedTotal · 0..1
  pipelineRM: number;         // sum of estimated budgets in active pipeline
  awardedRM: number;          // sum of estimated budgets awarded
};

export function customerSummary(): CustomerSummary {
  const newInquiry = inquiries.filter((i) => i.stage === "new-inquiry").length;
  const showroomMeet = inquiries.filter((i) => i.stage === "showroom-meet").length;
  const awarded = inquiries.filter((i) => i.stage === "awarded").length;
  const rejected = inquiries.filter((i) => i.stage === "rejected").length;
  const active = newInquiry + showroomMeet;
  const closedTotal = awarded + rejected;
  const winRate = closedTotal === 0 ? 0 : awarded / closedTotal;

  const pipelineRM = inquiries
    .filter((i) => i.stage === "new-inquiry" || i.stage === "showroom-meet")
    .reduce((s, i) => s + (i.estimatedBudget ?? 0), 0);
  const awardedRM = inquiries
    .filter((i) => i.stage === "awarded")
    .reduce((s, i) => s + (i.estimatedBudget ?? 0), 0);

  return { total: inquiries.length, newInquiry, showroomMeet, awarded, rejected, active, closedTotal, winRate, pipelineRM, awardedRM };
}

/** Counts by category — used by category-breakdown chart on the customer dashboard. */
export function countsByCategory(): Record<CustomerCategory, number> {
  const out = { Residential: 0, Commercial: 0, "F&B": 0, Office: 0, Investor: 0 } as Record<CustomerCategory, number>;
  for (const i of inquiries) out[i.category] += 1;
  return out;
}

/** Counts by lead source — useful for "where do our deals come from?" reporting. */
export function countsBySource(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of inquiries) out[i.source] = (out[i.source] ?? 0) + 1;
  return out;
}

// —————————————————————————————————————————————————————————————
// CONVERT INQUIRY → PROJECT
// Mutates in-memory state so the new project shows up in /projects,
// the lifecycle engine, and the inquiry flips to "awarded".
// In a real backend this would be a transactional API call.
// —————————————————————————————————————————————————————————————

export type ConvertInquiryInput = {
  projectName: string;
  designerName: string;           // resolved staff name (matches existing Project.designer)
  pmName: string;                 // resolved staff name
  team: string[];                 // staff avatar codes (e.g. ["WL", "WH"])
  startDate: string;              // DD/MM/YYYY
  targetDate: string;             // DD/MM/YYYY
  budget: number;                 // RM (final, may differ from estimatedBudget)
  priority: "high" | "medium" | "low";
  areas: string[];
  proposalDeposit: number;        // RM (gate ① collected today)
};

export type ConvertInquiryResult = {
  ok: true;
  newProjectId: string;
} | {
  ok: false;
  reason: string;
};

/** Today as DD/MM/YYYY. */
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Map customer category → project "type" field. Anything non-residential is grouped as Commercial. */
function categoryToType(category: CustomerCategory): string {
  return category === "Residential" ? "Residential" : "Commercial";
}

/** Generate the next sequential PRJ ID (PRJ001, PRJ002, …). */
export function nextProjectId(): string {
  const max = projects.reduce((m, p) => {
    const num = parseInt(p.id.replace(/^PRJ/, ""), 10);
    return Number.isFinite(num) ? Math.max(m, num) : m;
  }, 0);
  return `PRJ${String(max + 1).padStart(3, "0")}`;
}

/**
 * Convert an inquiry into a real project.
 * - Pushes a new Project to `projects`
 * - Pushes a new ProjectLifecycle to `projectLifecycles` at stage 4 (design-prop-signed),
 *   with gate ① Proposal Deposit immediately marked as collected
 * - Mutates the inquiry: stage → "awarded", awardedProjectId set, contact log entry appended
 *
 * Returns { ok: true, newProjectId } or { ok: false, reason }.
 */
export function convertInquiryToProject(
  inquiryId: string,
  input: ConvertInquiryInput
): ConvertInquiryResult {
  const inq = inquiries.find((i) => i.id === inquiryId);
  if (!inq) return { ok: false, reason: "Inquiry not found." };
  if (inq.stage === "awarded") return { ok: false, reason: "Inquiry is already awarded." };
  if (inq.stage === "rejected") return { ok: false, reason: "Cannot convert a rejected inquiry. Reopen it first." };

  const today = todayStr();
  const newId = nextProjectId();

  const newProject: Project = {
    id: newId,
    name: input.projectName,
    client: inq.client,
    clientContact: inq.contact,
    type: categoryToType(inq.category),
    propertyType: inq.propertyType,
    location: inq.location,
    size: inq.estimatedSize ?? 1000,
    budget: input.budget,
    startDate: input.startDate,
    targetDate: input.targetDate,
    status: "assigned",
    priority: input.priority,
    progress: 0,
    designer: input.designerName,
    pm: input.pmName,
    team: input.team,
    photoCount: 0,
    taskCount: 0,
    tasksCompleted: 0,
    areas: input.areas,
    description: `Converted from inquiry ${inq.id} on ${today}.`,
  };
  projects.push(newProject);

  // —— Payment allocation ——
  // Budget = total package. Carve out deposit + design fee, then split the
  // remaining renovation portion 50% / 30% / 20% across gates 3-5.
  // Gate 5 is computed by subtraction so the four gates always sum to renoTotal exactly.
  const designFee = Math.round(input.budget * 0.07);
  const renoTotal = Math.max(0, input.budget - input.proposalDeposit - designFee);
  const renoDeposit = Math.round(renoTotal * 0.5);
  const progressive = Math.round(renoTotal * 0.3);
  const finalPay = renoTotal - renoDeposit - progressive; // closes the rounding gap

  // Initialise the project lifecycle at stage 4 (design-prop-signed) with gate ① collected.
  const newLifecycle: ProjectLifecycle = {
    projectId: newId,
    currentStageId: "design-prop-signed",
    startedAt: today,
    payments: [
      { gate: 1, label: "Proposal Deposit",         amount: input.proposalDeposit, status: "completed", collectedDate: today, reference: `PD-${today.slice(6)}-NEW` },
      { gate: 2, label: "Design Contract Fee",      amount: designFee,             status: "pending" },
      { gate: 3, label: "Renovation Deposit (50%)", amount: renoDeposit,           status: "pending" },
      { gate: 4, label: "Progressive Payment",      amount: progressive,           status: "pending", notes: "To be split into instalments" },
      { gate: 5, label: "Final Payment",            amount: finalPay,              status: "pending" },
    ],
    signatures: [
      { key: "design-contract",     label: "Design Contract",          group: "contract", status: "pending" },
      { key: "revised-3d",          label: "Revised 3D Drawing",       group: "drawing",  status: "pending" },
      { key: "renovation-contract", label: "Renovation Contract",      group: "contract", status: "pending" },
      { key: "material-selection",  label: "Material Selection",       group: "drawing",  status: "pending" },
      { key: "2d-shopping",         label: "2D Drawing / Shopping List",group: "drawing", status: "pending" },
      { key: "handover",            label: "Handover Acceptance",      group: "contract", status: "pending" },
    ],
  };
  projectLifecycles.push(newLifecycle);

  // Flip the inquiry to awarded
  inq.stage = "awarded";
  inq.awardedProjectId = newId;
  inq.awardedDate = today;
  inq.lastUpdated = today;
  if (!inq.contactLog) inq.contactLog = [];
  inq.contactLog.push({
    date: today,
    type: "meet",
    note: `Design proposal signed · converted to project ${newId} (RM ${input.budget.toLocaleString("en-MY")})`,
    by: inq.assignedTo ?? "GT",
  });

  return { ok: true, newProjectId: newId };
}
