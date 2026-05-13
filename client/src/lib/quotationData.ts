/*
 * SPAZEHAUS — Quotation/Invoice UI tokens + math helpers
 *
 * Historically this file held an in-memory `quotations` mock array plus the
 * `Quotation` shape type. Both have been removed — the live `QuotationWithItems`
 * type lives in `queries.ts` (sourced directly from Supabase), and the PDF
 * generator now takes that type as input. What remains here are the
 * `LineItem` shape used by the quotation create/edit form, the `statusConfig`
 * + `categoryColors` palettes still consumed by QuotationList/QuotationDetail/
 * CreateQuotation/ProjectDetail, and the pure `computeTotals` + `formatRM`
 * math helpers used everywhere quotation totals are rendered.
 */

export type LineItem = {
  id: string;
  area: string;
  description: string;
  category: "Design" | "Material" | "Labour" | "Furniture" | "Electrical" | "Plumbing" | "Others";
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number; // percentage
};

export const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: "Draft", bg: "oklch(0.55 0.006 80 / 15%)", color: "oklch(0.65 0.006 80)", border: "oklch(0.55 0.006 80 / 25%)" },
  sent: { label: "Sent", bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.70 0.09 240 / 25%)" },
  accepted: { label: "Accepted", bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 25%)" },
  rejected: { label: "Rejected", bg: "oklch(0.58 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 25%)" },
  invoiced: { label: "Invoiced", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  paid: { label: "Paid", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
};

export const categoryColors: Record<string, string> = {
  Design: "oklch(0.72 0.09 68)",
  Material: "oklch(0.70 0.09 240)",
  Labour: "oklch(0.80 0.12 68)",
  Furniture: "oklch(0.60 0.07 145)",
  Electrical: "oklch(0.68 0.12 25)",
  Plumbing: "oklch(0.58 0.12 25)",
  Others: "oklch(0.55 0.006 80)",
};

// Utility: compute totals
export function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.qty * item.unitPrice * (1 - item.discount / 100);
    return sum + lineTotal;
  }, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export function formatRM(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
