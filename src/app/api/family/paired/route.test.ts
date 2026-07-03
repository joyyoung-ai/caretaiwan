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

const authMock = vi.mocked(auth);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/family/paired", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/family/paired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
  });

  it("queries pairings by signed-in caregiver and returns only matching elder cards", async () => {
    const pairingEq = vi.fn().mockResolvedValue({
      data: [
        {
          elder_id: "elder-1",
          display_name: "阿公",
          paired_at: "2026-07-01T00:00:00.000Z",
          owner_line_user_id: "family-1",
          notify_group_id: "group-1",
        },
      ],
      error: null,
    });
    const backupIn = vi.fn().mockResolvedValue({
      data: [
        {
          line_user_id: "family-1",
          display_name: "家屬",
          data: {
            elderStore: {
              elders: [
                { id: "elder-1", name: "阿公" },
                { id: "elder-2", name: "不該回傳" },
              ],
            },
          },
        },
      ],
      error: null,
    });

    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "elder_pairings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: pairingEq,
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: backupIn,
        };
      }),
    } as never);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(pairingEq).toHaveBeenCalledWith("paired_line_user_id", "caregiver-1");
    expect(backupIn).toHaveBeenCalledWith("line_user_id", ["family-1"]);
    expect(body.items).toEqual([
      {
        elderId: "elder-1",
        displayName: "阿公",
        pairedAt: "2026-07-01T00:00:00.000Z",
        caregiverName: "家屬",
        card: { id: "elder-1", name: "阿公" },
        hasGroup: true,
      },
    ]);
  });

  it("returns a generic server error when pairing lookup fails", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "raw pairing query failure" },
        }),
      })),
    } as never);

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in caregiver before reading paired elders", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });
});
