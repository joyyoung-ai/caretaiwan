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
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { logAudit } from "@/lib/audit";
import {
  extractBearerToken,
  lineUserRef,
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

  if (!isCloudEnabled()) {
    return NextResponse.json({ error: "Cloud not enabled" }, { status: 503 });
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

  const sb = getSupabaseAdmin()!;

  if (stage === "warn") {
    return await runWarnStage(sb, dryRun);
  }
  return await runDeleteStage(sb, dryRun);
}

// 警告階段: 11 個月未活動 → 發 LINE 通知
async function runWarnStage(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dryRun: boolean
) {
  const warnThreshold = new Date(
    Date.now() - (RETENTION_DAYS - WARNING_DAYS_BEFORE) * 24 * 60 * 60 * 1000
  ).toISOString();
  // 已警告過的不再重發 (用 metadata 紀錄,簡化為 last_warned_at column 在未來版本加;
  // 目前用 audit_logs 查 11 個月內是否已警告)
  const { data: candidates, error } = await sb
    .from("cloud_backups")
    .select("line_user_id, display_name, updated_at")
    .lt("updated_at", warnThreshold)
    .limit(MAX_BATCH_SIZE);

  if (error) {
    console.error("[data-retention] warn query failed", error.message);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const results: Array<{ lineUserRef: string; warned: boolean; reason?: string }> = [];

  for (const c of candidates ?? []) {
    // 查最近 35 天有沒有已警告過 (避免每天重發)
    const since = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const { data: prev } = await sb
      .from("audit_logs")
      .select("id")
      .eq("actor_line_user_id", c.line_user_id)
      .eq("action", "DATA_RETENTION_WARNING")
      .gt("created_at", since)
      .limit(1)
      .maybeSingle();
    if (prev) {
      results.push({ lineUserRef: lineUserRef(c.line_user_id), warned: false, reason: "ALREADY_WARNED" });
      continue;
    }

    // 計算距刪除還剩幾天
    const lastUpdate = new Date(c.updated_at).getTime();
    const deleteAt = lastUpdate + RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, Math.ceil((deleteAt - Date.now()) / (24 * 60 * 60 * 1000)));

    if (dryRun) {
      results.push({ lineUserRef: lineUserRef(c.line_user_id), warned: false, reason: "DRY_RUN" });
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

    results.push({ lineUserRef: lineUserRef(c.line_user_id), warned });
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
async function runDeleteStage(
  sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  dryRun: boolean
) {
  const deleteThreshold = new Date(
    Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: candidates, error } = await sb
    .from("cloud_backups")
    .select("line_user_id, display_name, updated_at")
    .lt("updated_at", deleteThreshold)
    .limit(MAX_BATCH_SIZE);

  if (error) {
    console.error("[data-retention] delete query failed", error.message);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const results: Array<{
    lineUserRef: string;
    deleted: boolean;
    pairingsDeleted?: number;
    reason?: string;
  }> = [];

  for (const c of candidates ?? []) {
    const ref = lineUserRef(c.line_user_id);
    if (dryRun) {
      results.push({ lineUserRef: ref, deleted: false, reason: "DRY_RUN" });
      continue;
    }

    // 先刪 cloud_backups。若備份刪除失敗，不先動配對資料，避免留下孤立備份。
    const { error: cbErr } = await sb
      .from("cloud_backups")
      .delete()
      .eq("line_user_id", c.line_user_id);

    if (cbErr) {
      console.error("[data-retention] backup delete failed", cbErr.message);
      logAudit({
        action: "DATA_AUTO_DELETE",
        actorLineUserId: c.line_user_id,
        resourceType: "cloud_backup",
        resourceId: c.line_user_id,
        status: "fail",
        metadata: {
          cloudBackupDeleted: false,
          lastUpdate: c.updated_at,
          reason: "DB_ERROR",
        },
      });

      results.push({ lineUserRef: ref, deleted: false, reason: "DB_ERROR" });
      continue;
    }

    // 再刪 elder_pairings 中 owner 或 paired 是這個 user 的。
    // 拆兩次 query，不用 .or() 字串拼接，避免 PostgREST filter injection。
    const { count: ownerCount, error: ownerErr } = await sb
      .from("elder_pairings")
      .delete({ count: "exact" })
      .eq("owner_line_user_id", c.line_user_id);
    const { count: pairedCount, error: pairedErr } = await sb
      .from("elder_pairings")
      .delete({ count: "exact" })
      .eq("paired_line_user_id", c.line_user_id);
    const pairCount = (ownerCount ?? 0) + (pairedCount ?? 0);
    const pairingErr = ownerErr ?? pairedErr;
    if (pairingErr) {
      console.error("[data-retention] pairing delete failed", pairingErr.message);
    }

    logAudit({
      action: "DATA_AUTO_DELETE",
      actorLineUserId: c.line_user_id,
      resourceType: "cloud_backup",
      resourceId: c.line_user_id,
      status: pairingErr ? "fail" : "ok",
      metadata: {
        cloudBackupDeleted: true,
        pairingsDeleted: pairCount ?? 0,
        lastUpdate: c.updated_at,
        reason: pairingErr ? "PAIRING_DELETE_FAILED" : undefined,
      },
    });

    results.push({
      lineUserRef: ref,
      deleted: !pairingErr,
      pairingsDeleted: pairCount ?? 0,
      reason: pairingErr ? "PAIRING_DELETE_FAILED" : undefined,
    });
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
