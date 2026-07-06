// 家屬端讀取自己某張老人卡的配對狀態 (含群組推播 + 群組配對碼)
// 給 family/card 頁的 GroupNotifySection 用 - 知道目前是哪個狀態
// GET 同源檢查(配對碼也算敏感資料)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPairingByElderAndOwner } from "@/lib/pairing";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOriginGet } from "@/lib/origin-check";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const csrf = checkSameOriginGet(req);
  if (csrf) return csrf;

  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });
  }
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const url = new URL(req.url);
  const elderId = url.searchParams.get("elderId");
  if (!elderId) {
    return NextResponse.json({ error: "缺少 elderId" }, { status: 400 });
  }

  const p = await getPairingByElderAndOwner(elderId, lineUserId);
  if (!p) {
    return NextResponse.json({ ok: true, exists: false });
  }

  // 檢查群組配對碼是否過期
  const groupCodeValid =
    p.group_pairing_code &&
    p.group_pairing_expires_at &&
    new Date(p.group_pairing_expires_at).getTime() > Date.now();

  return NextResponse.json({
    ok: true,
    exists: true,
    paired: !!p.paired_line_user_id,
    groupBound: !!p.notify_group_id,
    groupBoundAt: p.notify_group_bound_at,
    groupPhotoEnabled: p.notify_group_photo !== false, // null/undefined 都當 true
    groupPairingCode: groupCodeValid ? p.group_pairing_code : null,
  });
}
