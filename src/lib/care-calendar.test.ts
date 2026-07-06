import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CARE_EVENT_STATUSES,
  CARE_EVENT_TYPES,
  createCareEvent,
  findCareEventPairing,
  isMedicalCareEventType,
  listCareEventsForElder,
  parseCareEventInput,
  toCareEventResponse,
  updateCareEvent,
} from "./care-calendar";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

const careEventRow = {
  id: 1,
  elder_id: "elder-1",
  owner_line_user_id: "family-1",
  created_by_line_user_id: "caregiver-1",
  updated_by_line_user_id: "caregiver-1",
  type: "medical_appointment" as const,
  is_medical_related: true,
  title: "回診",
  starts_at: "2026-08-01T01:00:00.000Z",
  ends_at: null,
  location: null,
  note: null,
  remind_at: null,
  status: "scheduled" as const,
  created_at: "2026-07-03T01:00:00.000Z",
  updated_at: "2026-07-03T01:00:00.000Z",
};

describe("care calendar helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
  });

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

  it("removes LINE user identifiers from care event responses", () => {
    expect(
      toCareEventResponse({
        id: 1,
        elder_id: "elder-1",
        owner_line_user_id: "family-1",
        created_by_line_user_id: "caregiver-1",
        updated_by_line_user_id: "caregiver-1",
        type: "medical_appointment",
        is_medical_related: true,
        title: "回診",
        starts_at: "2026-08-01T01:00:00.000Z",
        ends_at: null,
        location: null,
        note: null,
        remind_at: null,
        status: "scheduled",
        created_at: "2026-07-03T01:00:00.000Z",
        updated_at: "2026-07-03T01:00:00.000Z",
      })
    ).toEqual({
      id: 1,
      elder_id: "elder-1",
      type: "medical_appointment",
      is_medical_related: true,
      title: "回診",
      starts_at: "2026-08-01T01:00:00.000Z",
      ends_at: null,
      location: null,
      note: null,
      remind_at: null,
      status: "scheduled",
      created_at: "2026-07-03T01:00:00.000Z",
      updated_at: "2026-07-03T01:00:00.000Z",
    });
  });

  it("finds a paired caregiver using the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([
      {
        owner_line_user_id: "family-1",
        paired_line_user_id: "caregiver-1",
      },
    ]);

    await expect(findCareEventPairing("elder-1", "caregiver-1")).resolves.toEqual({
      ok: true,
      ownerLineUserId: "family-1",
      role: "caregiver",
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("from elder_pairings"),
      ["elder-1"]
    );
  });

  it("creates a care event through the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([careEventRow]);

    await expect(
      createCareEvent({
        elderId: "elder-1",
        actorLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        type: "medical_appointment",
        isMedicalRelated: true,
        title: "回診",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: null,
        location: null,
        note: null,
        remindAt: null,
      })
    ).resolves.toEqual({ ok: true, event: careEventRow });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into care_events"),
      expect.arrayContaining(["elder-1", "family-1", "caregiver-1", "medical_appointment"])
    );
  });

  it("lists paired care events through the Postgres adapter", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          owner_line_user_id: "family-1",
          paired_line_user_id: "caregiver-1",
        },
      ])
      .mockResolvedValueOnce([careEventRow]);

    await expect(listCareEventsForElder("elder-1", "caregiver-1", 30)).resolves.toEqual({
      ok: true,
      events: [careEventRow],
    });
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("from care_events"),
      expect.arrayContaining(["elder-1"])
    );
  });

  it("rejects partial updates that would reverse an existing time range", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 1,
          elder_id: "elder-1",
          starts_at: "2026-08-01T05:00:00.000Z",
          ends_at: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          owner_line_user_id: "family-1",
          paired_line_user_id: "caregiver-1",
        },
      ]);

    await expect(
      updateCareEvent({
        eventId: 1,
        actorLineUserId: "caregiver-1",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).resolves.toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
    expect(queryMock).toHaveBeenCalledTimes(2);
  });

  it("returns service disabled when the Postgres adapter is not configured", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    await expect(findCareEventPairing("elder-1", "caregiver-1")).resolves.toEqual({
      ok: false,
      error: "SERVICE_DISABLED",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
