// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONAL — Client portal (`/portal/:token`), PUBLIC (no auth).
// Registered above the AuthGate; access is gated solely by the project's
// client_access_token UUID. Read-only view via the get_client_portal_data RPC.
//
// Seed: PRJ001 (Tan Residence Reno) token = 11111111-1111-1111-1111-111111111111.
// No cy.loginCached here — the whole point is that it works with NO session.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TOKEN = "11111111-1111-1111-1111-111111111111"; // PRJ001
const INVALID_TOKEN = "00000000-0000-0000-0000-000000000000";

describe("Client portal (public, no auth)", { retries: { runMode: 1, openMode: 0 } }, () => {
  beforeEach(() => cy.task("db:reset"));

  it("renders a project by its access token WITHOUT logging in", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit(`/portal/${VALID_TOKEN}`);
    cy.contains("CLIENT PORTAL", { timeout: 15000 }).should("be.visible");
    cy.contains("Tan Residence Reno").should("be.visible"); // the linked project
    cy.location("pathname").should("eq", `/portal/${VALID_TOKEN}`); // never bounced to /login
  });

  it("shows an error for an invalid / revoked token", () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit(`/portal/${INVALID_TOKEN}`);
    cy.contains(/this link isn'?t valid/i, { timeout: 15000 }).should("be.visible");
    cy.contains("Tan Residence Reno").should("not.exist");
  });
});
