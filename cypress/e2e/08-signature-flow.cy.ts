import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL FLOW — Document signing, end to end, against the REAL local backend.
// Uploads a real PDF to local Supabase Storage (signature-docs bucket), marks the
// signature completed through the UI, and verifies the real signature_records row.
// Also proves the SOP engine: signing the design contract AFTER Gate ② is
// collected auto-advances the project past stage 9 (dual gate).
//
// Seed (seed.sql): PRJ001 "design-contract" signature (label "Design Contract",
// group contract) is pending; PRJ001 is parked at stage 9 ("design-contract").
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin; // principal → OPS tier, CAN sign
const FIELD = ACCOUNTS.field;  // designer → FIELD tier, CANNOT sign
const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");
const DC = '[data-signature-key="PRJ001-design-contract"]';
const PDF = "cypress/fixtures/sample-contract.pdf";

const dcStatus = () =>
  cy.task("db:query", "select status from signature_records where project_id='PRJ001' and signature_key='design-contract'");
const prj001Stage = () =>
  cy.task("db:query", "select current_stage_id from projects where id='PRJ001'");

const openDocumentsTab = () => {
  cy.visit("/checkpoints");
  cy.get("[data-testid=checkpoints-tab-documents]").click();
};

describe("Document-signature flow (real local backend + storage)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("signs a document end-to-end (PDF upload + mark signed) and persists to the DB", () => {
    dcStatus().should("eq", "pending");

    openDocumentsTab();
    cy.get(DC).should("contain", "Design Contract").find("[data-testid=signature-sign]").click();

    // Upload the PDF (hidden input → force), fill signatory (date is pre-filled, markSigned on by default).
    cy.get("[data-testid=sign-file]").selectFile(PDF, { force: true });
    cy.get("[data-testid=sign-by]").clear().type("Mr. & Mrs. Tan");
    cy.get("[data-testid=sign-submit]").click();

    // Row drops out of the open-signatures list once completed.
    cy.get(DC, { timeout: 15000 }).should("not.exist");

    // The REAL DB persisted it: status completed, signatory recorded, a document stored.
    dcStatus().should("eq", "completed");
    cy.task("db:query", "select signed_by from signature_records where project_id='PRJ001' and signature_key='design-contract'")
      .should("eq", "Mr. & Mrs. Tan");
    cy.task("db:query", "select case when document_ref is null then 'null' else 'set' end from signature_records where project_id='PRJ001' and signature_key='design-contract'")
      .should("eq", "set");
  });

  it("signing the design contract after Gate ② is collected advances the project (SOP engine via UI)", () => {
    // Pre-collect Gate ② via the API so only the signature is missing from stage 9's dual gate.
    cy.token(ACCOUNTS.ops).then((tok) => {
      cy.request({
        method: "PATCH",
        url: `${URL}/rest/v1/payment_records?project_id=eq.PRJ001&gate=eq.2`,
        headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: { status: "completed", collected_date: "2026-06-08" },
      }).its("status").should("be.oneOf", [200, 204]);
    });
    prj001Stage().should("eq", "design-contract"); // not advanced yet — needs the signature

    // Sign the design contract through the UI.
    openDocumentsTab();
    cy.get(DC).find("[data-testid=signature-sign]").click();
    cy.get("[data-testid=sign-file]").selectFile(PDF, { force: true });
    cy.get("[data-testid=sign-by]").clear().type("Mr. & Mrs. Tan");
    cy.get("[data-testid=sign-submit]").click();
    cy.get(DC, { timeout: 15000 }).should("not.exist");

    // The real trigger advanced PRJ001 past stage 9.
    dcStatus().should("eq", "completed");
    prj001Stage().should("not.eq", "design-contract");
  });

  it("requires a file — submitting with no upload does NOT sign", () => {
    openDocumentsTab();
    cy.get(DC).find("[data-testid=signature-sign]").click();
    // Submit with no file picked.
    cy.get("[data-testid=sign-submit]").click();
    // Sheet stays open and the DB is untouched.
    cy.get("[data-testid=sign-submit]").should("be.visible");
    dcStatus().should("eq", "pending");
  });

  it("a FIELD user cannot sign — the SIGN button is hidden (UI RLS gate)", () => {
    cy.loginCached(FIELD);
    openDocumentsTab();
    cy.get(DC).should("exist");
    cy.get(DC).find("[data-testid=signature-sign]").should("not.exist");
  });
});
