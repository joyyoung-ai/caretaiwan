import { describe, expect, it } from "vitest";
import { LEAVE_REASONS, parseLeaveRequestInput } from "./caregiver-leave";

describe("caregiver leave helpers", () => {
  it("accepts a fixed reason option plus free-text note", () => {
    expect(LEAVE_REASONS).toContain("documents");
    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    ).toEqual({
      ok: true,
      value: {
        elderId: "elder-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      },
    });
  });

  it("rejects unsupported reason and invalid time range", () => {
    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "payroll",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "REASON_INVALID" });

    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "personal",
        startsAt: "2026-08-01T05:00:00.000Z",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
  });
});
