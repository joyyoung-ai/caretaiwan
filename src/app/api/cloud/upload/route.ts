import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";

export const runtime = "nodejs";

// v55 變更（codex MEDIUM-1）:
//  - 加 content-length / JSON size cap（1 MB）防成本爆炸
//  - 加 rateLimitAsync（防同人狂上傳）
//  - 加 key whitelist（只允許預期欄位寫進 cloud_backups.data）

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB（看護端 records + cards 通常 < 100 KB）
// "elderStore" = 家屬端醫護卡資料（elder.ts exportAllData() 輸出的 key）
// "records"    = 看護端記錄
// "version" / "updatedAt" = 備份元資料
// "cards" 保留作 forward-compat（舊版本可能用此 key）
const ALLOWED_TOP_KEYS = new Set(["records", "cards", "elderStore", "version", "updatedAt"]);

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "cloud_backup", status: "forbidden" });
    return csrf;
  }
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: "資料庫服務未啟用（管理員未設定）" }, { status: 503 });
  }
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // Rate limit: 每用戶每分鐘最多 6 次（雲端備份不該頻繁）
  const rl = await rateLimitAsync(`cloud-upload:${lineUserId}`, {
    max: 6,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "備份太頻繁,請稍後再試" }, { status: 429 });
  }

  // Content-Length 預檢（avoid reading huge body）
  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > MAX_BODY_BYTES) {
    logAudit({
      action: "CLOUD_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "cloud_backup",
      status: "forbidden",
      metadata: { reason: "BODY_TOO_LARGE", contentLength: cl },
    });
    return NextResponse.json({ error: "備份檔過大" }, { status: 413 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  // Key whitelist：剔除非預期 top-level keys
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_TOP_KEYS.has(k)) sanitized[k] = v;
  }

  // JSON 大小終檢（whitelist 後）
  const stringified = JSON.stringify(sanitized);
  if (stringified.length > MAX_BODY_BYTES) {
    logAudit({
      action: "CLOUD_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "cloud_backup",
      status: "forbidden",
      metadata: { reason: "JSON_TOO_LARGE", bytes: stringified.length },
    });
    return NextResponse.json({ error: "備份檔過大" }, { status: 413 });
  }

  try {
    await query(
      `
        insert into cloud_backups (
          line_user_id,
          display_name,
          data,
          updated_at
        )
        values ($1, $2, $3::jsonb, $4)
        on conflict (line_user_id)
        do update set
          display_name = excluded.display_name,
          data = excluded.data,
          updated_at = excluded.updated_at
      `,
      [
        lineUserId,
        session?.user?.name ?? null,
        JSON.stringify(sanitized),
        new Date().toISOString(),
      ]
    );
  } catch {
    console.error("[cloud/upload] backup upsert failed");
    logAudit({
      action: "CLOUD_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "cloud_backup",
      status: "fail",
    });
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
  logAudit({
    action: "CLOUD_UPLOAD",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "cloud_backup",
    status: "ok",
  });
  return NextResponse.json({ ok: true });
}
