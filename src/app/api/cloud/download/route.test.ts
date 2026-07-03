import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { checkSameOriginGet } from "@/lib/origin-check";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOriginGet: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/cloud/download", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/cloud/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
  });

  it("loads only the signed-in user's cloud backup", async () => {
    const eq = vi.fn().mockReturnThis();
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq,
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            data: { elderStore: { elders: [] } },
            updated_at: "2026-07-01T00:00:00.000Z",
          },
          error: null,
        }),
      })),
    } as never);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("line_user_id", "family-1");
    expect(body).toEqual({
      data: { elderStore: { elders: [] } },
      updatedAt: "2026-07-01T00:00:00.000Z",
    });
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in LINE user before reading backups", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("returns a generic server error when backup lookup fails", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "raw backup lookup failure" },
        }),
      })),
    } as never);

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });
});
