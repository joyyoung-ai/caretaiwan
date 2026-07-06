import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { pushRecordToFamily } from "./push-actions";
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { getPairingsByPaired } from "@/lib/pairing";
import { verifyPhotoOwnership } from "@/lib/record-photos";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";
import { query } from "@/lib/db/postgres";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/line-bot", () => ({
  isLineBotEnabled: vi.fn(),
  pushMessage: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  getPairingsByPaired: vi.fn(),
}));

vi.mock("@/lib/record-photos", () => ({
  verifyPhotoOwnership: vi.fn(),
}));

vi.mock("@/lib/local-photo-storage", () => ({
  createLocalSignedPhotoUrl: vi.fn(),
}));

vi.mock("@/lib/db/postgres", () => ({
  query: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const isLineBotEnabledMock = vi.mocked(isLineBotEnabled);
const pushMessageMock = vi.mocked(pushMessage);
const getPairingsByPairedMock = vi.mocked(getPairingsByPaired);
const verifyPhotoOwnershipMock = vi.mocked(verifyPhotoOwnership);
const createLocalSignedPhotoUrlMock = vi.mocked(createLocalSignedPhotoUrl);
const queryMock = vi.mocked(query);

describe("pushRecordToFamily", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    isLineBotEnabledMock.mockReturnValue(true);
    pushMessageMock.mockResolvedValue({ ok: true, status: 200 });
    getPairingsByPairedMock.mockResolvedValue([
      {
        elder_id: "elder-1",
        owner_line_user_id: "family-1",
        notify_group_id: "group-1",
        notify_group_photo: true,
      },
    ] as never);
    verifyPhotoOwnershipMock.mockResolvedValue(true);
    createLocalSignedPhotoUrlMock.mockReturnValue("https://care.example.test/api/photo/signed/token");
    queryMock.mockResolvedValue([]);
  });

  it("uses local signed photo URLs for family and group push messages", async () => {
    const result = await pushRecordToFamily({
      elderId: "elder-1",
      recordType: "temp",
      value: "36.5",
      timestamp: Date.parse("2026-07-06T01:00:00.000Z"),
      photoPath: "record.png",
      alsoSendToGroup: true,
    });

    expect(result).toEqual({ ok: true, groupSent: true });
    expect(createLocalSignedPhotoUrlMock).toHaveBeenCalledWith("record.png", 60 * 60);
    expect(pushMessageMock).toHaveBeenCalledTimes(2);
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
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into push_logs"),
      expect.arrayContaining(["elder-1", "family-1", "temp", "sent"])
    );
  });

  it("skips photos when local signing is unavailable", async () => {
    createLocalSignedPhotoUrlMock.mockReturnValue(null);

    await pushRecordToFamily({
      elderId: "elder-1",
      recordType: "temp",
      value: "36.5",
      timestamp: Date.parse("2026-07-06T01:00:00.000Z"),
      photoPath: "record.png",
    });

    const [, messages] = pushMessageMock.mock.calls[0]!;
    expect(messages).toHaveLength(1);
  });
});
