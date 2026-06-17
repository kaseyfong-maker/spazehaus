import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { summarizeAudit, relativeTime, ACTION_VERB } from "@/lib/activityFeed";
import type { AuditEntry } from "@/lib/queries";

// Minimal audit entry — only the fields summarizeAudit reads matter.
const entry = (over: Partial<AuditEntry>): AuditEntry =>
  ({
    id: 1,
    table_name: "projects",
    row_id: "PRJ001",
    action: "UPDATE",
    changed_by: null,
    changed_at: "2026-06-08T00:00:00Z",
    before_data: null,
    after_data: null,
    actor: null,
    ...over,
  }) as AuditEntry;

describe("summarizeAudit", () => {
  it("payment marked collected → gate glyph + amount", () => {
    expect(
      summarizeAudit(
        entry({
          table_name: "payment_records",
          action: "UPDATE",
          before_data: { gate: 2, status: "pending" },
          after_data: { gate: 2, status: "completed", amount: 10500 },
        }),
      ),
    ).toBe("Marked payment ② collected — RM 10,500");
  });

  it("new project", () => {
    expect(
      summarizeAudit(entry({ table_name: "projects", action: "INSERT", row_id: "PRJ003", after_data: { name: "Villa X" } })),
    ).toBe("New project Villa X");
  });

  it("signed document with signatory", () => {
    expect(
      summarizeAudit(
        entry({
          table_name: "signature_records",
          action: "UPDATE",
          before_data: { label: "Design Contract", status: "pending" },
          after_data: { label: "Design Contract", status: "completed", signed_by: "Tan" },
        }),
      ),
    ).toBe("Signed Design Contract by Tan");
  });

  it("new inquiry", () => {
    expect(
      summarizeAudit(entry({ table_name: "inquiries", action: "INSERT", row_id: "INQ009", after_data: { client_name: "Wong" } })),
    ).toBe("New inquiry from Wong");
  });

  it("falls back to verb + table + row for unhandled cases", () => {
    expect(
      summarizeAudit(entry({ table_name: "calendar_events", action: "DELETE", row_id: "EV1", before_data: {}, after_data: null })),
    ).toBe("Deleted calendar_events EV1");
  });
});

describe("ACTION_VERB", () => {
  it("maps actions to past-tense verbs", () => {
    expect(ACTION_VERB).toEqual({ INSERT: "Created", UPDATE: "Updated", DELETE: "Deleted" });
  });
});

describe("relativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("under a minute → just now", () => {
    expect(relativeTime("2026-06-08T11:59:30Z")).toBe("just now");
  });
  it("minutes / hours / days", () => {
    expect(relativeTime("2026-06-08T11:30:00Z")).toBe("30m ago");
    expect(relativeTime("2026-06-08T09:00:00Z")).toBe("3h ago");
    expect(relativeTime("2026-06-05T12:00:00Z")).toBe("3d ago");
  });
  it("beyond a week → absolute date", () => {
    expect(relativeTime("2026-05-25T12:00:00Z")).toMatch(/May/);
  });
});
