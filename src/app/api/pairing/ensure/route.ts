// Family-side (post-flip): ensure (or fetch) a pairing code for an elder
// 呼叫者 = 家屬端,他擁有醫護卡並產生 6 位配對碼給看護輸入
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensurePairing } from "@/lib/pairing";
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
  const body = (await req.json().catch(() => ({}))) as {
    elderId?: string;
    displayName?: string;
  };
  if (!body.elderId) {
    return NextResponse.json({ error: "缺少 elderId" }, { status: 400 });
  }
  const result = await ensurePairing(
    body.elderId,
    lineUserId,
    body.displayName ?? null
  );
  if (!result.ok) {
    console.error("[pairing/ensure]", result.error);
    logAudit({
      action: "PAIRING_CREATE",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "pairing",
      resourceId: body.elderId,
      status: "fail",
    });
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
  logAudit({
    action: "PAIRING_CREATE",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "pairing",
    resourceId: body.elderId,
    status: "ok",
  });
  return NextResponse.json({
    ok: true,
    code: result.code,
    paired: Boolean(result.pairing?.paired_line_user_id),
  });
}
