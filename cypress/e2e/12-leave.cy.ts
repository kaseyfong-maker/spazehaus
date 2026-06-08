import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Leave management, against the REAL local backend.
//   • Apply: real insert (useApplyLeave) → new pending `leave_requests` row.
//   • Approve: real update (useUpdateLeaveStatus) → status flips to approved.
//
// Seed: LR001 (SH005, pending) + LR002 (SH005, approved). Admin (SH001) has none.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin; // principal · SH001

describe("Leave management (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("applies for leave and persists a pending request", () => {
    cy.task("db:query", "select count(*) from leave_requests where staff_id='SH001'").should("eq", "0");

    cy.visit("/company/leave");
    cy.get("[data-testid=leave-tab-apply-leave]").click();
    cy.get("[data-testid=leave-start]").type("15/07/2026");
    cy.get("[data-testid=leave-end]").type("17/07/2026");
    cy.get("[data-testid=leave-submit]").click();

    // Mutation resolved (toast) → then verify the real row.
    cy.contains(/leave application submitted/i).should("be.visible");
    cy.task("db:query", "select count(*) from leave_requests where staff_id='SH001' and status='pending'")
      .should("eq", "1");
  });

  it("approves a pending request and persists the status", () => {
    cy.visit("/company/leave"); // opens on the Pending tab
    cy.get("[data-leave-id=LR001]").should("exist");
    cy.get("[data-testid=leave-approve][data-leave-id=LR001]").click();

    // The approved row leaves the pending list, and the DB reflects it.
    cy.get("[data-leave-id=LR001]").should("not.exist");
    cy.task("db:query", "select status from leave_requests where id='LR001'").should("eq", "approved");
    cy.task("db:query", "select approved_by_id from leave_requests where id='LR001'").should("eq", "SH001");
  });

  it("rejects a pending request and persists the status", () => {
    cy.visit("/company/leave");
    cy.get("[data-testid=leave-reject][data-leave-id=LR001]").click();
    cy.get("[data-leave-id=LR001]").should("not.exist");
    cy.task("db:query", "select status from leave_requests where id='LR001'").should("eq", "rejected");
  });
});
