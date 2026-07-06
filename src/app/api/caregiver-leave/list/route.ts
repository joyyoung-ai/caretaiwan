import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";
import { listLeaveRequestsForElder, toLeaveRequestResponse } from "@/lib/caregiver-leave";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const csrf = checkSameOriginGet(req);
  if (csrf) return csrf;
  if (!isDatabaseEnabled()) return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });

  const session = await auth();
  const actorLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!actorLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const url = new URL(req.url);
  const elderId = url.searchParams.get("elderId")?.trim();
  if (!elderId) return NextResponse.json({ error: "缺少長者資料" }, { status: 400 });

  const result = await listLeaveRequestsForElder(elderId, actorLineUserId);
  if (!result.ok) {
    if (result.error === "NOT_PAIRED") return NextResponse.json({ error: "未配對此卡" }, { status: 403 });
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leaves: (result.leaves ?? []).map(toLeaveRequestResponse) });
}
