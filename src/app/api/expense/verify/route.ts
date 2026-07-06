// 家屬核帳 - 確認 or 標記有問題
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyExpense } from "@/lib/expense";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "expense", status: "forbidden" });
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
    expenseId?: number;
    status?: "confirmed" | "disputed";
    note?: string;
  };
  if (!body.expenseId || (body.status !== "confirmed" && body.status !== "disputed")) {
    return NextResponse.json({ error: "參數錯誤" }, { status: 400 });
  }
  // disputed 必須附原因(可預防無理由刁難)
  if (body.status === "disputed" && (!body.note || body.note.trim().length < 2)) {
    return NextResponse.json({ error: "標記有問題時請填寫原因" }, { status: 400 });
  }

  const result = await verifyExpense(body.expenseId, lineUserId, body.status, body.note);
  if (!result.ok) {
    logAudit({
      action: "EXPENSE_VERIFY",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "expense",
      resourceId: String(body.expenseId),
      status: "fail",
      metadata: { reason: result.error },
    });
    const userMsg =
      result.error === "NOT_FOUND_OR_NOT_OWNER"
        ? "找不到此筆,或你不是這張卡的擁有者"
        : "核帳失敗";
    return NextResponse.json({ error: userMsg }, { status: 400 });
  }

  logAudit({
    action: "EXPENSE_VERIFY",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "expense",
    resourceId: String(body.expenseId),
    status: "ok",
    metadata: { newStatus: body.status },
  });

  return NextResponse.json({ ok: true });
}
