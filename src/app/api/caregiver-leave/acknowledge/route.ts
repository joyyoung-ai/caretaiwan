import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";
import { acknowledgeLeaveRequest, toLeaveRequestResponse } from "@/lib/caregiver-leave";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!isDatabaseEnabled()) return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });

  const session = await auth();
  const ownerLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!ownerLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const leaveId = Number(body.leaveId);
  if (!Number.isInteger(leaveId) || leaveId <= 0) {
    return NextResponse.json({ error: "缺少請假紀錄" }, { status: 400 });
  }

  const result = await acknowledgeLeaveRequest(leaveId, ownerLineUserId);
  if (!result.ok) {
    if (result.error === "NOT_FOUND_OR_NOT_OWNER") {
      return NextResponse.json({ error: "無法確認此請假紀錄" }, { status: 403 });
    }
    return NextResponse.json({ error: "確認失敗" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, leave: result.leave ? toLeaveRequestResponse(result.leave) : null });
}
