// 列出某張卡的記帳 - 看護或家屬都可呼叫(自動依身分過濾)
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listExpensesForCard } from "@/lib/expense";
import { isDatabaseEnabled } from "@/lib/db/client";
import { checkSameOriginGet } from "@/lib/origin-check";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";
import { hasPhotoMetadata } from "@/lib/record-photos";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // GET 讀 PII -> 同源檢查防止跨站偷渡
  const csrf = checkSameOriginGet(req);
  if (csrf) return csrf;

  if (!isDatabaseEnabled()) {
    return NextResponse.json({ error: "資料庫服務未啟用" }, { status: 503 });
  }
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const url = new URL(req.url);
  const elderId = url.searchParams.get("elderId");
  if (!elderId) {
    return NextResponse.json({ error: "缺少 elderId" }, { status: 400 });
  }

  const result = await listExpensesForCard(elderId, lineUserId, 100);
  if (!result.ok) {
    return NextResponse.json({ error: "查詢失敗" }, { status: 500 });
  }

  // 若有 photo_path,先驗 record_photos metadata 確認 path 確實屬於此 elder + purpose=expense
  // 再簽 1h signed URL 給前端預覽（防 photo_path 被竄改或 legacy 混入）
  const expenses = await Promise.all(
    (result.expenses ?? []).map(async (e) => {
      let photoUrl: string | null = null;
      if (e.photo_path) {
        const photoMeta = await hasPhotoMetadata({
          path: e.photo_path,
          elderId,
          purpose: "expense",
        });
        if (photoMeta) {
          photoUrl = createLocalSignedPhotoUrl(e.photo_path, 60 * 60);
        }
      }
      return { ...e, photoUrl };
    })
  );

  return NextResponse.json({ ok: true, expenses });
}
