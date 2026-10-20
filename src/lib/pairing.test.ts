import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindFamily,
  bindNotifyGroup,
  ensureGroupPairingCode,
  ensurePairing,
  generatePairingCode,
  getPairingByElderAndOwner,
  getPairingsByOwner,
  getPairingsByPaired,
  isPairingExpired,
  isSelfPairing,
  pairingExpiresAt,
  PAIRING_TTL_MS,
  setGroupPhotoEnabled,
  unbindCaregiver,
  unbindNotifyGroup,
} from "./pairing";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

const pairingRow = {
  elder_id: "elder-1",
  pairing_code: "ABCD23",
  paired_line_user_id: null,
  paired_at: null,
  owner_line_user_id: "family-1",
  display_name: "阿公",
  expires_at: "2026-08-01T00:00:00.000Z",
  created_at: "2026-07-01T00:00:00.000Z",
  notify_group_id: null,
  notify_group_bound_at: null,
  notify_group_photo: true,
  group_pairing_code: null,
  group_pairing_expires_at: null,
};

describe("pairing helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    isDatabaseEnabledMock.mockReturnValue(true);
    queryMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates readable 6-character pairing codes by default", () => {
    const code = generatePairingCode();

    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(code).not.toMatch(/[OI01]/);
  });

  it("sets pairing code expiry to 24 hours", () => {
    const now = Date.parse("2026-07-01T00:00:00.000Z");
    const expiresAt = pairingExpiresAt(now);

    expect(Date.parse(expiresAt) - now).toBe(PAIRING_TTL_MS);
    expect(PAIRING_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("treats expired codes as expired and empty expiry as active", () => {
    const now = Date.parse("2026-07-01T00:00:00.000Z");

    expect(
      isPairingExpired({ expires_at: "2026-06-30T23:59:59.999Z" }, now),
    ).toBe(true);
    expect(
      isPairingExpired({ expires_at: "2026-07-01T00:00:00.000Z" }, now),
    ).toBe(false);
    expect(isPairingExpired({ expires_at: null }, now)).toBe(false);
  });

  it("prevents a LINE user from pairing with their own elder", () => {
    expect(isSelfPairing("U-owner", "U-owner")).toBe(true);
    expect(isSelfPairing("U-owner", "U-caregiver")).toBe(false);
  });

  it("returns service disabled without querying when database config is missing", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    await expect(ensurePairing("elder-1", "family-1", "阿公")).resolves.toEqual({
      ok: false,
      error: "SERVICE_DISABLED",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("creates a new owner pairing through the Postgres adapter", async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pairingRow]);

    const result = await ensurePairing("elder-1", "family-1", "阿公");

    expect(result.ok).toBe(true);
    expect(result.pairing).toEqual(pairingRow);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into elder_pairings"),
      expect.arrayContaining(["elder-1", expect.any(String), "family-1", "阿公"])
    );
  });

  it("binds a caregiver with conditional Postgres update", async () => {
    queryMock
      .mockResolvedValueOnce([pairingRow])
      .mockResolvedValueOnce([{ ...pairingRow, paired_line_user_id: "caregiver-1" }]);

    const result = await bindFamily(" abcd23 ", "caregiver-1");

    expect(result.ok).toBe(true);
    expect(result.pairing?.paired_line_user_id).toBe("caregiver-1");
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("update elder_pairings"),
      expect.arrayContaining(["ABCD23", "caregiver-1"])
    );
  });

  it("rejects self-pairing before conditional update", async () => {
    queryMock.mockResolvedValueOnce([pairingRow]);

    await expect(bindFamily("ABCD23", "family-1")).resolves.toEqual({
      ok: false,
      error: "SELF_PAIRING_NOT_ALLOWED",
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an expired pairing without attempting a write", async () => {
    vi.setSystemTime(new Date("2026-08-01T00:00:00.001Z"));
    queryMock.mockResolvedValueOnce([pairingRow]);

    await expect(bindFamily("ABCD23", "caregiver-1")).resolves.toEqual({
      ok: false,
      error: "ALREADY_PAIRED_OR_EXPIRED",
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("lists owner and paired records through direct Postgres", async () => {
    queryMock.mockResolvedValueOnce([pairingRow]).mockResolvedValueOnce([
      { ...pairingRow, paired_line_user_id: "caregiver-1" },
    ]);

    await expect(getPairingsByOwner("family-1")).resolves.toEqual([pairingRow]);
    await expect(getPairingsByPaired("caregiver-1")).resolves.toHaveLength(1);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("owner_line_user_id = $1"),
      ["family-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("paired_line_user_id = $1"),
      ["caregiver-1"]
    );
  });

  it("unbinds caregiver and refreshes pairing expiry guard through Postgres", async () => {
    queryMock.mockResolvedValueOnce([pairingRow]);

    await expect(unbindCaregiver("elder-1", "family-1")).resolves.toEqual({ ok: true });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("set paired_line_user_id = null"),
      expect.arrayContaining(["elder-1", "family-1"])
    );
  });

  it("creates and binds group pairing state through direct Postgres", async () => {
    queryMock
      .mockResolvedValueOnce([pairingRow])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pairingRow])
      .mockResolvedValueOnce([{ ...pairingRow, notify_group_id: "group-1" }]);

    await expect(ensureGroupPairingCode("elder-1", "family-1")).resolves.toEqual({
      ok: true,
      code: expect.any(String),
    });
    await expect(bindNotifyGroup("GROUP1", "group-1")).resolves.toEqual({
      ok: true,
      pairing: { ...pairingRow, notify_group_id: "group-1" },
    });
  });

  it("updates group photo and owner status through direct Postgres", async () => {
    queryMock
      .mockResolvedValueOnce([pairingRow])
      .mockResolvedValueOnce([pairingRow])
      .mockResolvedValueOnce([{ ...pairingRow, notify_group_photo: false }]);

    await expect(setGroupPhotoEnabled("elder-1", "family-1", false)).resolves.toEqual({ ok: true });
    await expect(getPairingByElderAndOwner("elder-1", "family-1")).resolves.toEqual(pairingRow);
    await expect(unbindNotifyGroup("elder-1", "family-1")).resolves.toEqual({ ok: true });
  });
});
