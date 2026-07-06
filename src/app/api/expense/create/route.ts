// 看護建立一筆記帳 → 寫入 DB → 推播給家屬
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createExpense, sanitizeAmount, isValidCategory } from "@/lib/expense";
import { getPairingsByPaired } from "@/lib/pairing";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOrigin } from "@/lib/origin-check";
import { logAudit, getActorIp } from "@/lib/audit";
import { rateLimitAsync } from "@/lib/rate-limit";
import { pushExpenseToFamily } from "@/app/actions/expense-push";
import { verifyPhotoOwnership } from "@/lib/record-photos";

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

  // Rate limit: 每用戶每分鐘最多 10 筆(防誤觸)
  // v55: 改 await rateLimitAsync 真的跨 instance 共用 Upstash（codex HIGH-1）
  const rl = await rateLimitAsync(`expense-create:${lineUserId}`, {
    max: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "操作太頻繁,請稍後再試" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    elderId?: string;
    itemName?: string;
    amount?: unknown;
    category?: string;
    note?: string;
    photoPath?: string;
    shareWithFamily?: boolean; // 預設 true,但保留參數讓未來能關掉推播
  };

  if (!body.elderId || !body.itemName) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }
  if (body.itemName.length > 100) {
    return NextResponse.json({ error: "品項名稱過長" }, { status: 400 });
  }
  const amount = sanitizeAmount(body.amount);
  if (amount === null) {
    return NextResponse.json({ error: "金額格式錯誤" }, { status: 400 });
  }
  if (!isValidCategory(body.category)) {
    return NextResponse.json({ error: "分類錯誤" }, { status: 400 });
  }

  // 找看護綁的卡 -> 拿到 ownerLineUserId
  const pairings = await getPairingsByPaired(lineUserId);
  const pairing = pairings.find((p) => p.elder_id === body.elderId);
  if (!pairing || !pairing.owner_line_user_id) {
    return NextResponse.json({ error: "未配對此卡" }, { status: 403 });
  }

  // 有 photoPath 時，建立前先驗 metadata（防借用別人照片 path）
  if (body.photoPath) {
    const owned = await verifyPhotoOwnership({
      path: body.photoPath,
      actorLineUserId: lineUserId,
      elderId: body.elderId,
      purpose: "expense",
    });
    if (!owned) {
      logAudit({
        action: "PHOTO_OWNERSHIP_REJECT",
        actorLineUserId: lineUserId,
        actorIp: ip,
        resourceType: "expense",
        status: "forbidden",
        metadata: { context: "expense_create", elderId: body.elderId },
      });
      return NextResponse.json({ error: "照片不屬於此看護或此卡" }, { status: 403 });
    }
  }

  const result = await createExpense({
    elderId: body.elderId,
    actorLineUserId: lineUserId,
    ownerLineUserId: pairing.owner_line_user_id,
    itemName: body.itemName,
    amount,
    category: body.category,
    note: body.note,
    photoPath: body.photoPath,
  });

  if (!result.ok || !result.expense) {
    logAudit({
      action: "EXPENSE_CREATE",
      actorLineUserId: lineUserId,
      actorIp: ip,
      resourceType: "expense",
      resourceId: body.elderId,
      status: "fail",
      metadata: { reason: result.error },
    });
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  logAudit({
    action: "EXPENSE_CREATE",
    actorLineUserId: lineUserId,
    actorIp: ip,
    resourceType: "expense",
    resourceId: String(result.expense.id),
    status: "ok",
    metadata: { category: body.category, amount },
  });

  // 推播給家屬(fire-and-forget,失敗不擋記帳成功回傳)
  // v55: 帶 actorLineUserId + elderId 給 expense-push 做 photo ownership verify（codex HIGH-2）
  if (body.shareWithFamily !== false) {
    pushExpenseToFamily({
      expenseId: result.expense.id,
      actorLineUserId: lineUserId,
      elderId: body.elderId,
      ownerLineUserId: pairing.owner_line_user_id,
      elderName: pairing.display_name ?? "老人",
      itemName: body.itemName,
      amount,
      category: body.category,
      note: body.note,
      photoPath: body.photoPath,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    expense: result.expense,
  });
}
