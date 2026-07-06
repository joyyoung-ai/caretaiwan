import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { createExpense } from "@/lib/expense";
import { getPairingsByPaired } from "@/lib/pairing";
import { checkSameOrigin } from "@/lib/origin-check";
import { rateLimitAsync } from "@/lib/rate-limit";
import { isDatabaseEnabled } from "@/lib/db/client";
import { verifyPhotoOwnership } from "@/lib/record-photos";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/expense", () => {
  const validCategories = new Set(["med", "supply", "food", "medical", "other"]);
  return {
    createExpense: vi.fn(),
    sanitizeAmount: vi.fn((amount: unknown) => {
      const n = typeof amount === "number" ? amount : Number(amount);
      return Number.isFinite(n) && n >= 0 ? n : null;
    }),
    isValidCategory: vi.fn((category: unknown) => validCategories.has(String(category))),
  };
});

vi.mock("@/lib/pairing", () => ({
  getPairingsByPaired: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseEnabled: vi.fn(),
}));

vi.mock("@/lib/record-photos", () => ({
  verifyPhotoOwnership: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

vi.mock("@/app/actions/expense-push", () => ({
  pushExpenseToFamily: vi.fn(),
}));

const authMock = vi.mocked(auth);
const createExpenseMock = vi.mocked(createExpense);
const getPairingsByPairedMock = vi.mocked(getPairingsByPaired);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const rateLimitAsyncMock = vi.mocked(rateLimitAsync);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const verifyPhotoOwnershipMock = vi.mocked(verifyPhotoOwnership);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/expense/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/expense/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    rateLimitAsyncMock.mockResolvedValue({ ok: true, remaining: 9, resetAt: Date.now() + 60_000 });
    getPairingsByPairedMock.mockResolvedValue([
      {
        elder_id: "elder-1",
        owner_line_user_id: "family-1",
        display_name: "阿公",
      },
    ] as never);
  });

  it("rejects unowned photo paths before creating an expense", async () => {
    verifyPhotoOwnershipMock.mockResolvedValue(false);

    const res = await POST(
      jsonRequest({
        elderId: "elder-1",
        itemName: "藥品",
        amount: 120,
        category: "medical",
        photoPath: "other-user-photo.jpg",
      })
    );

    await expect(res.json()).resolves.toEqual({ error: "照片不屬於此看護或此卡" });
    expect(res.status).toBe(403);
    expect(verifyPhotoOwnershipMock).toHaveBeenCalledWith({
      path: "other-user-photo.jpg",
      actorLineUserId: "caregiver-1",
      elderId: "elder-1",
      purpose: "expense",
    });
    expect(createExpenseMock).not.toHaveBeenCalled();
  });

  it("rejects expenses for elders that are not paired to the caregiver", async () => {
    getPairingsByPairedMock.mockResolvedValue([] as never);

    const res = await POST(
      jsonRequest({
        elderId: "elder-1",
        itemName: "藥品",
        amount: 120,
        category: "medical",
      })
    );

    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
    expect(res.status).toBe(403);
    expect(verifyPhotoOwnershipMock).not.toHaveBeenCalled();
    expect(createExpenseMock).not.toHaveBeenCalled();
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in caregiver before creating expenses", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(jsonRequest({ elderId: "elder-1" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(rateLimitAsyncMock).not.toHaveBeenCalled();
    expect(createExpenseMock).not.toHaveBeenCalled();
  });
});
