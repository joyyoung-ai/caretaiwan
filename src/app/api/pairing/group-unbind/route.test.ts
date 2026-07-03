import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { unbindNotifyGroup } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  unbindNotifyGroup: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const unbindNotifyGroupMock = vi.mocked(unbindNotifyGroup);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/pairing/group-unbind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pairing/group-unbind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    unbindNotifyGroupMock.mockResolvedValue({ ok: true } as never);
  });

  it("unbinds group notifications using the signed-in family owner id", async () => {
    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(unbindNotifyGroupMock).toHaveBeenCalledWith("elder-1", "family-1");
  });

  it("maps not-owner failures to a user-facing error", async () => {
    unbindNotifyGroupMock.mockResolvedValue({ ok: false, error: "NOT_FOUND_OR_NOT_OWNER" } as never);

    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "找不到此配對,或你不是這張醫護卡的擁有者" });
  });
});
