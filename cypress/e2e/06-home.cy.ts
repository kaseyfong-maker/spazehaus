import { ACCOUNTS } from "../support/accounts";

// ─────────────────────────────────────────────────────────────────────────────
// Home / Dashboard (`/`) — the page rendered after login.
// Logged-in user under test: admin@spazehaus.test (Grace Tan · principal).
// Expected values are pinned to supabase/seed.sql (2 projects, 7 staff, etc.).
// Plan: .agent/plan/homepage-testing-plan.md
//
// Auth note: we log in ONCE. cy.loginCached injects an admin-minted Supabase
// session (admin API → no email, no magic-link rate limit) into localStorage and
// caches it via cy.session, so every test reuses the same login. Each test then
// does cy.visit("/") to load the dashboard; any DB state a test needs is set up
// BEFORE that visit so the first render reflects it.
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN = ACCOUNTS.admin;
const URL = Cypress.env("SUPABASE_URL");
const ANON = Cypress.env("ANON_KEY");
const authHeaders = (tok: string) => ({
  apikey: ANON,
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

// Seed-derived expectations (see seed.sql) ───────────────────────────────────
// projects: PRJ001 (assigned) + PRJ002 (active) → 2 active, 0 review, 0 done
// staff:    SH001..SH007 → 7
// open payments: PRJ001 g2-5 (140,000) + PRJ002 g4-5 (208,200) = 348,200
// open signatures: PRJ001×6 + PRJ002 handover = 7 (no due dates → 0 overdue/this-week)
const EXPECT = {
  activeProjects: "2",
  teamMembers: "7",
  pendingReview: "0",
  completed: "0",
  overdue: "0",
  thisWeek: "0",
  signs: "7",
  outstanding: "348,200.00",
};

const QUICK_ACTIONS: Array<[string, string]> = [
  ["New Project", "/projects/new"],
  ["Checkpoints", "/checkpoints"],
  ["Reminders", "/reminders"],
  ["Customers", "/customers"],
  ["Leave", "/company/leave"],
  ["Quotes", "/quotations"],
];

// One retry as a light safety net for the rare transient (the cached, injected
// login is deterministic — no magic-link flake to absorb).
describe("Home / Dashboard", { retries: { runMode: 1, openMode: 0 } }, () => {
  // Reset the DB per test for isolation, then restore the one cached admin login.
  // The minted session stays valid across resets (auth.users is untouched).
  beforeEach(() => {
    cy.task("db:reset");
    cy.loginCached(ADMIN);
  });

  // ── Phase 1 — Auth gate & identity ─────────────────────────────────────────
  context("Phase 1 · identity", () => {
    it("admin lands on the dashboard with their staff identity", () => {
      cy.visit("/");
      cy.location("pathname").should("eq", "/");
      cy.get("[data-testid=dashboard-root]").should("exist");
      cy.get("[data-testid=hero-greeting]").should("have.text", "Grace Tan");
      cy.get("[data-testid=hero-jobtitle]").should("have.text", "Principal");
      cy.get("[data-testid=hero-avatar]").should("have.text", "GT");
    });

    it("unauthenticated visit to / is redirected to /login", () => {
      // Drop the cached session so this visit is genuinely logged out.
      cy.clearLocalStorage();
      cy.clearCookies();
      cy.visit("/");
      cy.location("pathname", { timeout: 15000 }).should("include", "/login");
    });
  });

  // ── Phase 2 — Static hero header (decorative) ──────────────────────────────
  context("Phase 2 · hero header", () => {
    it("shows brand, bell and search (decorative)", () => {
      cy.visit("/");
      // Scope to the hero — "SPAZEHAUS" also appears in the (hidden) desktop sidebar.
      cy.get("[data-testid=dashboard-root]").within(() => {
        cy.contains("SPAZEHAUS").should("be.visible");
        cy.contains("Management").should("be.visible");
      });
      cy.get("[data-testid=notif-bell]").should("be.visible"); // no handler — presence only
      cy.get("[data-testid=hero-search]").should("be.visible"); // span, not input — presence only
    });
  });

  // ── Phase 3 — OVERVIEW stat cards ──────────────────────────────────────────
  context("Phase 3 · stats", () => {
    it("computes the four overview counts from seed data", () => {
      cy.visit("/");
      cy.get("[data-testid=stat-active-projects]").should("have.text", EXPECT.activeProjects);
      cy.get("[data-testid=stat-team-members]").should("have.text", EXPECT.teamMembers);
      cy.get("[data-testid=stat-pending-review]").should("have.text", EXPECT.pendingReview);
      cy.get("[data-testid=stat-completed]").should("have.text", EXPECT.completed);
    });

    it("reflects a project status change", () => {
      // Mutate before login so the first dashboard render shows the new counts.
      cy.token(ACCOUNTS.ops).then((tok) => {
        cy.request({
          method: "PATCH",
          url: `${URL}/rest/v1/projects?id=eq.PRJ002`,
          headers: authHeaders(tok),
          body: { status: "completed" },
        }).its("status").should("be.oneOf", [200, 204]);
      });
      cy.visit("/");
      cy.get("[data-testid=stat-active-projects]").should("have.text", "1"); // PRJ001 only
      cy.get("[data-testid=stat-completed]").should("have.text", "1"); // PRJ002 now done
    });
  });

  // ── Phase 4 — URGENT CHECKPOINTS card ──────────────────────────────────────
  context("Phase 4 · checkpoints", () => {
    it("shows the checkpoint summary computed from open payments + signatures", () => {
      cy.visit("/");
      cy.get("[data-testid=checkpoints-card]").should("be.visible");
      cy.get("[data-testid=ckpt-overdue]").should("have.text", EXPECT.overdue);
      cy.get("[data-testid=ckpt-thisweek]").should("have.text", EXPECT.thisWeek);
      cy.get("[data-testid=ckpt-signs]").should("have.text", EXPECT.signs);
      cy.get("[data-testid=ckpt-outstanding]").should("contain.text", EXPECT.outstanding);
      // 0 overdue → "All on track" (not "Action required")
      cy.get("[data-testid=ckpt-status]").should("have.text", "All on track");
    });

    it("hides the card once every open payment + signature is cleared", () => {
      cy.task("db:exec", "update payment_records set status='skipped' where status='pending';");
      cy.task("db:exec", "update signature_records set status='skipped' where status='pending';");
      cy.visit("/");
      cy.get("[data-testid=dashboard-root]").should("exist");
      cy.get("[data-testid=checkpoints-card]").should("not.exist");
    });

    it("View All navigates to /checkpoints", () => {
      cy.visit("/");
      cy.get("[data-testid=checkpoints-viewall]").click();
      cy.location("pathname").should("eq", "/checkpoints");
    });

    it("the checkpoint card navigates to /checkpoints", () => {
      cy.visit("/");
      cy.get("[data-testid=checkpoints-card]").click();
      cy.location("pathname").should("eq", "/checkpoints");
    });
  });

  // ── Phase 5 — QUICK ACTIONS navigation ─────────────────────────────────────
  context("Phase 5 · quick actions", () => {
    it("renders all six quick-action buttons", () => {
      cy.visit("/");
      cy.get("[data-testid=quick-action]").should("have.length", 6);
    });

    QUICK_ACTIONS.forEach(([label, path]) => {
      it(`"${label}" navigates to ${path}`, () => {
        cy.visit("/");
        cy.get(`[data-action="${path}"]`).click();
        cy.location("pathname").should("eq", path);
      });
    });
  });

  // ── Phase 6 — RECENT PROJECTS ──────────────────────────────────────────────
  context("Phase 6 · recent projects", () => {
    it("renders the seed projects with status pill + progress", () => {
      cy.visit("/");
      cy.get("[data-testid=project-card]").should("have.length", 2);

      cy.get("[data-project-id=PRJ001]").within(() => {
        cy.contains("Tan Residence Reno");
        cy.contains("Mr. & Mrs. Tan");
        cy.contains("30% complete");
        cy.get("[data-testid=project-status]").should("contain.text", "Review"); // assigned → Review
      });

      cy.get("[data-project-id=PRJ002]").within(() => {
        cy.contains("Lim Office Fitout");
        cy.contains("Lim Holdings");
        cy.contains("60% complete");
        cy.get("[data-testid=project-status]").should("contain.text", "Active"); // active → Active
      });
    });

    it("clicking a project card opens that project", () => {
      cy.visit("/");
      cy.get("[data-project-id=PRJ002]").click();
      cy.location("pathname").should("eq", "/projects/PRJ002");
    });

    it("View All navigates to /projects", () => {
      cy.visit("/");
      cy.get("[data-testid=projects-viewall]").click();
      cy.location("pathname").should("eq", "/projects");
    });
  });

  // ── Phase 7 — RECENT ACTIVITY (live audit feed) ────────────────────────────
  context("Phase 7 · recent activity", () => {
    it("shows the empty state when the audit log has no events", () => {
      // reset re-links staff (a write) → clear the log so the feed is truly empty.
      cy.task("db:exec", "truncate table audit_log restart identity;");
      cy.visit("/");
      cy.get("[data-testid=recent-activity-empty]").should("be.visible").and("contain", "No recent activity");
      cy.get("[data-testid=activity-item]").should("not.exist");
    });

    it("renders real audit events with summary + actor (not the old hardcoded list)", () => {
      cy.task("db:exec", "truncate table audit_log restart identity;");
      // Collect Gate ② of PRJ001 as OPS (Priya Menon) → one clean audit event.
      // Done as OPS (not admin) so we don't request two magic links for the admin
      // email in one test (GoTrue burst rate-limit). Admin still views the feed.
      cy.token(ACCOUNTS.ops).then((tok) => {
        cy.request({
          method: "PATCH",
          url: `${URL}/rest/v1/payment_records?project_id=eq.PRJ001&gate=eq.2`,
          headers: authHeaders(tok),
          body: { status: "completed", collected_date: "2026-06-08" },
        }).its("status").should("be.oneOf", [200, 204]);
      });
      cy.visit("/");

      cy.get("[data-testid=activity-item]").should("have.length.at.least", 1);
      cy.get("[data-testid=activity-item]").first()
        .should("contain", "Marked payment")
        .and("contain", "10,500")     // RM 10,500 — the Gate ② amount
        .and("contain", "Priya Menon"); // actor resolved from changed_by
      // Proves the hardcoded demo feed is gone.
      cy.get("[data-testid=recent-activity]").should("not.contain", "Eco Botanic Office");
    });

    it("View All navigates to the audit log", () => {
      cy.visit("/");
      cy.contains("RECENT ACTIVITY").parent().contains("View All").click();
      cy.location("pathname").should("eq", "/company/audit");
    });
  });

  // ── Phase 8 — LATEST ANNOUNCEMENT (conditional) ────────────────────────────
  context("Phase 8 · announcement", () => {
    it("is hidden when there are no announcements (seed default)", () => {
      cy.visit("/");
      cy.get("[data-testid=dashboard-root]").should("exist");
      cy.get("[data-testid=announcement-card]").should("not.exist");
    });

    it("shows the latest announcement when one exists", () => {
      cy.task(
        "db:exec",
        "insert into announcements (id,title,content,priority,author_id,published_date) values " +
          "('ANN001','Team Briefing'," +
          "'All-hands meeting this Friday at 3pm in the main showroom. Please confirm attendance and bring your latest project updates.'," +
          "'low','SH001','2026-06-08');",
      );
      cy.visit("/");
      cy.get("[data-testid=announcement-card]").should("be.visible").and("contain", "Team Briefing");
    });
  });

  // ── Phase 9 — Error handling & retry ───────────────────────────────────────
  context("Phase 9 · error + retry", () => {
    it("shows the error banner when projects fail, and Retry recovers", () => {
      let allowProjects = false;
      cy.intercept("GET", "**/rest/v1/projects*", (req) => {
        if (allowProjects) req.continue();
        else req.reply({ statusCode: 500, body: { message: "forced failure" } });
      });

      cy.visit("/");
      cy.get("[data-testid=error-banner]", { timeout: 15000 }).should("be.visible");
      // Page still renders (stats degrade to 0 rather than crashing).
      cy.get("[data-testid=stat-active-projects]").should("have.text", "0");

      cy.then(() => { allowProjects = true; });
      cy.get("[data-testid=error-retry]").click();
      cy.get("[data-testid=error-banner]").should("not.exist");
      cy.get("[data-testid=stat-active-projects]").should("have.text", EXPECT.activeProjects);
    });
  });
});
