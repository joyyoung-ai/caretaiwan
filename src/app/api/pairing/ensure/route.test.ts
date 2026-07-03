import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { ensurePairing } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  ensurePairing: vi.fn(),
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
const ensurePairingMock = vi.mocked(ensurePairing);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/pairing/ensure", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pairing/ensure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    ensurePairingMock.mockResolvedValue({
      ok: true,
      code: "ABCD23",
      pairing: { paired_line_user_id: null },
    } as never);
  });

  it("requires elderId before creating a pairing code", async () => {
    const res = await POST(jsonRequest({ displayName: "阿公" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "缺少 elderId" });
    expect(ensurePairingMock).not.toHaveBeenCalled();
  });

  it("creates or fetches a pairing code for the signed-in family owner", async () => {
    const res = await POST(jsonRequest({ elderId: "elder-1", displayName: "阿公" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, code: "ABCD23", paired: false });
    expect(ensurePairingMock).toHaveBeenCalledWith("elder-1", "family-1", "阿公");
  });
});
