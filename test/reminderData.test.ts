import { describe, it, expect } from "vitest";
import { lastNDays } from "@/lib/reminderData";

const TODAY = new Date(2026, 5, 8); // 8 June 2026

describe("lastNDays", () => {
  it("returns N days ending today, most recent last", () => {
    expect(lastNDays(1, TODAY)).toEqual(["08/06/2026"]);
    expect(lastNDays(3, TODAY)).toEqual(["06/06/2026", "07/06/2026", "08/06/2026"]);
  });

  it("crosses a month boundary correctly", () => {
    expect(lastNDays(3, new Date(2026, 5, 2))).toEqual(["31/05/2026", "01/06/2026", "02/06/2026"]);
  });
});
