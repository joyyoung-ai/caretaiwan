import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { isCareEventStatus, toCareEventResponse, updateCareEvent } from "@/lib/care-calendar";

export const runtime = "nodejs";

function parseOptionalIso(raw: unknown): { ok: true; value?: string } | { ok: false } {
  if (raw === undefined) return { ok: true };
  if (typeof raw !== "string") return { ok: false };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { ok: false };
  return { ok: true, value: date.toISOString() };
}

export async function POST(req: Request) {
  const csrf = checkSameOrigin(req);
  if (csrf) return csrf;
  if (!isCloudEnabled()) return NextResponse.json({ error: "雲端服務未啟用" }, { status: 503 });

  const session = await auth();
  const actorLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!actorLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const eventId = Number(body.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "缺少行程資料" }, { status: 400 });
  }
  if (body.status !== undefined && !isCareEventStatus(body.status)) {
    return NextResponse.json({ error: "狀態不支援" }, { status: 400 });
  }
  const parsedStartsAt = parseOptionalIso(body.startsAt);
  const parsedEndsAt = parseOptionalIso(body.endsAt);
  if (!parsedStartsAt.ok || !parsedEndsAt.ok) {
    return NextResponse.json({ error: "時間格式錯誤" }, { status: 400 });
  }
  if (
    parsedStartsAt.value &&
    parsedEndsAt.value &&
    new Date(parsedEndsAt.value).getTime() <= new Date(parsedStartsAt.value).getTime()
  ) {
    return NextResponse.json({ error: "結束時間必須晚於開始時間" }, { status: 400 });
  }

  const result = await updateCareEvent({
    eventId,
    actorLineUserId,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(parsedStartsAt.value !== undefined ? { startsAt: parsedStartsAt.value } : {}),
    ...(parsedEndsAt.value !== undefined ? { endsAt: parsedEndsAt.value } : {}),
    ...(typeof body.location === "string" ? { location: body.location.trim() || null } : {}),
    ...(typeof body.note === "string" ? { note: body.note.trim() || null } : {}),
  });

  if (!result.ok) {
    if (result.error === "NOT_PAIRED") return NextResponse.json({ error: "未配對此卡" }, { status: 403 });
    if (result.error === "TIME_RANGE_INVALID") {
      return NextResponse.json({ error: "結束時間必須晚於開始時間" }, { status: 400 });
    }
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: result.event ? toCareEventResponse(result.event) : null });
}
