// 家屬產生家族 LINE 群組推播配對碼 (給家屬在群組裡輸入)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureGroupPairingCode } from "@/lib/pairing";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "group_pairing", status: "forbidden" });
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

  const result = await ensureGroupPairingCode(body.elderId, lineUserId);
  if (!result.ok) {
    logAudit({
      action: "GROUP_PAIRING_CREATE",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "group_pairing",
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

  if (result.alreadyBound) {
    return NextResponse.json({ ok: true, alreadyBound: true });
  }

  logAudit({
    action: "GROUP_PAIRING_CREATE",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "group_pairing",
    resourceId: body.elderId,
    status: "ok",
  });

  return NextResponse.json({ ok: true, code: result.code });
}
