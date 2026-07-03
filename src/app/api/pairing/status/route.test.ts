import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { getPairingByElderAndOwner } from "@/lib/pairing";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  getPairingByElderAndOwner: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOriginGet: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  isCloudEnabled: vi.fn(),
}));

const authMock = vi.mocked(auth);
const getPairingByElderAndOwnerMock = vi.mocked(getPairingByElderAndOwner);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/pairing/status?elderId=elder-1", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/pairing/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
  });

  it("loads pairing status using the signed-in family owner id", async () => {
    getPairingByElderAndOwnerMock.mockResolvedValue({
      paired_line_user_id: "caregiver-1",
      notify_group_id: "group-1",
      notify_group_bound_at: "2026-07-01T00:00:00.000Z",
      notify_group_photo: false,
      group_pairing_code: "ABC123",
      group_pairing_expires_at: new Date(Date.now() + 60_000).toISOString(),
    } as never);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getPairingByElderAndOwnerMock).toHaveBeenCalledWith("elder-1", "family-1");
    expect(body).toMatchObject({
      ok: true,
      exists: true,
      paired: true,
      groupBound: true,
      groupPhotoEnabled: false,
      groupPairingCode: "ABC123",
    });
  });

  it("does not return expired group pairing codes", async () => {
    getPairingByElderAndOwnerMock.mockResolvedValue({
      paired_line_user_id: null,
      notify_group_id: null,
      notify_group_bound_at: null,
      notify_group_photo: true,
      group_pairing_code: "OLD123",
      group_pairing_expires_at: new Date(Date.now() - 60_000).toISOString(),
    } as never);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.groupPairingCode).toBeNull();
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in family user before reading pairing status", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(getPairingByElderAndOwnerMock).not.toHaveBeenCalled();
  });
});
