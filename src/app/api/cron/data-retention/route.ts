// 資料保留期限自動清除 cron
// 設計:
//   - 12 個月未活動 → 刪除 (cloud_backups + elder_pairings)
//   - 11 個月未活動 → 發 LINE Bot 警告(30 天緩衝)
//   - dryRun 模式只列出不執行
//   - Bearer token 認證(CRON_SECRET env var)
//   - 一次最多處理 100 筆(安全護欄)
//
// 設定:
//   1. Vercel env vars 加 CRON_SECRET (隨機字串)
//   2. cron-job.org 排程: 每天執行兩次
//      a. GET /api/cron/data-retention?stage=warn
//      b. GET /api/cron/data-retention?stage=delete
//      Authorization: Bearer <CRON_SECRET>
import { NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { logAudit } from "@/lib/audit";
import {
  buildDeleteDryRunResult,
  buildWarnResult,
  runBackupFirstDelete,
  type DataRetentionDeleteResult,
  type DataRetentionWarnResult,
} from "@/lib/data-retention-cron";
import {
  extractBearerToken,
  timingSafeSecretEqual,
} from "@/lib/cron-security";

export const runtime = "nodejs";
export const maxDuration = 60; // cron 處理可能要久一點

const RETENTION_DAYS = 365; // 12 個月
const WARNING_DAYS_BEFORE = 30; // 刪除前 30 天先發警告
const MAX_BATCH_SIZE = 100; // 一次最多處理 N 筆

const WARNING_MESSAGE = (daysLeft: number) =>
  `⚠️ 看護助手 CareTaiwan 資料保留通知\n\n` +
  `你的雲端資料已超過 ${RETENTION_DAYS - WARNING_DAYS_BEFORE} 天未活動,` +
  `將於 ${daysLeft} 天後依個資法第 11 條自動刪除。\n\n` +
  `若要保留資料,請在期限前登入 PWA(任何操作即可):\n` +
  `https://caretaiwan.app\n\n` +
  `若已不需使用本服務,可忽略此訊息。`;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

type RetentionCandidate = {
  line_user_id: string;
  display_name: string | null;
  updated_at: string;
};

type CountRow = {
  count: number | string | null;
};

function rowCount(rows: CountRow[]): number {
  const value = rows[0]?.count ?? 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

export async function GET(req: Request) {
  // Bearer token 認證
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = extractBearerToken(authHeader);
  if (!bearer || !timingSafeSecretEqual(bearer, secret)) {
    return unauthorized();
  }

  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: "Database not enabled" }, { status: 503 });
  }

  const url = new URL(req.url);
  const stage = url.searchParams.get("stage"); // "warn" | "delete"
  const dryRun = url.searchParams.get("dryRun") === "true";

  if (stage !== "warn" && stage !== "delete") {
    return NextResponse.json(
      { error: "stage must be 'warn' or 'delete'" },
      { status: 400 }
    );
  }

  if (stage === "warn") {
    return await runWarnStage(dryRun, secret);
  }
  return await runDeleteStage(dryRun, secret);
}

