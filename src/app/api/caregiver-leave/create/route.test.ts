import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { createLeaveRequest, findLeavePairingForCaregiver } from "@/lib/caregiver-leave";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOrigin: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));
vi.mock("@/lib/caregiver-leave", () => {
  const reasons = new Set(["personal", "health", "family", "documents", "other"]);
  return {
    createLeaveRequest: vi.fn(),
    findLeavePairingForCaregiver: vi.fn(),
    parseLeaveRequestInput: vi.fn((body: Record<string, unknown>) => {
      if (!reasons.has(String(body.reason))) return { ok: false, error: "REASON_INVALID" };
      return {
        ok: true,
        value: {
          elderId: String(body.elderId),
          reason: body.reason,
          note: typeof body.note === "string" ? body.note.trim() : null,
          startsAt: new Date(String(body.startsAt)).toISOString(),
          endsAt: new Date(String(body.endsAt)).toISOString(),
        },
      };
    }),
  };
});
vi.mock("@/lib/audit", () => ({ getActorIp: vi.fn(() => "203.0.113.10"), logAudit: vi.fn() }));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const createLeaveRequestMock = vi.mocked(createLeaveRequest);
const findLeavePairingForCaregiverMock = vi.mocked(findLeavePairingForCaregiver);

function request(body: unknown): Request {
  return new Request("https://care.example.test/api/caregiver-leave/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://care.example.test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/caregiver-leave/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    findLeavePairingForCaregiverMock.mockResolvedValue({ ok: true, ownerLineUserId: "family-1" } as never);
    createLeaveRequestMock.mockResolvedValue({ ok: true, leave: { id: 1 } } as never);
  });

  it("allows a paired caregiver to create a leave request", async () => {
    const res = await POST(
      request({
        elderId: "elder-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, leave: { id: 1 } });
    expect(createLeaveRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        elderId: "elder-1",
        caregiverLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        reason: "documents",
        note: "要去辦證件",
      })
    );
  });

  it("rejects a family user creating leave on behalf of a caregiver", async () => {
    findLeavePairingForCaregiverMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await POST(
      request({
        elderId: "elder-1",
        reason: "personal",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "只有配對看護可以建立請假紀錄" });
    expect(createLeaveRequestMock).not.toHaveBeenCalled();
  });
});
