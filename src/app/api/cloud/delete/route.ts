// 個資法第 11 條：當事人刪除權 — 刪除雲端全部資料
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "cloud_backup", status: "forbidden" });
    return csrf;
  }
  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });
  }
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  try {
    // 1. 刪除雲端備份(家屬端才會有)
    await query("delete from cloud_backups where line_user_id = $1", [lineUserId]);

    // 2. 刪除使用者擁有的所有配對(家屬刪除時連帶看護解除連結)
    await query("delete from elder_pairings where owner_line_user_id = $1", [lineUserId]);

    // 2b. 看護端刪除:把自己從別人的配對 paired_line_user_id 解除
    //     (避免家屬端仍顯示「已配對看護」但實際已刪除)
    await query(
      `
        update elder_pairings
        set paired_line_user_id = null,
            paired_at = null
        where paired_line_user_id = $1
      `,
      [lineUserId]
    );

    // 3. 刪除推播紀錄
    await query("delete from push_logs where line_user_id = $1", [lineUserId]);
  } catch {
    console.error("[cloud/delete] deletion step failed");
    logAudit({
      action: "CLOUD_DELETE",
      actorLineUserId: lineUserId,
      actorIp: ip,
      status: "fail",
    });
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }

  logAudit({
    action: "CLOUD_DELETE",
    actorLineUserId: lineUserId,
    actorIp: ip,
    status: "ok",
  });
  return NextResponse.json({ ok: true });
}
