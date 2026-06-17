import { describe, it, expect } from "vitest";
import { computeTotals, formatRM, type LineItem } from "@/lib/quotationData";

const item = (qty: number, unitPrice: number, discount = 0): LineItem => ({
  id: "x",
  area: "Living",
  description: "thing",
  category: "Material",
  qty,
  unit: "lot",
  unitPrice,
  discount,
});

describe("computeTotals", () => {
  it("is all zero for no items", () => {
    expect(computeTotals([], 0)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
  });

  it("multiplies qty × unit price", () => {
    expect(computeTotals([item(2, 100)], 0)).toEqual({ subtotal: 200, taxAmount: 0, total: 200 });
  });

  it("applies a per-line discount percentage", () => {
    // 2 × 100 × (1 − 10%) = 180
    expect(computeTotals([item(2, 100, 10)], 0).subtotal).toBe(180);
  });

  it("applies tax on the discounted subtotal", () => {
    // subtotal 180, tax 6% = 10.8, total 190.8
    const { subtotal, taxAmount, total } = computeTotals([item(2, 100, 10)], 6);
    expect(subtotal).toBe(180);
    expect(taxAmount).toBeCloseTo(10.8, 5);
    expect(total).toBeCloseTo(190.8, 5);
  });

  it("sums multiple line items", () => {
    const { subtotal } = computeTotals([item(1, 100), item(3, 50, 20)], 0);
    // 100 + (3 × 50 × 0.8 = 120) = 220
    expect(subtotal).toBe(220);
  });
});

describe("formatRM", () => {
  it("formats with RM prefix, thousands, and 2 decimals", () => {
    expect(formatRM(0)).toBe("RM 0.00");
    expect(formatRM(1234.5)).toBe("RM 1,234.50");
    expect(formatRM(348200)).toBe("RM 348,200.00");
    expect(formatRM(1000000)).toBe("RM 1,000,000.00");
  });
});
