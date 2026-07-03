import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { listExpensesForCard } from "@/lib/expense";
import { checkSameOriginGet } from "@/lib/origin-check";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";

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

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

const authMock = vi.mocked(auth);
const listExpensesForCardMock = vi.mocked(listExpensesForCard);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const createLocalSignedPhotoUrlMock = vi.mocked(createLocalSignedPhotoUrl);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/expense/list?elderId=elder-1", {
    headers: { Origin: "https://care.example.test" },
  });
}

function supabaseWithPhotoMetadata(data: unknown) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://storage.example.test/signed.jpg" },
          error: null,
        }),
      })),
    },
  };
}

describe("GET /api/expense/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
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
  });

  it("does not sign expense photo paths without matching metadata", async () => {
    getSupabaseAdminMock.mockReturnValue(supabaseWithPhotoMetadata(null) as never);

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses[0].photoUrl).toBeNull();
    expect(createLocalSignedPhotoUrlMock).not.toHaveBeenCalled();
  });

  it("signs expense photo paths only after elder and purpose metadata match", async () => {
    getSupabaseAdminMock.mockReturnValue(
      supabaseWithPhotoMetadata({ elder_id: "elder-1", purpose: "expense" }) as never
    );

    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expenses[0].photoUrl).toBe("https://care.example.test/api/photo/signed/token");
    expect(createLocalSignedPhotoUrlMock).toHaveBeenCalledWith("receipt.jpg", 60 * 60);
  });

  it("returns a generic error when expense lookup fails", async () => {
    listExpensesForCardMock.mockResolvedValue({ ok: false } as never);

    const res = await GET(request());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "查詢失敗" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });
});
