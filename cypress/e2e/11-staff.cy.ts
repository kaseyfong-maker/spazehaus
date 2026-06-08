import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Staff directory + create, against the REAL local backend.
//   • Directory renders the 7 seed staff and opens a profile.
//   • Create: real insert (useCreateStaff) → new SH### row in `staff`.
//   • Permission: only the ADMIN tier may add staff (FAB hidden + page bounces +
//     server-side staff_write_admin RLS).
//
// Seed: SH001..SH007. Next allocated id is SH008.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin; // principal → ADMIN tier
const FIELD = ACCOUNTS.field;  // designer → FIELD tier

describe("Staff pages (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("lists the seed staff and opens a profile", () => {
    cy.visit("/company/staff");
    cy.get("[data-testid=staff-card]").should("have.length", 7);
    cy.get("[data-staff-id=SH001]").should("contain", "Grace Tan").click();
    cy.location("pathname").should("eq", "/company/staff/SH001");
  });

  it("creates a real staff member and persists it", () => {
    cy.visit("/company/staff");
    cy.get("[data-testid=add-staff-fab]").click();
    cy.location("pathname").should("eq", "/company/staff/new");

    cy.get("[data-testid=cs-name]").type("Cypress Tester");
    cy.get("[data-testid=cs-email]").type("cypress.tester@spazehaus.test");
    cy.get("[data-testid=cs-job]").type("QA Engineer");
    cy.get("[data-testid=cs-role]").select("designer");
    cy.get("[data-testid=cs-join]").type("2026-06-08");
    cy.get("[data-testid=cs-submit]").click();

    // Lands on the new profile (SH008 = next sequential id).
    cy.location("pathname", { timeout: 15000 }).should("eq", "/company/staff/SH008");

    // Real DB row.
    cy.task("db:query", "select name from staff where id='SH008'").should("eq", "Cypress Tester");
    cy.task("db:query", "select email from staff where id='SH008'").should("eq", "cypress.tester@spazehaus.test");
    cy.task("db:query", "select role from staff where id='SH008'").should("eq", "designer");
    cy.task("db:query", "select count(*) from staff").should("eq", "8");
  });

  it("a FIELD user cannot add staff (no Add Staff button)", () => {
    cy.loginCached(FIELD);
    cy.visit("/company/staff");
    cy.get("[data-testid=staff-card]").should("exist"); // read access
    cy.get("[data-testid=add-staff-fab]").should("not.exist");
  });

  it("a FIELD user is bounced from the create-staff page", () => {
    cy.loginCached(FIELD);
    cy.visit("/company/staff/new");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/company/staff");
    cy.task("db:query", "select count(*) from staff").should("eq", "7"); // nothing created
  });
});
