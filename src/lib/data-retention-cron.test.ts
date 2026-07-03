import { describe, expect, it, vi } from "vitest";
import {
  buildDeleteDryRunResult,
  buildWarnResult,
  runBackupFirstDelete,
} from "./data-retention-cron";

const rawLineUserId = "U1234567890abcdef1234567890abcdef";
const rawDbError = "duplicate key violates constraint elder_pairings_owner_line_user_id_fkey";
const refSecret = "cron-secret-one";

describe("data retention cron helpers", () => {
  it("builds warn-stage results without exposing raw LINE user IDs", () => {
    const result = buildWarnResult({
      lineUserId: rawLineUserId,
      refSecret,
      warned: false,
      reason: "DRY_RUN",
    });

    expect(result).toEqual({
      lineUserRef: expect.stringMatching(/^[a-f0-9]{12}$/),
      warned: false,
      reason: "DRY_RUN",
    });
    expect(JSON.stringify(result)).not.toContain(rawLineUserId);
    expect(JSON.stringify(result)).not.toContain("U123456");
  });

  it("builds delete dry-run results without exposing raw LINE user IDs", () => {
    const result = buildDeleteDryRunResult(rawLineUserId, refSecret);

    expect(result).toEqual({
      lineUserRef: expect.stringMatching(/^[a-f0-9]{12}$/),
      deleted: false,
      reason: "DRY_RUN",
    });
    expect(JSON.stringify(result)).not.toContain(rawLineUserId);
  });

  it("does not delete pairings when cloud backup deletion fails", async () => {
    const deleteCloudBackup = vi.fn().mockResolvedValue({
      error: { message: rawDbError },
    });
    const deleteOwnerPairings = vi.fn();
    const deletePairedPairings = vi.fn();

    const outcome = await runBackupFirstDelete({
      lineUserId: rawLineUserId,
      refSecret,
      lastUpdate: "2025-01-01T00:00:00.000Z",
      deleteCloudBackup,
      deleteOwnerPairings,
      deletePairedPairings,
    });

    expect(deleteCloudBackup).toHaveBeenCalledWith(rawLineUserId);
    expect(deleteOwnerPairings).not.toHaveBeenCalled();
    expect(deletePairedPairings).not.toHaveBeenCalled();
    expect(outcome.result).toEqual({
      lineUserRef: expect.stringMatching(/^[a-f0-9]{12}$/),
      deleted: false,
      reason: "DB_ERROR",
    });
    expect(outcome.auditStatus).toBe("fail");
    expect(outcome.auditMetadata).toEqual({
      cloudBackupDeleted: false,
      lastUpdate: "2025-01-01T00:00:00.000Z",
      reason: "DB_ERROR",
    });
    expect(JSON.stringify(outcome)).not.toContain(rawDbError);
    expect(JSON.stringify(outcome)).not.toContain(rawLineUserId);
  });

  it("reports pairing delete failures as redacted partial failures", async () => {
    const deleteCloudBackup = vi.fn().mockResolvedValue({ error: null });
    const deleteOwnerPairings = vi.fn().mockResolvedValue({
      count: 2,
      error: { message: rawDbError },
    });
    const deletePairedPairings = vi.fn().mockResolvedValue({
      count: 1,
      error: null,
    });

    const outcome = await runBackupFirstDelete({
      lineUserId: rawLineUserId,
      refSecret,
      lastUpdate: "2025-01-01T00:00:00.000Z",
      deleteCloudBackup,
      deleteOwnerPairings,
      deletePairedPairings,
    });

    expect(deleteCloudBackup).toHaveBeenCalledWith(rawLineUserId);
    expect(deleteOwnerPairings).toHaveBeenCalledWith(rawLineUserId);
    expect(deletePairedPairings).toHaveBeenCalledWith(rawLineUserId);
    expect(outcome.result).toEqual({
      lineUserRef: expect.stringMatching(/^[a-f0-9]{12}$/),
      deleted: false,
      pairingsDeleted: 3,
      reason: "PAIRING_DELETE_FAILED",
    });
    expect(outcome.auditStatus).toBe("fail");
    expect(outcome.auditMetadata).toEqual({
      cloudBackupDeleted: true,
      pairingsDeleted: 3,
      lastUpdate: "2025-01-01T00:00:00.000Z",
      reason: "PAIRING_DELETE_FAILED",
    });
    expect(JSON.stringify(outcome)).not.toContain(rawDbError);
    expect(JSON.stringify(outcome)).not.toContain(rawLineUserId);
  });

  it("records successful backup and pairing deletion with redacted references", async () => {
    const outcome = await runBackupFirstDelete({
      lineUserId: rawLineUserId,
      refSecret,
      lastUpdate: "2025-01-01T00:00:00.000Z",
      deleteCloudBackup: vi.fn().mockResolvedValue({ error: null }),
      deleteOwnerPairings: vi.fn().mockResolvedValue({ count: 2, error: null }),
      deletePairedPairings: vi.fn().mockResolvedValue({ count: 1, error: null }),
    });

    expect(outcome.result).toEqual({
      lineUserRef: expect.stringMatching(/^[a-f0-9]{12}$/),
      deleted: true,
      pairingsDeleted: 3,
    });
    expect(outcome.auditStatus).toBe("ok");
    expect(outcome.auditMetadata).toEqual({
      cloudBackupDeleted: true,
      pairingsDeleted: 3,
      lastUpdate: "2025-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(outcome)).not.toContain(rawLineUserId);
  });
});
