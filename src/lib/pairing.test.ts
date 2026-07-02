import { describe, expect, it } from "vitest";
import {
  generatePairingCode,
  isPairingExpired,
  isSelfPairing,
  pairingExpiresAt,
  PAIRING_TTL_MS,
} from "./pairing";

describe("pairing helpers", () => {
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
});
