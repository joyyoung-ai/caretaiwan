import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasPhotoMetadata, insertPhotoMetadata, verifyPhotoOwnership } from "./record-photos";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

describe("record photo metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
  });

  it("inserts photo ownership metadata", async () => {
    queryMock.mockResolvedValueOnce([]);

    await expect(
      insertPhotoMetadata({
        path: "photo.jpg",
        uploaderLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "expense",
      })
    ).resolves.toEqual({ ok: true });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into record_photos"),
      ["photo.jpg", "user-1", "elder-1", "expense"]
    );
  });

  it("fails closed when metadata cannot be inserted", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));

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
    queryMock.mockResolvedValue([
      {
        uploader_line_user_id: "user-1",
        elder_id: "elder-1",
        purpose: "expense",
      },
    ]);

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
    queryMock.mockResolvedValueOnce([]);

    await expect(
      verifyPhotoOwnership({
        path: "legacy.jpg",
        actorLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toBe(false);
  });

  it("checks expense photo metadata by path, elder, and purpose", async () => {
    queryMock.mockResolvedValueOnce([{ path: "receipt.jpg" }]).mockResolvedValueOnce([]);

    await expect(
      hasPhotoMetadata({ path: "receipt.jpg", elderId: "elder-1", purpose: "expense" })
    ).resolves.toBe(true);
    await expect(
      hasPhotoMetadata({ path: "legacy.jpg", elderId: "elder-1", purpose: "expense" })
    ).resolves.toBe(false);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from record_photos"),
      ["receipt.jpg", "elder-1", "expense"]
    );
  });

  it("fails closed when database config is missing", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    await expect(
      insertPhotoMetadata({
        path: "photo.jpg",
        uploaderLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toEqual({ ok: false });
    await expect(
      verifyPhotoOwnership({
        path: "photo.jpg",
        actorLineUserId: "user-1",
        elderId: "elder-1",
        purpose: "record",
      })
    ).resolves.toBe(false);
    await expect(
      hasPhotoMetadata({ path: "photo.jpg", elderId: "elder-1", purpose: "record" })
    ).resolves.toBe(false);
    expect(queryMock).not.toHaveBeenCalled();
  });
});
