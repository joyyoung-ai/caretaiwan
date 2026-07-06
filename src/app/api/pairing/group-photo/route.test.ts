import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { setGroupPhotoEnabled } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  setGroupPhotoEnabled: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseEnabled: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const setGroupPhotoEnabledMock = vi.mocked(setGroupPhotoEnabled);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/pairing/group-photo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pairing/group-photo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    setGroupPhotoEnabledMock.mockResolvedValue({ ok: true } as never);
  });

  it("requires an explicit boolean enabled value", async () => {
    const res = await POST(jsonRequest({ elderId: "elder-1", enabled: "false" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "缺少參數" });
    expect(setGroupPhotoEnabledMock).not.toHaveBeenCalled();
  });

  it("updates group photo sharing using the signed-in family owner id", async () => {
    const res = await POST(jsonRequest({ elderId: "elder-1", enabled: false }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(setGroupPhotoEnabledMock).toHaveBeenCalledWith("elder-1", "family-1", false);
  });

  it("returns 503 when cloud services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await POST(jsonRequest({ elderId: "elder-1", enabled: false }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in family user before updating group photo sharing", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(jsonRequest({ elderId: "elder-1", enabled: false }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(setGroupPhotoEnabledMock).not.toHaveBeenCalled();
  });

  it("maps update failures to a generic user-facing error", async () => {
    setGroupPhotoEnabledMock.mockResolvedValue({ ok: false, error: "raw database failure" } as never);

    const res = await POST(jsonRequest({ elderId: "elder-1", enabled: false }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });
});
