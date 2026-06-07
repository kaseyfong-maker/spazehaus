import { ACCOUNTS } from "../support/accounts";

// P0 · Auth gate — the faithful magic-link flow + the unknown-email block.
describe("P0 · Auth", () => {
  it("known staff signs in via the real magic link (Mailpit)", () => {
    cy.task("db:reset");
    cy.loginViaMailpit(ACCOUNTS.admin);
    cy.contains("Grace Tan"); // dashboard greeting → authenticated as the admin
  });

  it("unknown email is blocked and no email is sent", () => {
    cy.task("mailpit:clear");
    cy.visit("/login");
    cy.get("input[type=email]").type("nobody@stranger.com");
    cy.contains("button", /send magic link/i).click();
    cy.contains(/isn['’]t registered as a staff member/i);
    cy.task("mailpit:count", "nobody@stranger.com").should("eq", 0);
  });
});
