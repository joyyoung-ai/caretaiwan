import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOriginGet: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("@/lib/db/postgres", () => ({ query: vi.fn() }));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

function request(): Request {
  return new Request("https://care.example.test/api/cloud/download", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/cloud/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
  });

  it("loads only the signed-in user's cloud backup", async () => {
    queryMock.mockResolvedValueOnce([
      {
        data: { elderStore: { elders: [] } },
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ]);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("from cloud_backups"),
      ["family-1"]
    );
    expect(body).toEqual({
      data: { elderStore: { elders: [] } },
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in LINE user before reading backups", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns a generic server error when backup lookup fails", async () => {
    queryMock.mockRejectedValueOnce(new Error("raw backup lookup failure"));

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });
});
