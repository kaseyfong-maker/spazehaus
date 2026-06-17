import { describe, it, expect, vi } from "vitest";

// queries.ts imports the real Supabase client at module load (which throws on
// missing env). The pure helpers under test never call it, so stub the module.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import {
  canEditPayments,
  canViewAuditLog,
  canEditStaffRow,
  computeCheckpointSummary,
  computeCustomerSummary,
  deriveAvatarCode,
} from "@/lib/queries";

type Role = Parameters<typeof canEditPayments>[0];
const OPS: Role[] = ["principal", "admin", "admin_exec", "pm", "site_supervisor"];
const FIELD: Role[] = ["designer", "sales"];
const ADMIN_TIER: Role[] = ["principal", "admin", "admin_exec"];

describe("role gates", () => {
  it("canEditPayments = OPS tier only", () => {
    OPS.forEach((r) => expect(canEditPayments(r), `${r}`).toBe(true));
    FIELD.forEach((r) => expect(canEditPayments(r), `${r}`).toBe(false));
    expect(canEditPayments(null)).toBe(false);
    expect(canEditPayments(undefined)).toBe(false);
  });

  it("canViewAuditLog = admin tier only", () => {
    ADMIN_TIER.forEach((r) => expect(canViewAuditLog(r), `${r}`).toBe(true));
    (["pm", "site_supervisor", "designer", "sales"] as Role[]).forEach((r) =>
      expect(canViewAuditLog(r), `${r}`).toBe(false),
    );
    expect(canViewAuditLog(null)).toBe(false);
  });

  it("canEditStaffRow = admin tier OR own row", () => {
    expect(canEditStaffRow("admin", false)).toBe(true); // admin, any row
    expect(canEditStaffRow("designer", false)).toBe(false); // field, other's row
    expect(canEditStaffRow("designer", true)).toBe(true); // field, own row
    expect(canEditStaffRow(null, true)).toBe(true); // own row even with no role
    expect(canEditStaffRow(null, false)).toBe(false);
  });
});

describe("deriveAvatarCode", () => {
  it("uses first letters of the first two words", () => {
    expect(deriveAvatarCode("Grace Tan")).toBe("GT");
    expect(deriveAvatarCode("Jordan Teh")).toBe("JT");
    expect(deriveAvatarCode("  spaced   out ")).toBe("SO");
  });
  it("falls back to the first two letters for a single word", () => {
    expect(deriveAvatarCode("Madonna")).toBe("MA");
    expect(deriveAvatarCode("x")).toBe("X");
  });
});

describe("computeCheckpointSummary", () => {
  const TODAY = new Date(2026, 5, 8);
  const pay = (amount: number, dueDate?: string) => ({ amount, dueDate }) as any;
  const sig = (group: "contract" | "drawing") => ({ group }) as any;

  it("aggregates outstanding, overdue, this-week, and pending signatures", () => {
    const s = computeCheckpointSummary(
      [pay(1000, "01/06/2026"), pay(500, "10/06/2026"), pay(200, undefined)], // overdue, this-week, no-date
      [sig("contract"), sig("contract"), sig("drawing")],
      TODAY,
    );
    expect(s.outstandingRM).toBe(1700);
    expect(s.overdueCount).toBe(1);
    expect(s.overdueRM).toBe(1000);
    expect(s.thisWeekCount).toBe(1);
    expect(s.pendingSignsCount).toBe(3);
    expect(s.pendingContractsCount).toBe(2);
    expect(s.pendingDrawingsCount).toBe(1);
    expect(s.paymentsCount).toBe(3);
  });
});

describe("computeCustomerSummary", () => {
  it("counts by stage, win rate, and RM totals", () => {
    const s = computeCustomerSummary([
      { stage: "new-inquiry", estimated_budget: 100000 },
      { stage: "showroom-meet", estimated_budget: 50000 },
      { stage: "awarded", estimated_budget: 200000 },
      { stage: "rejected", estimated_budget: 0 },
    ] as any);
    expect(s.total).toBe(4);
    expect(s.active).toBe(2); // new + showroom
    expect(s.closedTotal).toBe(2); // awarded + rejected
    expect(s.winRate).toBe(0.5); // 1 awarded / 2 closed
    expect(s.pipelineRM).toBe(150000); // new + showroom budgets
    expect(s.awardedRM).toBe(200000);
  });
});
