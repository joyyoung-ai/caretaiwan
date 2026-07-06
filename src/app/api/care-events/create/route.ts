import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { getActorIp, logAudit } from "@/lib/audit";
import { isDatabaseEnabled } from "@/lib/db/client";
import { createCareEvent, findCareEventPairing, parseCareEventInput, toCareEventResponse } from "@/lib/care-calendar";

export const runtime = "nodejs";

const ERROR_TEXT: Record<string, string> = {
  ELDER_REQUIRED: "缺少長者資料",
  TYPE_INVALID: "行程類型不支援",
  TITLE_REQUIRED: "缺少行程標題",
  STARTS_AT_INVALID: "開始時間格式錯誤",
  TIME_RANGE_INVALID: "結束時間必須晚於開始時間",
};

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "care_event", status: "forbidden" });
    return csrf;
  }
  if (!isDatabaseEnabled()) return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });

  const session = await auth();
  const actorLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!actorLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseCareEventInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: ERROR_TEXT[parsed.error] ?? "欄位格式錯誤" }, { status: 400 });
  }

  const pairing = await findCareEventPairing(parsed.value.elderId, actorLineUserId);
  if (!pairing.ok) return NextResponse.json({ error: "未配對此卡" }, { status: 403 });

  const result = await createCareEvent({
    ...parsed.value,
    actorLineUserId,
    ownerLineUserId: pairing.ownerLineUserId,
  });
  if (!result.ok || !result.event) {
    logAudit({
      action: "CARE_EVENT_CREATE",
      actorLineUserId,
      actorIp: ip,
      resourceType: "care_event",
      resourceId: parsed.value.elderId,
      status: "fail",
      metadata: { reason: result.error },
    });
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  logAudit({
    action: "CARE_EVENT_CREATE",
    actorLineUserId,
    actorIp: ip,
    resourceType: "care_event",
    resourceId: String(result.event.id),
    status: "ok",
    metadata: { eventType: parsed.value.type, isMedicalRelated: parsed.value.isMedicalRelated },
  });

  return NextResponse.json({ ok: true, event: toCareEventResponse(result.event), reminderActive: false });
}
