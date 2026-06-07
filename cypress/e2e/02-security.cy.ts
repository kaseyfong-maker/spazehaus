import { ACCOUNTS } from "../support/accounts";

const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");

// P0 · Anti-forgery & RLS guards — all at the API layer (no UI), so robust.
describe("P0 · Anti-forgery & guards", () => {
  before(() => cy.task("db:reset"));

  it("anon CANNOT call maybe_advance_project_stage", () => {
    cy.request({
      method: "POST",
      url: `${URL}/rest/v1/rpc/maybe_advance_project_stage`,
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: { p_project_id: "PRJ001" },
      failOnStatusCode: false,
    }).then((res) => {
      expect(JSON.stringify(res.body)).to.match(/permission denied/i);
    });
  });

  it("anon CANNOT call convert_inquiry_to_project", () => {
    cy.request({
      method: "POST",
      url: `${URL}/rest/v1/rpc/convert_inquiry_to_project`,
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: {
        p_inquiry_id: "INQ001", p_project_name: "x", p_designer_name: "x", p_pm_name: "x",
        p_designer_avatar: "NI", p_pm_avatar: "PM", p_start_date: "2026-01-01", p_target_date: "2026-02-01",
        p_budget: 1, p_priority: "low", p_areas: [], p_proposal_deposit: 1,
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(JSON.stringify(res.body)).to.match(/permission denied|not authorized/i);
    });
  });

  it("FIELD user CANNOT self-promote (guard trigger blocks role change)", () => {
    cy.token(ACCOUNTS.field).then((tok) => {
      cy.request({
        method: "PATCH",
        url: `${URL}/rest/v1/staff?id=eq.SH005`,
        headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: { role: "admin" },
        failOnStatusCode: false,
      }).then((res) => {
        expect(JSON.stringify(res.body)).to.match(/only an admin can change/i);
      });
    });
  });

  it("storage buckets are PRIVATE", () => {
    cy.task("db:query", "select id||'='||public from storage.buckets order by id").then((out) => {
      expect(out).to.contain("signature-docs=f");
      expect(out).to.contain("site-photos=f");
    });
  });
});