// 警告階段: 11 個月未活動 → 發 LINE 通知
async function runWarnStage(dryRun: boolean, refSecret: string) {
  const warnThreshold = new Date(
    Date.now() - (RETENTION_DAYS - WARNING_DAYS_BEFORE) * 24 * 60 * 60 * 1000
  ).toISOString();
  // 已警告過的不再重發 (用 metadata 紀錄,簡化為 last_warned_at column 在未來版本加;
  // 目前用 audit_logs 查 11 個月內是否已警告)
  let candidates: RetentionCandidate[];
  try {
    candidates = await query<RetentionCandidate>(
      `
        select line_user_id, display_name, updated_at
        from cloud_backups
        where updated_at < $1
        order by updated_at asc
        limit $2
      `,
      [warnThreshold, MAX_BATCH_SIZE]
    );
  } catch {
    console.error("[data-retention] warn query failed");
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const results: DataRetentionWarnResult[] = [];

  for (const c of candidates) {
    // 查最近 35 天有沒有已警告過 (避免每天重發)
    const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const [prev] = await query<{ id: number }>(
      `
        select id
        from audit_logs
        where actor_line_user_id = $1
          and action = $2
          and created_at > $3
        limit 1
      `,
      [c.line_user_id, "DATA_RETENTION_WARNING", since]
    );
    if (prev) {
      results.push(
        buildWarnResult({
          lineUserId: c.line_user_id,
          refSecret,
          warned: false,
          reason: "ALREADY_WARNED",
        })
      );
      continue;
    }

    // 計算距刪除還剩幾天
    const lastUpdate = new Date(c.updated_at).getTime();
    const deleteAt = lastUpdate + RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.ceil((deleteAt - Date.now()) / (24 * 60 * 60 * 1000)));

    if (dryRun) {
      results.push(
        buildWarnResult({
          lineUserId: c.line_user_id,
          refSecret,
          warned: false,
          reason: "DRY_RUN",
        })
      );
      continue;
    }

    let warned = false;
    if (isLineBotEnabled()) {
      const r = await pushMessage(c.line_user_id, [
        { type: "text", text: WARNING_MESSAGE(daysLeft) },
      ]);
      warned = r.ok;
    }

    logAudit({
      action: "DATA_RETENTION_WARNING",
      actorLineUserId: c.line_user_id,
      resourceType: "cloud_backup",
      resourceId: c.line_user_id,
      status: warned ? "ok" : "fail",
      metadata: { daysLeft, lineBotEnabled: isLineBotEnabled() },
    });

    results.push(
      buildWarnResult({ lineUserId: c.line_user_id, refSecret, warned })
    );
  }

  logAudit({
    action: "DATA_RETENTION_RUN",
    resourceType: "cron",
    status: "ok",
    metadata: { stage: "warn", processed: results.length, dryRun },
  });

  return NextResponse.json({
    ok: true,
    stage: "warn",
    dryRun,
    processed: results.length,
    candidates: results.length,
    results: results.slice(0, 10), // 只回前 10 筆去識別化 sample
  });
}

// 刪除階段: 12 個月未活動 → 刪 cloud_backups + 對應 elder_pairings
async function runDeleteStage(dryRun: boolean, refSecret: string) {
  const deleteThreshold = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  let candidates: RetentionCandidate[];
  try {
    candidates = await query<RetentionCandidate>(
      `
        select line_user_id, display_name, updated_at
        from cloud_backups
        where updated_at < $1
        order by updated_at asc
        limit $2
      `,
      [deleteThreshold, MAX_BATCH_SIZE]
    );
  } catch {
    console.error("[data-retention] delete query failed");
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const results: DataRetentionDeleteResult[] = [];

  for (const c of candidates) {
    if (dryRun) {
      results.push(buildDeleteDryRunResult(c.line_user_id, refSecret));
      continue;
    }

    const outcome = await runBackupFirstDelete({
      lineUserId: c.line_user_id,
      refSecret,
      lastUpdate: c.updated_at,
      deleteCloudBackup: (lineUserId) =>
        query("delete from cloud_backups where line_user_id = $1", [lineUserId])
          .then(() => ({ error: null }))
          .catch(() => ({ error: { message: "DB_ERROR" } })),
      // 拆兩次 query，不用 .or() 字串拼接，避免 PostgREST filter injection。
      deleteOwnerPairings: (lineUserId) =>
        query<CountRow>(
          `
            with deleted as (
              delete from elder_pairings
              where owner_line_user_id = $1
              returning 1
            )
            select count(*)::int as count from deleted
          `,
          [lineUserId]
        )
          .then((rows) => ({ count: rowCount(rows), error: null }))
          .catch(() => ({ error: { message: "DB_ERROR" } })),
      deletePairedPairings: (lineUserId) =>
        query<CountRow>(
          `
            with deleted as (
              delete from elder_pairings
              where paired_line_user_id = $1
              returning 1
            )
            select count(*)::int as count from deleted
          `,
          [lineUserId]
        )
          .then((rows) => ({ count: rowCount(rows), error: null }))
          .catch(() => ({ error: { message: "DB_ERROR" } })),
    });

    if (outcome.auditMetadata.reason === "DB_ERROR") {
      console.error("[data-retention] backup delete failed");
    }
    if (outcome.auditMetadata.reason === "PAIRING_DELETE_FAILED") {
      console.error("[data-retention] pairing delete failed");
    }

    logAudit({
      action: "DATA_AUTO_DELETE",
      actorLineUserId: c.line_user_id,
      resourceType: "cloud_backup",
      resourceId: c.line_user_id,
      status: outcome.auditStatus,
      metadata: outcome.auditMetadata,
    });

    results.push(outcome.result);
  }

  logAudit({
    action: "DATA_RETENTION_RUN",
    resourceType: "cron",
    status: "ok",
    metadata: { stage: "delete", processed: results.length, dryRun },
  });

  return NextResponse.json({
    ok: true,
    stage: "delete",
    dryRun,
    processed: results.length,
    candidates: results.length,
    results: results.slice(0, 10),
  });
}
