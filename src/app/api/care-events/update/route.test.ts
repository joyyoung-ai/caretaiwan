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
    updateCareEventMock.mockResolvedValue({ ok: true, event: { id: 1, status: "cancelled" } } as never);
  });

  it("allows a paired caregiver to cancel an event", async () => {
    const res = await POST(request({ eventId: 1, status: "cancelled" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, event: { id: 1, status: "cancelled" } });
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

  it("rejects unpaired users without exposing event details", async () => {
    updateCareEventMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await POST(request({ eventId: 1, status: "cancelled" }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
  });
});
