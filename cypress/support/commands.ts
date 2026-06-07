/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Clean DB to the seed state (and re-link auth users). */
      resetDb(): Chainable<void>;
      /** Fast login via an admin-generated magic link (visits verify → app). */
      login(email: string): Chainable<void>;
      /** Faithful login through the real magic-link → Mailpit flow. */
      loginViaMailpit(email: string): Chainable<void>;
      /** Resolve a real user access token for authenticated cy.request() calls. */
      token(email: string): Chainable<string>;
    }
  }
}

Cypress.Commands.add("resetDb", () => {
  cy.task("db:reset");
});

Cypress.Commands.add("login", (email: string) => {
  cy.task("auth:actionLink", email).then((link) => {
    expect(link, "action link").to.be.a("string");
    cy.visit(link as string);
    cy.location("pathname", { timeout: 20000 }).should("not.include", "/login");
  });
});

Cypress.Commands.add("loginViaMailpit", (email: string) => {
  cy.task("mailpit:clear");
  cy.visit("/login");
  cy.get("input[type=email]").clear().type(email);
  cy.contains("button", /send magic link/i).click();
  cy.contains(/check your email/i, { timeout: 15000 });

  const grab = (attempt = 0): Cypress.Chainable<string> =>
    cy.task<string | null>("mailpit:latestLink", email).then((link): any => {
      if (link) return link;
      if (attempt > 12) throw new Error("No magic-link email arrived in Mailpit");
      return cy.wait(500).then(() => grab(attempt + 1));
    });

  grab().then((link) => {
    cy.visit(link);
    cy.location("pathname", { timeout: 20000 }).should("not.include", "/login");
  });
});

Cypress.Commands.add("token", (email: string) => {
  return cy.task<string>("auth:token", email);
});

export {};
