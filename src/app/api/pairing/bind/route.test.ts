import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { bindFamily } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { rateLimitAsync } from "@/lib/rate-limit";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  bindFamily: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const bindFamilyMock = vi.mocked(bindFamily);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const rateLimitAsyncMock = vi.mocked(rateLimitAsync);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/pairing/bind", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pairing/bind", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    rateLimitAsyncMock.mockResolvedValue({ ok: true, remaining: 4, resetAt: Date.now() + 60_000 });
    bindFamilyMock.mockResolvedValue({
      ok: true,
      pairing: { elder_id: "elder-1", display_name: "阿公" },
    } as never);
  });

  it("rejects malformed pairing codes before binding", async () => {
    const res = await POST(jsonRequest({ code: "O0I1" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "配對碼格式錯誤" });
    expect(bindFamilyMock).not.toHaveBeenCalled();
  });

  it("normalizes the pairing code and binds it to the signed-in caregiver", async () => {
    const res = await POST(jsonRequest({ code: " abcd23 " }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, elderName: "阿公" });
    expect(bindFamilyMock).toHaveBeenCalledWith("ABCD23", "caregiver-1");
  });

  it("does not attempt binding after rate limit is exceeded", async () => {
    rateLimitAsyncMock.mockResolvedValueOnce({ ok: false, remaining: 0, resetAt: Date.now() + 60_000 });

    const res = await POST(jsonRequest({ code: "ABCD23" }));

    expect(res.status).toBe(429);
    expect(bindFamilyMock).not.toHaveBeenCalled();
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await POST(jsonRequest({ code: "ABCD23" }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in caregiver before binding", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(jsonRequest({ code: "ABCD23" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(rateLimitAsyncMock).not.toHaveBeenCalled();
    expect(bindFamilyMock).not.toHaveBeenCalled();
  });
});
