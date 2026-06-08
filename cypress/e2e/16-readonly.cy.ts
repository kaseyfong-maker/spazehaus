import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// Read-only & stub pages, against the REAL local backend.
//   • Calendar / KPI / Performance / Announcements / Audit render real data.
//   • Documents the KNOWN STUBS surfaced by the audit (these actions do NOT
//     persist yet): Performance "Generate Report" + Announcements "Create" both
//     only fire a toast. The assertions pin that current behaviour so a future
//     wire-up will visibly change the test.
//   • Audit log is admin-only (FIELD is redirected). Profile sign-out is real.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin;
const FIELD = ACCOUNTS.field;

describe("Read-only & stub pages (real local backend)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  it("Calendar renders", () => {
    cy.visit("/calendar");
    cy.contains("SCHEDULE").should("be.visible");
    cy.location("pathname").should("eq", "/calendar");
  });

  it("KPI & Performance renders", () => {
    cy.visit("/company/kpi");
    cy.contains("MONTHLY REVIEW").should("be.visible");
  });

  it("Performance report renders — Generate Report is a STUB (toast only, no PDF)", () => {
    cy.visit("/performance");
    cy.contains("REPORT · TARGETS").should("be.visible");
    cy.get("[data-testid=perf-generate]").click();
    cy.contains(/PDF queued/i).should("be.visible"); // 🚩 stub: no real PDF/write
  });

  it("Announcements list renders — Create is a STUB (coming soon)", () => {
    cy.visit("/company/announcements");
    cy.contains("COMPANY UPDATES").should("be.visible");
    cy.get("[data-testid=new-announcement-fab]").click();
    cy.contains(/coming soon/i).should("be.visible"); // 🚩 stub: no real insert
  });

  it("Audit Log: an admin sees system activity", () => {
    cy.visit("/company/audit");
    cy.contains("SYSTEM ACTIVITY").should("be.visible");
  });

  it("Audit Log: a FIELD user is redirected away to /company", () => {
    cy.loginCached(FIELD);
    cy.visit("/company/audit");
    cy.location("pathname", { timeout: 10000 }).should("eq", "/company");
  });

  // Last — signs out, which clears the session.
  it("Profile shows the current user and signs out (real)", () => {
    cy.visit("/profile");
    // Scope to the profile hero heading — the name also appears in the hidden sidebar.
    cy.get("h2").should("contain", "Grace Tan");
    cy.get("[data-testid=profile-signout]").click();
    cy.location("pathname", { timeout: 10000 }).should("include", "/login");
  });
});
