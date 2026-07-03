import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
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
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

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
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "user-1" } } as never);
  });

  it("deletes and unpairs only records tied to the signed-in user", async () => {
    const filters: Array<[string, string]> = [];
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn((column: string, value: string) => {
          filters.push([column, value]);
          return Promise.resolve({ error: null });
        }),
      })),
    } as never);

    const res = await POST(request());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(filters).toEqual([
      ["line_user_id", "user-1"],
      ["owner_line_user_id", "user-1"],
      ["paired_line_user_id", "user-1"],
      ["line_user_id", "user-1"],
    ]);
  });

  it("returns a generic server error when any deletion step fails", async () => {
    let call = 0;
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn(() => {
          call += 1;
          return Promise.resolve({
            error: call === 2 ? { message: "raw pairing delete failure" } : null,
          });
        }),
      })),
    } as never);

    const res = await POST(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await POST(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in LINE user before deleting cloud data", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });
});
