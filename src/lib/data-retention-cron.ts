import { lineUserRef } from "./cron-security";

export type DataRetentionReason =
  | "ALREADY_WARNED"
  | "DRY_RUN"
  | "DB_ERROR"
  | "PAIRING_DELETE_FAILED";

export type DataRetentionWarnResult = {
  lineUserRef: string;
  warned: boolean;
  reason?: DataRetentionReason;
};

export type DataRetentionDeleteResult = {
  lineUserRef: string;
  deleted: boolean;
  pairingsDeleted?: number;
  reason?: DataRetentionReason;
};

export type DataRetentionAuditMetadata = {
  cloudBackupDeleted: boolean;
  pairingsDeleted?: number;
  lastUpdate: string;
  reason?: DataRetentionReason;
};

export type DataRetentionDeleteOutcome = {
  result: DataRetentionDeleteResult;
  auditStatus: "ok" | "fail";
  auditMetadata: DataRetentionAuditMetadata;
};

type DeleteResult = {
  count?: number | null;
  error?: { message?: string } | null;
};

type BackupFirstDeleteInput = {
  lineUserId: string;
  refSecret: string;
  lastUpdate: string;
  deleteCloudBackup: (lineUserId: string) => PromiseLike<DeleteResult>;
  deleteOwnerPairings: (lineUserId: string) => PromiseLike<DeleteResult>;
  deletePairedPairings: (lineUserId: string) => PromiseLike<DeleteResult>;
};

export function buildWarnResult(input: {
  lineUserId: string;
  refSecret: string;
  warned: boolean;
  reason?: DataRetentionReason;
}): DataRetentionWarnResult {
  return {
    lineUserRef: lineUserRef(input.lineUserId, input.refSecret),
    warned: input.warned,
    reason: input.reason,
  };
}

export function buildDeleteDryRunResult(
  lineUserId: string,
  refSecret: string
): DataRetentionDeleteResult {
  return {
    lineUserRef: lineUserRef(lineUserId, refSecret),
    deleted: false,
    reason: "DRY_RUN",
  };
}

export async function runBackupFirstDelete(
  input: BackupFirstDeleteInput
): Promise<DataRetentionDeleteOutcome> {
  const ref = lineUserRef(input.lineUserId, input.refSecret);
  const backupDelete = await input.deleteCloudBackup(input.lineUserId);

  if (backupDelete.error) {
    return {
      result: { lineUserRef: ref, deleted: false, reason: "DB_ERROR" },
      auditStatus: "fail",
      auditMetadata: {
        cloudBackupDeleted: false,
        lastUpdate: input.lastUpdate,
        reason: "DB_ERROR",
      },
    };
  }

  const ownerDelete = await input.deleteOwnerPairings(input.lineUserId);
  const pairedDelete = await input.deletePairedPairings(input.lineUserId);
  const pairingsDeleted =
    (ownerDelete.count ?? 0) + (pairedDelete.count ?? 0);
  const pairingDeleteFailed = Boolean(ownerDelete.error ?? pairedDelete.error);

  if (pairingDeleteFailed) {
    return {
      result: {
        lineUserRef: ref,
        deleted: false,
        pairingsDeleted,
        reason: "PAIRING_DELETE_FAILED",
      },
      auditStatus: "fail",
      auditMetadata: {
        cloudBackupDeleted: true,
        pairingsDeleted,
        lastUpdate: input.lastUpdate,
        reason: "PAIRING_DELETE_FAILED",
      },
    };
  }

  return {
    result: {
      lineUserRef: ref,
      deleted: true,
      pairingsDeleted,
    },
    auditStatus: "ok",
    auditMetadata: {
      cloudBackupDeleted: true,
      pairingsDeleted,
      lastUpdate: input.lastUpdate,
    },
  };
}
