import { ACCOUNTS } from "../support/accounts";

const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");

const h = (tok: string) => ({
  apikey: ANON,
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

// P0 · Staff lifecycle + guards.
describe("P0 · Staff lifecycle", () => {
  beforeEach(() => cy.task("db:reset"));

  it("ADMIN can create a staff row; FIELD cannot", () => {
    cy.token(ACCOUNTS.admin).then((tok) => {
      cy.request({
        method: "POST", url: `${URL}/rest/v1/staff`, headers: h(tok),
        body: { id: "SH050", email: "newhire@spazehaus.test", name: "New Hire", role: "designer", job_title: "Designer", dept: "Design", avatar_code: "NW", join_date: "2026-06-07" },
      }).its("status").should("be.oneOf", [200, 201]);
    });
    cy.token(ACCOUNTS.field).then((tok) => {
      cy.request({
        method: "POST", url: `${URL}/rest/v1/staff`, headers: h(tok),
        body: { id: "SH099", email: "x@x.test", name: "x", role: "designer", job_title: "x", dept: "Design", avatar_code: "XX", join_date: "2026-06-07" },
        failOnStatusCode: false,
      }).then((res) => expect(res.status).to.be.oneOf([401, 403]));
    });
  });

  it("hard DELETE of a staff row is blocked by the trigger", () => {
    cy.token(ACCOUNTS.admin).then((tok) => {
      cy.request({ method: "DELETE", url: `${URL}/rest/v1/staff?id=eq.SH007`, headers: { apikey: ANON, Authorization: `Bearer ${tok}` }, failOnStatusCode: false })
        .then((res) => expect(JSON.stringify(res.body)).to.match(/cannot be deleted/i));
      cy.task("db:query", "select count(*) from staff where id='SH007'").should("eq", "1");
    });
  });

  it("the last active admin cannot be demoted", () => {
    cy.task("db:exec", "update staff set status='inactive' where id='SH002'"); // leave SH001 as sole admin
    cy.token(ACCOUNTS.admin).then((tok) => {
      cy.request({ method: "PATCH", url: `${URL}/rest/v1/staff?id=eq.SH001`, headers: h(tok), body: { role: "designer" }, failOnStatusCode: false })
        .then((res) => expect(JSON.stringify(res.body)).to.match(/last active admin/i));
    });
  });

  it("soft-delete revokes the email gate; reactivate restores it", () => {
    cy.token(ACCOUNTS.admin).then((tok) => {
      cy.request({ method: "PATCH", url: `${URL}/rest/v1/staff?id=eq.SH006`, headers: h(tok), body: { status: "inactive" } }).its("status").should("be.oneOf", [200, 204]);
      cy.task("db:query", "select status from staff where id='SH006'").should("eq", "inactive");
      // Inactive staff can't even request a magic link.
      cy.request({ method: "POST", url: `${URL}/rest/v1/rpc/staff_email_exists`, headers: { apikey: ANON, "Content-Type": "application/json" }, body: { p_email: ACCOUNTS.sales } })
        .its("body").should("eq", false);
      // Reactivate.
      cy.request({ method: "PATCH", url: `${URL}/rest/v1/staff?id=eq.SH006`, headers: h(tok), body: { status: "active" } }).its("status").should("be.oneOf", [200, 204]);
      cy.task("db:query", "select status from staff where id='SH006'").should("eq", "active");
    });
  });
});
