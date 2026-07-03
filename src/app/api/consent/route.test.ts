import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit } from "@/lib/audit";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const logAuditMock = vi.mocked(logAudit);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    authMock.mockResolvedValue(null as never);
  });

  it("records anonymous consent before login", async () => {
    const res = await POST(jsonRequest({ version: 2, sensitiveDataConsent: true }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AUTH_CONSENT",
        actorLineUserId: null,
        resourceType: "consent",
        resourceId: "v2",
        status: "ok",
        metadata: { version: 2, sensitiveDataConsent: true },
      })
    );
  });

  it("records signed-in consent with the actor LINE user id", async () => {
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);

    const res = await POST(jsonRequest({ version: 3, sensitiveDataConsent: false }));

    expect(res.status).toBe(200);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actorLineUserId: "family-1",
        resourceId: "v3",
        metadata: { version: 3, sensitiveDataConsent: false },
      })
    );
  });

  it("records consent revocation separately", async () => {
    const res = await POST(jsonRequest({ version: 2, revoke: true }));

    expect(res.status).toBe(200);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AUTH_CONSENT_REVOKE",
        resourceId: "v2",
      })
    );
  });

  it("blocks cross-origin consent writes before reading the body", async () => {
    checkSameOriginMock.mockReturnValue(NextResponse.json({ error: "forbidden" }, { status: 403 }));

    const res = await POST(jsonRequest({ version: 2, sensitiveDataConsent: true }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "forbidden" });
    expect(authMock).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });
});
