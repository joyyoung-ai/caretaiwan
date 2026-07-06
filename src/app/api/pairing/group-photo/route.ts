// 家屬切換「群組推播是否包含照片」
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setGroupPhotoEnabled } from "@/lib/pairing";
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

  const body = (await req.json().catch(() => ({}))) as {
    elderId?: string;
    enabled?: boolean;
  };
  if (!body.elderId || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  const result = await setGroupPhotoEnabled(body.elderId, lineUserId, body.enabled);
  if (!result.ok) {
    const userMsg =
      result.error === "NOT_FOUND_OR_NOT_OWNER"
        ? "找不到此配對,或你不是這張醫護卡的擁有者"
        : "伺服器錯誤";
    return NextResponse.json({ error: userMsg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
