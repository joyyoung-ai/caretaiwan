import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertPhotoMetadata, verifyPhotoOwnership } from "./record-photos";
import { getSupabaseAdmin } from "./supabase-server";

vi.mock("./supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
}));

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);

describe("record photo metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts photo ownership metadata", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    await expect(
      insertPhotoMetadata({
        path: "photo.jpg",
        uploaderLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "expense",
      })
    ).resolves.toEqual({ ok: true });

    expect(insert).toHaveBeenCalledWith({
      path: "photo.jpg",
      uploader_line_user_id: "user-1",
      elder_id: "elder-1",
      purpose: "expense",
    });
  });

  it("fails closed when metadata cannot be inserted", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: new Error("db down") }),
      }),
    } as never);

    await expect(
      insertPhotoMetadata({
        path: "photo.jpg",
        uploaderLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toEqual({ ok: false });
  });

  it("requires actor, elder, and purpose to match before accepting a photo path", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            uploader_line_user_id: "user-1",
            elder_id: "elder-1",
            purpose: "expense",
          },
        }),
      }),
    } as never);

    await expect(
      verifyPhotoOwnership({
        path: "photo.jpg",
        actorLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "expense",
      })
    ).resolves.toBe(true);
    await expect(
      verifyPhotoOwnership({
        path: "photo.jpg",
        actorLineUserId: "other-user",
        elderId: "elder-1",
        purpose: "expense",
      })
    ).resolves.toBe(false);
    await expect(
      verifyPhotoOwnership({
        path: "photo.jpg",
        actorLineUserId: "user-1",
        elderId: "other-elder",
        purpose: "expense",
      })
    ).resolves.toBe(false);
    await expect(
      verifyPhotoOwnership({
        path: "photo.jpg",
        actorLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toBe(false);
  });

  it("rejects legacy photos without metadata", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
    } as never);

    await expect(
      verifyPhotoOwnership({
        path: "legacy.jpg",
        actorLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toBe(false);
  });
});
