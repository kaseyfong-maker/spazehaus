import { ACCOUNTS } from "../support/accounts";

const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");

// P0 · Convert inquiry → project (atomic) + authorization.
describe("P0 · Convert inquiry", () => {
  beforeEach(() => cy.task("db:reset"));

  it("OPS converts INQ001 → new project with 5 gates + inquiry awarded", () => {
    cy.token(ACCOUNTS.ops).then((tok) => {
      cy.request({
        method: "POST",
        url: `${URL}/rest/v1/rpc/convert_inquiry_to_project`,
        headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: {
          p_inquiry_id: "INQ001", p_project_name: "Wong Reno", p_designer_name: "Nadia", p_pm_name: "Priya",
          p_designer_avatar: "NI", p_pm_avatar: "PM", p_start_date: "2026-06-10", p_target_date: "2026-12-10",
          p_budget: 140000, p_priority: "medium", p_areas: ["Living Room"], p_proposal_deposit: 9000,
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const newId = String(res.body);
        expect(newId).to.match(/^PRJ\d+$/);
        cy.task("db:query", "select stage from inquiries where id='INQ001'").should("eq", "awarded");
        cy.task("db:query", `select count(*) from payment_records where project_id='${newId}'`).should("eq", "5");
        cy.task("db:query", `select count(*) from signature_records where project_id='${newId}'`).should("eq", "6");
      });
    });
  });

  it("FIELD user CANNOT convert", () => {
    cy.token(ACCOUNTS.field).then((tok) => {
      cy.request({
        method: "POST",
        url: `${URL}/rest/v1/rpc/convert_inquiry_to_project`,
        headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: {
          p_inquiry_id: "INQ001", p_project_name: "x", p_designer_name: "x", p_pm_name: "x",
          p_designer_avatar: "NI", p_pm_avatar: "PM", p_start_date: "2026-06-10", p_target_date: "2026-12-10",
          p_budget: 1, p_priority: "low", p_areas: [], p_proposal_deposit: 1,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(JSON.stringify(res.body)).to.match(/not authorized/i);
      });
      cy.task("db:query", "select stage from inquiries where id='INQ001'").should("eq", "showroom-meet");
    });
  });
});
