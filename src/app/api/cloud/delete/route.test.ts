import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("@/lib/db/postgres", () => ({ query: vi.fn() }));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

function request(): Request {
  return new Request("https://care.example.test/api/cloud/delete", {
    method: "POST",
    headers: { Origin: "https://care.example.test" },
  });
}

describe("POST /api/cloud/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "user-1" } } as never);
    queryMock.mockResolvedValue([]);
  });

  it("deletes and unpairs only records tied to the signed-in user", async () => {
    const res = await POST(request());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("delete from cloud_backups"),
      ["user-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("delete from elder_pairings"),
      ["user-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("update elder_pairings"),
      ["user-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("delete from push_logs"),
      ["user-1"]
    );
  });

  it("returns a generic server error when any deletion step fails", async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("raw pairing delete failure"));

    const res = await POST(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await POST(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in LINE user before deleting cloud data", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
