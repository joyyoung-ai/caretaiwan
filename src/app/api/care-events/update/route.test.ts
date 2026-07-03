import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { updateCareEvent } from "@/lib/care-calendar";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOrigin: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));
vi.mock("@/lib/care-calendar", () => ({
  updateCareEvent: vi.fn(),
  isCareEventStatus: vi.fn((status: unknown) => ["scheduled", "done", "cancelled"].includes(String(status))),
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

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const updateCareEventMock = vi.mocked(updateCareEvent);

function request(body: unknown): Request {
  return new Request("https://care.example.test/api/care-events/update", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://care.example.test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/care-events/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    updateCareEventMock.mockResolvedValue({
      ok: true,
      event: {
        id: 1,
        elder_id: "elder-1",
        owner_line_user_id: "family-1",
        created_by_line_user_id: "family-1",
        updated_by_line_user_id: "caregiver-1",
        title: "回診",
        type: "medical_appointment",
        is_medical_related: true,
        starts_at: "2026-08-01T01:00:00.000Z",
        ends_at: null,
        location: null,
        note: null,
        remind_at: null,
        status: "cancelled",
        created_at: "2026-07-03T01:00:00.000Z",
        updated_at: "2026-07-03T01:00:00.000Z",
      },
    } as never);
  });

  it("allows a paired caregiver to cancel an event", async () => {
    const res = await POST(request({ eventId: 1, status: "cancelled" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.event.status).toBe("cancelled");
    expect(JSON.stringify(body)).not.toContain("line_user_id");
    expect(updateCareEventMock).toHaveBeenCalledWith({
      eventId: 1,
      actorLineUserId: "caregiver-1",
      status: "cancelled",
    });
  });

  it("rejects unsupported status values before updating", async () => {
    const res = await POST(request({ eventId: 1, status: "deleted" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "狀態不支援" });
    expect(updateCareEventMock).not.toHaveBeenCalled();
  });

  it("rejects invalid date strings before updating", async () => {
    const res = await POST(request({ eventId: 1, startsAt: "not-a-date" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "時間格式錯誤" });
    expect(updateCareEventMock).not.toHaveBeenCalled();
  });

  it("rejects reversed time ranges before updating", async () => {
    const res = await POST(
      request({
        eventId: 1,
        startsAt: "2026-08-01T05:00:00.000Z",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "結束時間必須晚於開始時間" });
    expect(updateCareEventMock).not.toHaveBeenCalled();
  });

  it("maps helper time range failures to a validation response", async () => {
    updateCareEventMock.mockResolvedValue({ ok: false, error: "TIME_RANGE_INVALID" } as never);

    const res = await POST(request({ eventId: 1, endsAt: "2026-08-01T01:00:00.000Z" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "結束時間必須晚於開始時間" });
  });

  it("rejects unpaired users without exposing event details", async () => {
    updateCareEventMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await POST(request({ eventId: 1, status: "cancelled" }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
  });
});
