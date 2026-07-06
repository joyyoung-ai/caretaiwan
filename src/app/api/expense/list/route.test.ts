import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { listExpensesForCard } from "@/lib/expense";
import { checkSameOriginGet } from "@/lib/origin-check";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";
import { isDatabaseEnabled } from "@/lib/db/client";
import { hasPhotoMetadata } from "@/lib/record-photos";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/expense", () => ({
  listExpensesForCard: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOriginGet: vi.fn(),
}));

vi.mock("@/lib/local-photo-storage", () => ({
  createLocalSignedPhotoUrl: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  isDatabaseEnabled: vi.fn(),
}));

vi.mock("@/lib/record-photos", () => ({
  hasPhotoMetadata: vi.fn(),
}));

const authMock = vi.mocked(auth);
const listExpensesForCardMock = vi.mocked(listExpensesForCard);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const createLocalSignedPhotoUrlMock = vi.mocked(createLocalSignedPhotoUrl);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const hasPhotoMetadataMock = vi.mocked(hasPhotoMetadata);

function request(): Request {
  return new Request("https://care.example.test/api/expense/list?elderId=elder-1", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/expense/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "viewer-1" } } as never);
    listExpensesForCardMock.mockResolvedValue({
      ok: true,
      expenses: [
        {
          id: 1,
          elder_id: "elder-1",
          photo_path: "receipt.jpg",
          item_name: "藥品",
        },
      ],
    } as never);
    createLocalSignedPhotoUrlMock.mockReturnValue("https://care.example.test/api/photo/signed/token");
    hasPhotoMetadataMock.mockResolvedValue(true);
  });

  it("does not sign expense photo paths without matching metadata", async () => {
    hasPhotoMetadataMock.mockResolvedValue(false);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses[0].photoUrl).toBeNull();
    expect(createLocalSignedPhotoUrlMock).not.toHaveBeenCalled();
  });

  it("signs expense photo paths only after elder and purpose metadata match", async () => {
    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses[0].photoUrl).toBe("https://care.example.test/api/photo/signed/token");
    expect(hasPhotoMetadataMock).toHaveBeenCalledWith({
      path: "receipt.jpg",
      elderId: "elder-1",
      purpose: "expense",
    });
    expect(createLocalSignedPhotoUrlMock).toHaveBeenCalledWith("receipt.jpg", 60 * 60);
  });

  it("does not expose photo URLs when local signing is disabled", async () => {
    createLocalSignedPhotoUrlMock.mockReturnValue(null);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses[0].photoUrl).toBeNull();
  });

  it("returns a generic error when expense lookup fails", async () => {
    listExpensesForCardMock.mockResolvedValue({ ok: false } as never);

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "查詢失敗" });
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await GET(request());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in viewer before listing expenses", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET(request());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(listExpensesForCardMock).not.toHaveBeenCalled();
  });
});
