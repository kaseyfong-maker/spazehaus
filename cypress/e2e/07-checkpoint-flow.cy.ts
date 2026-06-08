import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL FLOW — Payment collection, end to end, against the REAL local
// backend (no mocks). Starts on the Home dashboard, follows the checkpoint card
// into /checkpoints, opens a real payment, fills the Mark Collected sheet, and
// submits — then proves the mutation actually happened by reading the local DB.
//
// This complements 06-home.cy.ts (which checks the homepage surface) by proving
// the feature a homepage button leads to actually WORKS through the UI:
//   real click → real RLS (OPS tier) → real Postgres write → real audit trigger.
//
// Seed (seed.sql): PRJ001 "Tan Residence Reno" Gate ② "Design Contract Fee"
// (RM 10,500) is pending. Collecting it leaves the stage at design-contract
// (stage 9 also needs the signature — see 03-lifecycle.cy.ts for that path).
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin; // Grace Tan · principal → OPS tier, CAN collect
const FIELD = ACCOUNTS.field; // Jamie Tan · designer → FIELD tier, CANNOT collect
const GATE2 = '[data-payment-key="PRJ001-2"]';
const gate2Status = () =>
  cy.task("db:query", "select status from payment_records where project_id='PRJ001' and gate=2");

describe("Checkpoint payment-collection flow (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("collects a payment end-to-end from the homepage and persists to the DB", () => {
    // Seed precondition: Gate ② is pending in the real DB.
    gate2Status().should("eq", "pending");

    // 1) Start on the homepage, follow the checkpoint card into /checkpoints.
    cy.visit("/");
    cy.get("[data-testid=checkpoints-card]").click();
    cy.location("pathname").should("eq", "/checkpoints");

    // 2) Open the Design Contract Fee row and hit COLLECT.
    cy.get(GATE2).should("contain", "Design Contract Fee").and("contain", "10,500.00");
    cy.get(GATE2).find("[data-testid=payment-collect]").click();

    // 3) Fill the Mark Collected sheet (date is pre-filled to today) and submit.
    cy.get("[data-testid=collect-reference]").type("TXN-CY-0001");
    cy.get("[data-testid=collect-submit]").click();

    // 4) UI updates: the now-collected row drops out of the open-payments list.
    cy.get(GATE2).should("not.exist");

    // 5) The REAL DB persisted it (this is the proof it's not mock data).
    gate2Status().should("eq", "completed");
    cy.task("db:query", "select reference from payment_records where project_id='PRJ001' and gate=2")
      .should("eq", "TXN-CY-0001");

    // 6) The homepage reflects it: outstanding drops by 10,500 (348,200 → 337,700).
    cy.visit("/");
    cy.get("[data-testid=ckpt-outstanding]").should("contain.text", "337,700.00");
  });

  it("requires a reference — submitting blank does NOT collect", () => {
    cy.visit("/checkpoints");
    cy.get(GATE2).find("[data-testid=payment-collect]").click();
    // Submit with the reference left blank.
    cy.get("[data-testid=collect-submit]").click();
    // Sheet stays open (validation blocked it) and the DB is untouched.
    cy.get("[data-testid=collect-reference]").should("be.visible");
    gate2Status().should("eq", "pending");
  });

  it("a payment row links through to its project's Lifecycle tab", () => {
    cy.visit("/checkpoints");
    // Tapping the row body (not the COLLECT button) opens the project.
    cy.get(GATE2).contains("Design Contract Fee").click();
    cy.location("pathname").should("eq", "/projects/PRJ001");
    cy.location("search").should("contain", "tab=Lifecycle");
  });

  it("a FIELD user cannot collect — the COLLECT button is hidden (UI RLS gate)", () => {
    cy.loginCached(FIELD);
    cy.visit("/checkpoints");
    // The row renders (read access) but offers no COLLECT action.
    cy.get(GATE2).should("exist");
    cy.get(GATE2).find("[data-testid=payment-collect]").should("not.exist");
  });
});
