import { beforeEach, describe, expect, it, vi } from "vitest";
import { logAudit, sanitizeMetadata } from "./audit";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

describe("sanitizeMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
    queryMock.mockResolvedValue([]);
  });

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

  it("writes sanitized audit rows through the Postgres adapter", async () => {
    logAudit({
      action: "CARE_EVENT_CREATE",
      actorLineUserId: "line-user-1",
      actorIp: "203.0.113.55",
      resourceType: "care_event",
      resourceId: "event-1",
      status: "ok",
      metadata: { elderName: "Elder", reason: "created" },
    });

    await vi.waitFor(() => {
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining("insert into audit_logs"),
        [
          "line-user-1",
          "203.0.113.0",
          "CARE_EVENT_CREATE",
          "care_event",
          "event-1",
          "ok",
          { elderName: "[redacted]", reason: "created" },
        ]
      );
    });
  });

  it("does not write audit rows when database config is disabled", () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    logAudit({ action: "AUTH_LOGIN", actorIp: "2001:db8:1:2:3:4:5:6" });

    expect(queryMock).not.toHaveBeenCalled();
  });
});
