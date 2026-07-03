import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CARE_EVENT_STATUSES,
  CARE_EVENT_TYPES,
  isMedicalCareEventType,
  parseCareEventInput,
  toCareEventResponse,
  updateCareEvent,
} from "./care-calendar";
import { getSupabaseAdmin } from "./supabase-server";

vi.mock("./supabase-server", () => ({ getSupabaseAdmin: vi.fn() }));

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);

describe("care calendar helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("rejects partial updates that would reverse an existing time range", async () => {
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 1,
              elder_id: "elder-1",
              owner_line_user_id: "family-1",
              created_by_line_user_id: "family-1",
              updated_by_line_user_id: "caregiver-1",
              type: "care_visit",
              is_medical_related: false,
              title: "家訪",
              starts_at: "2026-08-01T05:00:00.000Z",
              ends_at: "2026-08-01T01:00:00.000Z",
              location: null,
              note: null,
              remind_at: null,
              status: "scheduled",
              created_at: "2026-07-03T01:00:00.000Z",
              updated_at: "2026-07-03T01:00:00.000Z",
            },
            error: null,
          }),
        })),
      })),
    }));
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "care_events") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 1,
                    elder_id: "elder-1",
                    starts_at: "2026-08-01T05:00:00.000Z",
                    ends_at: null,
                  },
                  error: null,
                }),
              })),
            })),
            update,
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  owner_line_user_id: "family-1",
                  paired_line_user_id: "caregiver-1",
                },
                error: null,
              }),
            })),
          })),
        };
      }),
    } as never);

    await expect(
      updateCareEvent({
        eventId: 1,
        actorLineUserId: "caregiver-1",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).resolves.toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
    expect(update).not.toHaveBeenCalled();
  });
});
