import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { rateLimitAsync } from "@/lib/rate-limit";
import { getPairingsByPaired } from "@/lib/pairing";
import { insertPhotoMetadata } from "@/lib/record-photos";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";
import {
  deleteLocalPhoto,
  isLocalPhotoStorageEnabled,
  saveLocalPhoto,
} from "@/lib/local-photo-storage";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  getPairingsByPaired: vi.fn(),
}));

vi.mock("@/lib/record-photos", () => ({
  insertPhotoMetadata: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/local-photo-storage", () => ({
  deleteLocalPhoto: vi.fn(),
  isLocalPhotoStorageEnabled: vi.fn(() => false),
  saveLocalPhoto: vi.fn(),
}));

vi.mock("@/lib/photo-format", async () => {
  return await import("../../../../lib/photo-format");
});

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const rateLimitAsyncMock = vi.mocked(rateLimitAsync);
const getPairingsByPairedMock = vi.mocked(getPairingsByPaired);
const insertPhotoMetadataMock = vi.mocked(insertPhotoMetadata);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const deleteLocalPhotoMock = vi.mocked(deleteLocalPhoto);
const isLocalPhotoStorageEnabledMock = vi.mocked(isLocalPhotoStorageEnabled);
const saveLocalPhotoMock = vi.mocked(saveLocalPhoto);

const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

function formRequest(elderId = "elder-1"): Request {
  const body = new FormData();
  body.set("photo", new Blob([pngBytes], { type: "image/png" }), "photo.png");
  body.set("elderId", elderId);
  body.set("purpose", "record");
  return new Request("https://care.example.test/api/photo/upload", {
    method: "POST",
    headers: { Origin: "https://care.example.test" },
    body,
  });
}

function formRequestWithBlob(photo: Blob, elderId = "elder-1"): Request {
  const body = new FormData();
  body.set("photo", photo, "photo.png");
  body.set("elderId", elderId);
  body.set("purpose", "record");
  return new Request("https://care.example.test/api/photo/upload", {
    method: "POST",
    headers: { Origin: "https://care.example.test" },
    body,
  });
}

describe("POST /api/photo/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    rateLimitAsyncMock.mockResolvedValue({ ok: true, remaining: 9, resetAt: Date.now() + 60_000 });
    insertPhotoMetadataMock.mockResolvedValue({ ok: true });
    getSupabaseAdminMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    } as never);
    isLocalPhotoStorageEnabledMock.mockReturnValue(false);
  });

  it("rejects uploads for elders not paired to the signed-in caregiver before storage writes", async () => {
    getPairingsByPairedMock.mockResolvedValue([] as never);

    const res = await POST(formRequest("elder-1"));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
    expect(insertPhotoMetadataMock).not.toHaveBeenCalled();
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("records metadata for uploaded photos using the signed-in caregiver and requested elder", async () => {
    getPairingsByPairedMock.mockResolvedValue([{ elder_id: "elder-1" }] as never);

    const res = await POST(formRequest("elder-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.path).toMatch(/^[a-f0-9-]+\.png$/);
    expect(insertPhotoMetadataMock).toHaveBeenCalledWith({
      path: body.path,
      uploaderLineUserId: "caregiver-1",
      elderId: "elder-1",
      purpose: "record",
    });
  });

  it("rejects forged image MIME types with invalid bytes before storage writes", async () => {
    getPairingsByPairedMock.mockResolvedValue([{ elder_id: "elder-1" }] as never);

    const res = await POST(
      formRequestWithBlob(new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }))
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "檔案不是合法圖片" });
    expect(insertPhotoMetadataMock).not.toHaveBeenCalled();
  });

  it("rolls back local photo storage when metadata insertion fails", async () => {
    getPairingsByPairedMock.mockResolvedValue([{ elder_id: "elder-1" }] as never);
    isLocalPhotoStorageEnabledMock.mockReturnValue(true);
    saveLocalPhotoMock.mockResolvedValue();
    insertPhotoMetadataMock.mockResolvedValue({ ok: false });

    const res = await POST(formRequest("elder-1"));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "儲存失敗" });
    expect(deleteLocalPhotoMock).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9-]+\.png$/));
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await POST(formRequest("elder-1"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "雲端服務未啟用" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in caregiver before uploading photos", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(formRequest("elder-1"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(rateLimitAsyncMock).not.toHaveBeenCalled();
    expect(getPairingsByPairedMock).not.toHaveBeenCalled();
  });

  it("returns a generic storage error when Supabase upload fails", async () => {
    getPairingsByPairedMock.mockResolvedValue([{ elder_id: "elder-1" }] as never);
    getSupabaseAdminMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: { message: "raw storage failure" } }),
        })),
      },
    } as never);

    const res = await POST(formRequest("elder-1"));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "儲存失敗" });
    expect(insertPhotoMetadataMock).not.toHaveBeenCalled();
  });
});
