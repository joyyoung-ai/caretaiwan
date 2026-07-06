import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { getActorIp, logAudit } from "@/lib/audit";
import { isDatabaseEnabled } from "@/lib/db/client";
import {
  createLeaveRequest,
  findLeavePairingForCaregiver,
  parseLeaveRequestInput,
  toLeaveRequestResponse,
} from "@/lib/caregiver-leave";

export const runtime = "nodejs";

const ERROR_TEXT: Record<string, string> = {
  ELDER_REQUIRED: "缺少長者資料",
  REASON_INVALID: "請假原因不支援",
  STARTS_AT_INVALID: "開始時間格式錯誤",
  ENDS_AT_INVALID: "結束時間格式錯誤",
  TIME_RANGE_INVALID: "結束時間必須晚於開始時間",
};

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "caregiver_leave", status: "forbidden" });
    return csrf;
  }
  if (!isDatabaseEnabled()) return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });

  const session = await auth();
  const caregiverLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!caregiverLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseLeaveRequestInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: ERROR_TEXT[parsed.error] ?? "欄位格式錯誤" }, { status: 400 });
  }

  const pairing = await findLeavePairingForCaregiver(parsed.value.elderId, caregiverLineUserId);
  if (!pairing.ok) {
    return NextResponse.json({ error: "只有配對看護可以建立請假紀錄" }, { status: 403 });
  }

  const result = await createLeaveRequest({
    ...parsed.value,
    caregiverLineUserId,
    ownerLineUserId: pairing.ownerLineUserId,
  });
  if (!result.ok || !result.leave) {
    logAudit({
      action: "CAREGIVER_LEAVE_CREATE",
      actorLineUserId: caregiverLineUserId,
      actorIp: ip,
      resourceType: "caregiver_leave",
      resourceId: parsed.value.elderId,
      status: "fail",
      metadata: { reason: result.error },
    });
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  logAudit({
    action: "CAREGIVER_LEAVE_CREATE",
    actorLineUserId: caregiverLineUserId,
    actorIp: ip,
    resourceType: "caregiver_leave",
    resourceId: String(result.leave.id),
    status: "ok",
    metadata: { reason: parsed.value.reason },
  });

  return NextResponse.json({ ok: true, leave: toLeaveRequestResponse(result.leave) });
}
