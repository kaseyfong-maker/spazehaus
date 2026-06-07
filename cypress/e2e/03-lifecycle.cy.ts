import { ACCOUNTS } from "../support/accounts";

const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");

const authHeaders = (tok: string) => ({
  apikey: ANON,
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

// P0 · The lifecycle engine — the trigger → maybe_advance path + write RLS.
describe("P0 · Lifecycle engine", () => {
  beforeEach(() => cy.task("db:reset"));

  it("Gate ② + design-contract signature advances PRJ001 past stage 9", () => {
    cy.token(ACCOUNTS.ops).then((tok) => {
      const h = authHeaders(tok);

      cy.task("db:query", "select current_stage_id from projects where id='PRJ001'").should("eq", "design-contract");

      // Collect Gate ② — should NOT advance yet (stage 9 needs the signature too).
      cy.request({ method: "PATCH", url: `${URL}/rest/v1/payment_records?project_id=eq.PRJ001&gate=eq.2`, headers: h, body: { status: "completed", collected_date: "2026-06-07" } })
        .its("status").should("be.oneOf", [200, 204]);
      cy.task("db:query", "select current_stage_id from projects where id='PRJ001'").should("eq", "design-contract");

      // Sign the design contract — now BOTH requirements met → must advance.
      cy.request({ method: "PATCH", url: `${URL}/rest/v1/signature_records?project_id=eq.PRJ001&signature_key=eq.design-contract`, headers: h, body: { status: "completed", signed_date: "2026-06-07", signed_by: "Tan" } })
        .its("status").should("be.oneOf", [200, 204]);
      cy.task("db:query", "select current_stage_id from projects where id='PRJ001'").should("not.eq", "design-contract");
    });
  });

  it("FIELD user CANNOT collect a payment (RLS denies the update)", () => {
    cy.token(ACCOUNTS.field).then((tok) => {
      cy.request({
        method: "PATCH",
        url: `${URL}/rest/v1/payment_records?project_id=eq.PRJ001&gate=eq.2`,
        headers: authHeaders(tok),
        body: { status: "completed" },
        failOnStatusCode: false,
      }).then((res) => {
        // RLS filters the row out → 0 rows updated (empty array), or an explicit deny.
        const denied = (Array.isArray(res.body) && res.body.length === 0) || /permission|denied/i.test(JSON.stringify(res.body));
        expect(denied, "field user blocked from collecting").to.be.true;
      });
      // And the gate is still pending.
      cy.task("db:query", "select status from payment_records where project_id='PRJ001' and gate=2").should("eq", "pending");
    });
  });
});
