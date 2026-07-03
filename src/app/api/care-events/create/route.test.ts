import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { createCareEvent, findCareEventPairing } from "@/lib/care-calendar";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOrigin: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));
vi.mock("@/lib/care-calendar", () => {
  const medicalTypes = new Set(["medical_appointment", "rehab", "medication_pickup", "exam"]);
  const eventTypes = new Set([...medicalTypes, "care_visit", "other"]);

  return {
    createCareEvent: vi.fn(),
    findCareEventPairing: vi.fn(),
    toCareEventResponse: vi.fn((event: Record<string, unknown>) => {
      const {
        owner_line_user_id: _ownerLineUserId,
        created_by_line_user_id: _createdByLineUserId,
        updated_by_line_user_id: _updatedByLineUserId,
        ...safe
      } = event;
      void _ownerLineUserId;
      void _createdByLineUserId;
      void _updatedByLineUserId;
      return safe;
    }),
    parseCareEventInput: vi.fn((body: Record<string, unknown>) => {
      if (!eventTypes.has(String(body.type))) return { ok: false, error: "TYPE_INVALID" };
      return {
        ok: true,
        value: {
          elderId: String(body.elderId),
          type: body.type,
          isMedicalRelated: medicalTypes.has(String(body.type)),
          title: String(body.title).trim(),
          startsAt: new Date(String(body.startsAt)).toISOString(),
          endsAt: null,
          location: null,
          note: null,
          remindAt: body.remindAt ? new Date(String(body.remindAt)).toISOString() : null,
        },
      };
    }),
  };
});
vi.mock("@/lib/audit", () => ({ getActorIp: vi.fn(() => "203.0.113.10"), logAudit: vi.fn() }));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const createCareEventMock = vi.mocked(createCareEvent);
const findCareEventPairingMock = vi.mocked(findCareEventPairing);

function request(body: unknown): Request {
  return new Request("https://care.example.test/api/care-events/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://care.example.test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/care-events/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    findCareEventPairingMock.mockResolvedValue({
      ok: true,
      ownerLineUserId: "family-1",
      role: "caregiver",
    } as never);
    createCareEventMock.mockResolvedValue({
      ok: true,
      event: {
        id: 1,
        elder_id: "elder-1",
        owner_line_user_id: "family-1",
        created_by_line_user_id: "caregiver-1",
        updated_by_line_user_id: "caregiver-1",
        title: "回診",
        type: "medical_appointment",
        is_medical_related: true,
        starts_at: "2026-08-01T01:00:00.000Z",
        ends_at: null,
        location: null,
        note: null,
        remind_at: "2026-07-31T01:00:00.000Z",
        status: "scheduled",
        created_at: "2026-07-03T01:00:00.000Z",
        updated_at: "2026-07-03T01:00:00.000Z",
      },
    } as never);
  });

  it("allows a paired caregiver to create a care event without activating reminder runtime", async () => {
    const res = await POST(
      request({
        elderId: "elder-1",
        type: "medical_appointment",
        title: "回診",
        startsAt: "2026-08-01T01:00:00.000Z",
        remindAt: "2026-07-31T01:00:00.000Z",
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      event: {
        id: 1,
        elder_id: "elder-1",
        title: "回診",
        type: "medical_appointment",
        is_medical_related: true,
        starts_at: "2026-08-01T01:00:00.000Z",
        ends_at: null,
        location: null,
        note: null,
        remind_at: "2026-07-31T01:00:00.000Z",
        status: "scheduled",
        created_at: "2026-07-03T01:00:00.000Z",
        updated_at: "2026-07-03T01:00:00.000Z",
      },
      reminderActive: false,
    });
    expect(createCareEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elderId: "elder-1",
        actorLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        remindAt: "2026-07-31T01:00:00.000Z",
      })
    );
    expect(JSON.stringify(body)).not.toContain("line_user_id");
  });

  it("rejects unpaired users before creating an event", async () => {
    findCareEventPairingMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await POST(
      request({ elderId: "elder-1", type: "care_visit", title: "家訪", startsAt: "2026-08-01T01:00:00.000Z" })
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
    expect(createCareEventMock).not.toHaveBeenCalled();
  });

  it("returns validation errors for unsupported types", async () => {
    const res = await POST(
      request({ elderId: "elder-1", type: "payroll", title: "排班", startsAt: "2026-08-01T01:00:00.000Z" })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "行程類型不支援" });
    expect(findCareEventPairingMock).not.toHaveBeenCalled();
  });
});
