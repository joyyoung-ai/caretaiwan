import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { isCareEventStatus, updateCareEvent } from "@/lib/care-calendar";

export const runtime = "nodejs";

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

  const result = await updateCareEvent({
    eventId,
    actorLineUserId,
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
    ...(typeof body.startsAt === "string" ? { startsAt: new Date(body.startsAt).toISOString() } : {}),
    ...(typeof body.endsAt === "string" ? { endsAt: new Date(body.endsAt).toISOString() } : {}),
    ...(typeof body.location === "string" ? { location: body.location.trim() || null } : {}),
    ...(typeof body.note === "string" ? { note: body.note.trim() || null } : {}),
  });

  if (!result.ok) {
    if (result.error === "NOT_PAIRED") return NextResponse.json({ error: "未配對此卡" }, { status: 403 });
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: result.event });
}
