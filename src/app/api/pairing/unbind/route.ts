// 家屬解除某個老人的看護配對 - 清空 paired_line_user_id + 刷新配對碼
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { unbindCaregiver } from "@/lib/pairing";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "pairing", status: "forbidden" });
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

  const body = (await req.json().catch(() => ({}))) as { elderId?: string };
  if (!body.elderId) {
    return NextResponse.json({ error: "缺少 elderId" }, { status: 400 });
  }

  const result = await unbindCaregiver(body.elderId, lineUserId);
  if (!result.ok) {
    logAudit({
      action: "PAIRING_UNBIND",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "pairing",
      resourceId: body.elderId,
      status: "fail",
      metadata: { reason: result.error },
    });
    const userMsg =
      result.error === "NOT_FOUND_OR_NOT_OWNER"
        ? "找不到此配對,或你不是這張醫護卡的擁有者"
        : "伺服器錯誤";
    return NextResponse.json({ error: userMsg }, { status: 400 });
  }

  logAudit({
    action: "PAIRING_UNBIND",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "pairing",
    resourceId: body.elderId,
    status: "ok",
  });
  return NextResponse.json({ ok: true });
}
