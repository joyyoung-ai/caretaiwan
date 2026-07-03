import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { ensureGroupPairingCode } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  ensureGroupPairingCode: vi.fn(),
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
const ensureGroupPairingCodeMock = vi.mocked(ensureGroupPairingCode);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/pairing/group-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pairing/group-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    ensureGroupPairingCodeMock.mockResolvedValue({ ok: true, code: "GROUP1" } as never);
  });

  it("creates group pairing codes using the signed-in family owner id", async () => {
    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, code: "GROUP1" });
    expect(ensureGroupPairingCodeMock).toHaveBeenCalledWith("elder-1", "family-1");
  });

  it("does not expose a code when the group is already bound", async () => {
    ensureGroupPairingCodeMock.mockResolvedValue({ ok: true, alreadyBound: true, code: "GROUP1" } as never);

    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, alreadyBound: true });
  });
});
