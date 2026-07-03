import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { verifyExpense } from "@/lib/expense";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/expense", () => ({
  verifyExpense: vi.fn(),
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
const verifyExpenseMock = vi.mocked(verifyExpense);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/expense/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/expense/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    verifyExpenseMock.mockResolvedValue({ ok: true } as never);
  });

  it("requires a reason before marking an expense as disputed", async () => {
    const res = await POST(
      jsonRequest({
        expenseId: 123,
        status: "disputed",
        note: " ",
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "標記有問題時請填寫原因" });
    expect(verifyExpenseMock).not.toHaveBeenCalled();
  });

  it("verifies expenses using the signed-in family user id", async () => {
    const res = await POST(
      jsonRequest({
        expenseId: 123,
        status: "confirmed",
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(verifyExpenseMock).toHaveBeenCalledWith(123, "family-1", "confirmed", undefined);
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await POST(jsonRequest({ expenseId: 123, status: "confirmed" }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in family user before verifying expenses", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(jsonRequest({ expenseId: 123, status: "confirmed" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(verifyExpenseMock).not.toHaveBeenCalled();
  });

  it("returns a generic user-facing error when verification fails", async () => {
    verifyExpenseMock.mockResolvedValue({ ok: false, error: "raw verify failure" } as never);

    const res = await POST(jsonRequest({ expenseId: 123, status: "confirmed" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "核帳失敗" });
  });
});
