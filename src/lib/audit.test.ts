import { describe, expect, it } from "vitest";
import { sanitizeMetadata } from "./audit";

describe("sanitizeMetadata", () => {
  it("redacts common PII metadata keys, including camelCase keys", () => {
    expect(
      sanitizeMetadata({
        name: "A",
        displayName: "Caregiver",
        elderName: "Elder",
        itemName: "Medication",
        verifyNote: "private note",
        reason: "NOT_PAIRED",
      })
    ).toEqual({
      name: "[redacted]",
      displayName: "[redacted]",
      elderName: "[redacted]",
      itemName: "[redacted]",
      verifyNote: "[redacted]",
      reason: "NOT_PAIRED",
    });
  });

  it("truncates long string metadata values", () => {
    const clean = sanitizeMetadata({ reason: "x".repeat(105) });

    expect(clean?.reason).toBe(`${"x".repeat(100)}...`);
  });

  it("returns null when metadata is not provided", () => {
    expect(sanitizeMetadata(undefined)).toBeNull();
  });
});
