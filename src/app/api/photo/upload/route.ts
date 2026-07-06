// 看護端拍照上傳 - 寫到 VM local storage,回 storage path
// 後端 push 時才簽 1h signed URL 給 LINE,降低 URL 外流風險
//
// v55 變更（codex audit）:
//   - rateLimit() 改 await rateLimitAsync() + IP+user 雙 key（HIGH-1）
//   - 依 detected magic byte 對應副檔名 + contentType（MEDIUM-4）
//   - upload 時 insert record_photos metadata、push 時驗證 actor+elder+purpose（HIGH-2）
//   - 要 frontend 傳 elderId + purpose，並驗證 caller 真的有配對此 elder
import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";
import { getPairingsByPaired } from "@/lib/pairing";
import { insertPhotoMetadata } from "@/lib/record-photos";
import { detectImageType, IMAGE_FORMAT_META } from "@/lib/photo-format";
import {
  deleteLocalPhoto,
  isLocalPhotoStorageEnabled,
  saveLocalPhoto,
} from "@/lib/local-photo-storage";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB,client resize 後通常遠小於此

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "photo", status: "forbidden" });
    return csrf;
  }
  if (!isLocalPhotoStorageEnabled()) {
    return NextResponse.json({ error: "照片儲存未啟用" }, { status: 503 });
  }
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  // 限流:雙 key（user + IP）跨 Vercel instance 共用 Upstash
  // user-key: 每人 10 張 / min（防誤觸）
  // ip-key: 同 IP 30 張 / min（防多帳號共用同 IP 濫用）
  const rlUser = await rateLimitAsync(`photo-upload:u:${lineUserId}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (!rlUser.ok) {
    return NextResponse.json(
      { error: "上傳過於頻繁,請稍後再試" },
      { status: 429 }
    );
  }
  const rlIp = await rateLimitAsync(`photo-upload:ip:${ip}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "上傳過於頻繁,請稍後再試" },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "格式錯誤" }, { status: 400 });
  }

  const photo = formData.get("photo");
  const elderId = formData.get("elderId");
  const purposeRaw = formData.get("purpose");

  if (!(photo instanceof Blob)) {
    return NextResponse.json({ error: "缺少照片檔" }, { status: 400 });
  }
  if (typeof elderId !== "string" || !elderId) {
    return NextResponse.json({ error: "缺少 elderId" }, { status: 400 });
  }
  if (purposeRaw !== "record" && purposeRaw !== "expense") {
    return NextResponse.json({ error: "purpose 錯誤" }, { status: 400 });
  }
  const purpose = purposeRaw;

  if (photo.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `檔案過大 (上限 ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }
  if (!photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "只接受圖片檔" }, { status: 400 });
  }

  // 驗證 caller 真的配對此 elder（否則就是 hijack 別人的 elder_id）
  const pairings = await getPairingsByPaired(lineUserId);
  const pairing = pairings.find((p) => p.elder_id === elderId);
  if (!pairing) {
    logAudit({
      action: "PHOTO_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "photo",
      status: "forbidden",
      metadata: { reason: "NOT_PAIRED", elderId },
    });
    return NextResponse.json({ error: "未配對此卡" }, { status: 403 });
  }

  // 讀檔 + magic byte 驗證 (拒 SVG / 偽 MIME)
  const buffer = new Uint8Array(await photo.arrayBuffer());
  const detected = detectImageType(buffer);
  if (!detected) {
    logAudit({
      action: "PHOTO_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "photo",
      status: "forbidden",
      metadata: { reason: "INVALID_IMAGE_BYTES" },
    });
    return NextResponse.json({ error: "檔案不是合法圖片" }, { status: 400 });
  }

  // path 不再含 lineUserId,改用 UUID 完全不可枚舉
  // 依 detected magic byte 對應副檔名（v55, 不再一律存 .jpg）
  const meta = IMAGE_FORMAT_META[detected];
  const fileName = `${crypto.randomUUID()}.${meta.ext}`;

  try {
    await saveLocalPhoto(fileName, buffer);
  } catch (e) {
    console.error("[photo/upload/local]", e);
    logAudit({
      action: "PHOTO_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "photo",
      status: "fail",
      metadata: { reason: "LOCAL_SAVE_FAIL" },
    });
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }

  // Insert metadata（v55, HIGH-2 修補）
  // 若 metadata insert 失敗，回滾 storage 避免 orphan + 無法 push
  const metaResult = await insertPhotoMetadata({
    path: fileName,
    uploaderLineUserId: lineUserId,
    elderId,
    purpose,
  });
  if (!metaResult.ok) {
    // 試圖刪除剛上傳的 object，避免 orphan
    await deleteLocalPhoto(fileName);
    logAudit({
      action: "PHOTO_UPLOAD",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "photo",
      status: "fail",
      metadata: { reason: "META_INSERT_FAIL" },
    });
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }

  logAudit({
    action: "PHOTO_UPLOAD",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "photo",
    resourceId: fileName,
    status: "ok",
    metadata: { format: detected, purpose, elderId },
  });

  // 不回傳公開 URL,只回 path - push 時再簽 1h signed URL 給 LINE
  return NextResponse.json({
    ok: true,
    path: fileName,
  });
}
