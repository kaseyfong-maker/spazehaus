import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Quotations against the REAL local backend.
//   • List renders the seed quotation and opens it.
//   • Create: the wizard performs a REAL insert (useCreateQuotation) into
//     `quotations` + `quotation_items` — verify both tables.
//   • Status: advancing draft→sent is a REAL update (useUpdateQuotationStatus).
//
// Seed: QT-2026-001 (PRJ001, draft, 3 line items). Next allocated id: QT-2026-002.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin;

describe("Quotations (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("lists the seed quotation and opens it", () => {
    cy.visit("/quotations");
    cy.get("[data-quotation-id='QT-2026-001']").should("exist").click();
    cy.location("pathname").should("eq", "/quotations/QT-2026-001");
  });

  it("creates a real quotation (+ line item) through the wizard and persists it", () => {
    cy.visit("/quotations");
    cy.get("[data-testid=new-quotation-fab]").click();
    cy.location("pathname").should("eq", "/quotations/new");

    // Step 1 — pick the project explicitly (issue date / notes are pre-filled).
    cy.get("[data-testid=cq-project]").select("PRJ001");
    cy.get("[data-testid=cq-next]").click();
    // Step 2 — fill the default line item (description is required).
    cy.get("[data-testid=cq-item-desc]").first().type("Feature wall joinery");
    cy.get("[data-testid=cq-item-price]").first().clear().type("5000");
    cy.get("[data-testid=cq-next]").click();
    // Step 3 — submit.
    cy.get("[data-testid=cq-next]").click();

    cy.location("pathname", { timeout: 15000 }).should("eq", "/quotations/QT-2026-002");

    // REAL rows in both tables.
    cy.task("db:query", "select project_id from quotations where id='QT-2026-002'").should("eq", "PRJ001");
    cy.task("db:query", "select status from quotations where id='QT-2026-002'").should("eq", "draft");
    cy.task("db:query", "select count(*) from quotation_items where quotation_id='QT-2026-002'").should("eq", "1");
    cy.task("db:query", "select description from quotation_items where quotation_id='QT-2026-002'")
      .should("eq", "Feature wall joinery");
  });

  it("advances a quotation's status (draft → sent) and persists it", () => {
    cy.visit("/quotations/QT-2026-001"); // seed status = draft
    cy.get("[data-testid=quotation-status-sent]").click();
    cy.task("db:query", "select status from quotations where id='QT-2026-001'").should("eq", "sent");
    // The 'sent' state now offers accept/reject.
    cy.get("[data-testid=quotation-status-accepted]").should("exist");
    cy.get("[data-testid=quotation-status-rejected]").should("exist");
  });
});
