import { beforeEach, describe, expect, it, vi } from "vitest";
import { pushExpenseToFamily } from "./expense-push";
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { verifyPhotoOwnership } from "@/lib/record-photos";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";

vi.mock("@/lib/line-bot", () => ({
  isLineBotEnabled: vi.fn(),
  pushMessage: vi.fn(),
}));

vi.mock("@/lib/record-photos", () => ({
  verifyPhotoOwnership: vi.fn(),
}));

vi.mock("@/lib/local-photo-storage", () => ({
  createLocalSignedPhotoUrl: vi.fn(),
}));

vi.mock("@/lib/expense", () => ({
  CATEGORY_META: {
    medical: { icon: "M", labelZh: "醫療" },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const isLineBotEnabledMock = vi.mocked(isLineBotEnabled);
const pushMessageMock = vi.mocked(pushMessage);
const verifyPhotoOwnershipMock = vi.mocked(verifyPhotoOwnership);
const createLocalSignedPhotoUrlMock = vi.mocked(createLocalSignedPhotoUrl);

describe("pushExpenseToFamily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLineBotEnabledMock.mockReturnValue(true);
    pushMessageMock.mockResolvedValue({ ok: true, status: 200 });
    verifyPhotoOwnershipMock.mockResolvedValue(true);
    createLocalSignedPhotoUrlMock.mockReturnValue("https://care.example.test/api/photo/signed/token");
  });

  it("uses local signed photo URLs and does not need Supabase Storage", async () => {
    const result = await pushExpenseToFamily({
      expenseId: 1,
      actorLineUserId: "caregiver-1",
      elderId: "elder-1",
      ownerLineUserId: "family-1",
      elderName: "阿公",
      itemName: "藥品",
      amount: 120,
      category: "medical",
      photoPath: "receipt.png",
    });

    expect(result).toEqual({ ok: true });
    expect(createLocalSignedPhotoUrlMock).toHaveBeenCalledWith("receipt.png", 60 * 60);
    expect(pushMessageMock).toHaveBeenCalledWith(
      "family-1",
      expect.arrayContaining([
        {
          type: "image",
          originalContentUrl: "https://care.example.test/api/photo/signed/token",
          previewImageUrl: "https://care.example.test/api/photo/signed/token",
        },
      ])
    );
  });

  it("skips the photo when local signing is unavailable", async () => {
    createLocalSignedPhotoUrlMock.mockReturnValue(null);

    await pushExpenseToFamily({
      expenseId: 1,
      actorLineUserId: "caregiver-1",
      elderId: "elder-1",
      ownerLineUserId: "family-1",
      elderName: "阿公",
      itemName: "藥品",
      amount: 120,
      category: "medical",
      photoPath: "receipt.png",
    });

    const [, messages] = pushMessageMock.mock.calls[0]!;
    expect(messages).toHaveLength(1);
  });
});
