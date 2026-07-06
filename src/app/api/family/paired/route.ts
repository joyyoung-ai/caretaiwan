// 看護端拿配對的老人們（資料從 owner = 家屬端 雲端備份取出）
//
// 新語義（2026-05-05 翻轉後）：
//   呼叫者 = 看護端 LINE userId
//   找 pairings 中 paired_line_user_id = 呼叫者 的記錄
//   把 owner_line_user_id（家屬）的 cloud_backups 抓出
//   從中抓出對應 elder_id 的醫護卡
//
// 路徑保留 /api/family/paired 是歷史遺留，未來可改 /api/paired-elders。
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
import { checkSameOriginGet } from "@/lib/origin-check";
import type { Elder } from "@/lib/elder";

export const runtime = "nodejs";

type PairedElderItem = {
  elderId: string;
  displayName: string | null;
  pairedAt: string | null;
  caregiverName: string | null; // 留欄位但已轉成 family 名稱（給看護端看「家屬：XXX」用）
  card: Elder | null;
  hasGroup: boolean; // 看護端用來判斷要不要顯示「也送到群組」選項
};

type PairingRow = {
  elder_id: string;
  display_name: string | null;
  paired_at: string | null;
  owner_line_user_id: string;
  notify_group_id: string | null;
};

type BackupRow = {
  line_user_id: string;
  display_name: string | null;
  data: unknown;
};

export async function GET(req: Request) {
  // GET 回傳完整醫護卡(特種個資)-> 同源檢查
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

  // 找 pairings：caller 是 paired_line_user_id（看護端）
  let pairings: PairingRow[];
  try {
    pairings = await query<PairingRow>(
      `
        select elder_id,
               display_name,
               paired_at,
               owner_line_user_id,
               notify_group_id
        from elder_pairings
        where paired_line_user_id = $1
      `,
      [lineUserId]
    );
  } catch {
    console.error("[paired] pairing query failed");
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }

  if (pairings.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  // 抓 owner（家屬）的 cloud_backups
  const ownerIds = Array.from(new Set(pairings.map((p) => p.owner_line_user_id)));
  const backups = await query<BackupRow>(
    `
      select line_user_id, display_name, data
      from cloud_backups
      where line_user_id = any($1::text[])
    `,
    [ownerIds]
  );

  const backupByOwner = new Map<string, { displayName: string | null; data: unknown }>();
  for (const b of backups) {
    backupByOwner.set(b.line_user_id, { displayName: b.display_name, data: b.data });
  }

  const items: PairedElderItem[] = pairings.map((p) => {
    const backup = backupByOwner.get(p.owner_line_user_id);
    let card: Elder | null = null;
    if (backup && backup.data && typeof backup.data === "object") {
      const d = backup.data as { elderStore?: { elders?: Elder[] } };
      const elders = d.elderStore?.elders ?? [];
      card = elders.find((e) => e.id === p.elder_id) ?? null;
    }
    return {
      elderId: p.elder_id,
      displayName: p.display_name,
      pairedAt: p.paired_at,
      caregiverName: backup?.displayName ?? null, // 實際上是家屬端的顯示名稱
      card,
      hasGroup: !!p.notify_group_id,
    };
  });

  return NextResponse.json({ ok: true, items });
}
