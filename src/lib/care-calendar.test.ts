import { describe, expect, it } from "vitest";
import {
  CARE_EVENT_STATUSES,
  CARE_EVENT_TYPES,
  isMedicalCareEventType,
  parseCareEventInput,
} from "./care-calendar";

describe("care calendar helpers", () => {
  it("marks medical appointment, rehab, medication pickup, and exam as medical-related", () => {
    expect(isMedicalCareEventType("medical_appointment")).toBe(true);
    expect(isMedicalCareEventType("rehab")).toBe(true);
    expect(isMedicalCareEventType("medication_pickup")).toBe(true);
    expect(isMedicalCareEventType("exam")).toBe(true);
    expect(isMedicalCareEventType("care_visit")).toBe(false);
    expect(isMedicalCareEventType("other")).toBe(false);
  });

  it("parses valid care event input and trims long text fields", () => {
    const result = parseCareEventInput({
      elderId: "elder-1",
      type: "medical_appointment",
      title: "  回診  ",
      startsAt: "2026-08-01T01:00:00.000Z",
      endsAt: "2026-08-01T02:00:00.000Z",
      location: "  台大醫院  ",
      note: "請帶健保卡",
      remindAt: "2026-07-31T01:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        elderId: "elder-1",
        type: "medical_appointment",
        isMedicalRelated: true,
        title: "回診",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T02:00:00.000Z",
        location: "台大醫院",
        note: "請帶健保卡",
        remindAt: "2026-07-31T01:00:00.000Z",
      },
    });
  });

  it("rejects unsupported event type and invalid time range", () => {
    expect(CARE_EVENT_TYPES).toContain("care_visit");
    expect(CARE_EVENT_STATUSES).toContain("cancelled");

    expect(
      parseCareEventInput({
        elderId: "elder-1",
        type: "payroll",
        title: "排班",
        startsAt: "2026-08-01T02:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TYPE_INVALID" });

    expect(
      parseCareEventInput({
        elderId: "elder-1",
        type: "care_visit",
        title: "家訪",
        startsAt: "2026-08-01T02:00:00.000Z",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
  });
});
