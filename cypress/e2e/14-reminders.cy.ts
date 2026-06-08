import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Reminders site-photo upload, against the REAL local backend.
// Uploads a real image to local Supabase Storage (site-photos bucket) via the
// 14-day grid, marks the day done, and verifies the real `site_photos` row.
//
// Today is 2026-06-08 (machine clock). Seed: PRJ002 has photos on 06-04 + 06-05;
// today's cell is empty → uploadable. Grid keys are DD/MM/YYYY.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin;
const TODAY_CELL = '[data-cell="PRJ002:08/06/2026"]';
const PHOTO = "cypress/fixtures/sample-photo.png";
const todayCount = () =>
  cy.task("db:query", "select count(*) from site_photos where project_id='PRJ002' and photo_date='2026-06-08'");

describe("Reminders — site photo upload (real local backend + storage)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("renders the 14-day photo grid for an active project", () => {
    cy.visit("/reminders");
    cy.get(TODAY_CELL).should("exist");
  });

  it("uploads a site photo for today and persists it to storage + DB", () => {
    todayCount().should("eq", "0"); // not uploaded in the seed

    cy.visit("/reminders");
    cy.get(TODAY_CELL).click(); // sets the upload target + opens the (hidden) picker
    cy.get("[data-testid=reminder-file]").selectFile(PHOTO, { force: true });

    // Upload resolved (toast) → verify the real row landed.
    cy.contains(/photo uploaded/i, { timeout: 15000 }).should("be.visible");
    todayCount().should("eq", "1");
    cy.task("db:query", "select case when storage_path is null then 'null' else 'set' end from site_photos where project_id='PRJ002' and photo_date='2026-06-08'")
      .should("eq", "set");
  });
});
