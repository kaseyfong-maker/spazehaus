/*
 * SPAZEHAUS — Customer/Inquiry UI tokens
 *
 * Historically this file held the in-memory `inquiries` mock array plus the
 * `convertInquiryToProject` mutation. All of that has moved to Supabase
 * (`useInquiries`, `useInquiry`, `useConvertInquiry`) in `queries.ts`. What
 * remains here are the three palette/config objects (stage / category / tier)
 * still consumed by CustomerDatabase.tsx + CustomerDetail.tsx for badge
 * rendering, plus the `ContactLogEntry` shape (the in-app view of a single
 * contact-log row, used when iterating over `inquiry.contactLog`).
 *
 * Enum types (`InquiryStage`, `CustomerCategory`, `CustomerTier`) live in
 * `dbTypes.ts` — sourced directly from the Postgres enums.
 */

import type { InquiryStage, CustomerCategory, CustomerTier } from "./dbTypes";

export type ContactLogEntry = {
  date: string;                // DD/MM/YYYY
  type: "call" | "email" | "whatsapp" | "meet" | "site-visit";
  note: string;
  by: string;                  // staff avatar code (e.g. HL, CY, GT)
};

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
