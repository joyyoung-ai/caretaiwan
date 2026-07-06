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

const authMock = vi.mocked(auth);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

function request(): Request {
  return new Request("https://care.example.test/api/family/paired", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/family/paired", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
  });

  it("queries pairings by signed-in caregiver and returns only matching elder cards", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          elder_id: "elder-1",
          display_name: "阿公",
          paired_at: "2026-07-01T00:00:00.000Z",
          owner_line_user_id: "family-1",
          notify_group_id: "group-1",
        },
      ])
      .mockResolvedValueOnce([
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
      ]);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from elder_pairings"),
      ["caregiver-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from cloud_backups"),
      [["family-1"]]
    );
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
    queryMock.mockRejectedValueOnce(new Error("raw pairing query failure"));

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in caregiver before reading paired elders", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
