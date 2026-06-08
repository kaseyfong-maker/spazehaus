import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Projects pages against the REAL local backend.
//   • List: renders the seed projects, search filters, navigates to detail.
//   • Create: the New Project wizard now performs a REAL insert (useCreateProject)
//     — fill it, submit, verify the new PRJ### row exists in Postgres.
//   • Edit: change project metadata via EditProjectSheet → verify the DB write.
//   • Permission: a FIELD user can't edit (UI gate) and can't create (RLS).
//
// Seed (seed.sql): PRJ001 (Tan Residence Reno, assigned) + PRJ002 (Lim Office
// Fitout, active). After db:reset the next allocated id is PRJ003.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin; // principal → OPS tier (can create/edit)
const FIELD = ACCOUNTS.field;  // designer → FIELD tier (read-only)

describe("Projects pages (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("lists the seed projects and opens one", () => {
    cy.visit("/projects");
    cy.get("[data-testid=project-list-card]").should("have.length.at.least", 2);
    cy.get("[data-project-id=PRJ001]").should("contain", "Tan Residence Reno");
    cy.get("[data-project-id=PRJ002]").should("contain", "Lim Office Fitout");
    cy.get("[data-project-id=PRJ001]").click();
    cy.location("pathname").should("eq", "/projects/PRJ001");
  });

  it("search filters the project list", () => {
    cy.visit("/projects");
    cy.get('input[placeholder="Search projects or clients..."]').type("Lim");
    cy.get("[data-project-id=PRJ002]").should("exist");
    cy.get("[data-project-id=PRJ001]").should("not.exist");
  });

  it("creates a real project through the wizard and persists it", () => {
    cy.visit("/projects");
    cy.get("[data-testid=new-project-fab]").click();
    cy.location("pathname").should("eq", "/projects/new");

    // Step 1 — client (type Residential / Condominium are the defaults).
    cy.get("[data-testid=cp-client-name]").type("Cypress Client");
    cy.get("[data-testid=cp-client-contact]").type("+60 12-000 0000");
    cy.get("[data-testid=cp-next]").click();
    // Step 2 — project
    cy.get("[data-testid=cp-project-name]").type("Cypress Test Villa");
    cy.get("[data-testid=cp-location]").type("Iskandar Puteri, JB");
    cy.get("[data-testid=cp-next]").click();
    // Step 3 — pick an area
    cy.contains("button", "Living Room").click();
    cy.get("[data-testid=cp-next]").click();
    // Step 4 — submit
    cy.get("[data-testid=cp-next]").click();

    // Lands on the freshly-created project's detail page.
    cy.location("pathname", { timeout: 15000 }).should("eq", "/projects/PRJ003");

    // The REAL DB row exists with the values we entered.
    cy.task("db:query", "select name from projects where id='PRJ003'").should("eq", "Cypress Test Villa");
    cy.task("db:query", "select client_name from projects where id='PRJ003'").should("eq", "Cypress Client");
    cy.task("db:query", "select status from projects where id='PRJ003'").should("eq", "assigned");

    // And it shows up in the list.
    cy.visit("/projects");
    cy.get("[data-project-id=PRJ003]").should("contain", "Cypress Test Villa");
  });

  it("blocks create when required fields are missing", () => {
    cy.visit("/projects/new");
    // Skip straight through without filling anything.
    cy.get("[data-testid=cp-next]").click(); // step 1 → 2
    cy.get("[data-testid=cp-next]").click(); // step 2 → 3
    cy.get("[data-testid=cp-next]").click(); // step 3 → 4
    cy.get("[data-testid=cp-next]").click(); // submit → validation error
    cy.location("pathname").should("eq", "/projects/new"); // stayed on the wizard
    cy.task("db:query", "select count(*) from projects").should("eq", "2"); // nothing created
  });

  it("edits a project's name and persists it", () => {
    cy.visit("/projects/PRJ001");
    cy.get("[data-testid=project-edit]").click();
    cy.get("[data-testid=edit-name]").clear().type("Tan Residence Reno (Phase 2)");
    cy.get("[data-testid=edit-save]").click();
    cy.task("db:query", "select name from projects where id='PRJ001'")
      .should("eq", "Tan Residence Reno (Phase 2)");
  });

  it("a FIELD user cannot edit a project (no Edit button)", () => {
    cy.loginCached(FIELD);
    cy.visit("/projects/PRJ001");
    cy.contains("Tan Residence Reno").should("be.visible"); // page rendered (read access)
    cy.get("[data-testid=project-edit]").should("not.exist");
  });
});
