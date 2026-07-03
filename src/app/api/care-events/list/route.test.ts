import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { listCareEventsForElder } from "@/lib/care-calendar";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/care-calendar", () => ({
  listCareEventsForElder: vi.fn(),
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
}));
vi.mock("@/lib/origin-check", () => ({ checkSameOriginGet: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));

const authMock = vi.mocked(auth);
const listCareEventsForElderMock = vi.mocked(listCareEventsForElder);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(rangeDays = 7): Request {
  return new Request(`https://care.example.test/api/care-events/list?elderId=elder-1&rangeDays=${rangeDays}`, {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/care-events/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    listCareEventsForElderMock.mockResolvedValue({
      ok: true,
      events: [
        {
          id: 1,
          elder_id: "elder-1",
          title: "回診",
          owner_line_user_id: "family-1",
          created_by_line_user_id: "caregiver-1",
          updated_by_line_user_id: "caregiver-1",
          type: "medical_appointment",
          starts_at: "2026-08-01T01:00:00.000Z",
          ends_at: null,
          location: null,
          note: null,
          remind_at: null,
          status: "scheduled",
          is_medical_related: true,
          created_at: "2026-07-03T01:00:00.000Z",
          updated_at: "2026-07-03T01:00:00.000Z",
        },
      ],
    } as never);
  });

  it("lists only paired elder events in chronological order", async () => {
    const res = await GET(request(30));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toEqual({
      id: 1,
      elder_id: "elder-1",
      title: "回診",
      type: "medical_appointment",
      starts_at: "2026-08-01T01:00:00.000Z",
      ends_at: null,
      location: null,
      note: null,
      remind_at: null,
      status: "scheduled",
      is_medical_related: true,
      created_at: "2026-07-03T01:00:00.000Z",
      updated_at: "2026-07-03T01:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("line_user_id");
    expect(listCareEventsForElderMock).toHaveBeenCalledWith("elder-1", "caregiver-1", 30);
  });

  it("rejects unpaired users before returning event details", async () => {
    listCareEventsForElderMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await GET(request());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
  });

  it("requires a signed-in viewer before listing care events", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(listCareEventsForElderMock).not.toHaveBeenCalled();
  });
});
