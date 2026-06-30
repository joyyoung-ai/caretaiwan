"use server";

// 看護建立記帳 → 推播給家屬(1對1 LINE Bot)
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { CATEGORY_META, type ExpenseCategory } from "@/lib/expense";
import { verifyPhotoOwnership } from "@/lib/record-photos";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";

export async function pushExpenseToFamily(input: {
  expenseId: number;
  actorLineUserId: string;
  elderId: string;
  ownerLineUserId: string;
  elderName: string;
  itemName: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  photoPath?: string;
}): Promise<{ ok: boolean }> {
  if (!isLineBotEnabled()) return { ok: false };

  const meta = CATEGORY_META[input.category];
  const lines: string[] = [];
  lines.push(`【${input.elderName} ${meta.icon} 記帳 - ${meta.labelZh}】`);
  lines.push(`📝 ${input.itemName}`);
  lines.push(`💰 $${input.amount.toFixed(2)}`);
  if (input.note) lines.push(`💬 備註:${input.note}`);
  lines.push("");
  lines.push(`📅 ${new Date().toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })}`);
  lines.push("─────────────");
  lines.push("請於 PWA 醫護卡頁面的「記帳本」核帳");

  const messages: Array<
    | { type: "text"; text: string }
    | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  > = [{ type: "text", text: lines.join("\n") }];

  // 收據照片:從 private bucket 簽 1h signed URL
  // v55: 簽 URL 前先驗 metadata（uploader+elder+purpose 三者吻合）— codex HIGH-2
  // 無 metadata 或不符 → skip 照片，不擋整則 push
  if (input.photoPath) {
    const owned = await verifyPhotoOwnership({
      path: input.photoPath,
      actorLineUserId: input.actorLineUserId,
      elderId: input.elderId,
      purpose: "expense",
    });
    if (owned) {
      const localSignedUrl = createLocalSignedPhotoUrl(input.photoPath, 60 * 60);
      if (localSignedUrl) {
        messages.push({
          type: "image",
          originalContentUrl: localSignedUrl,
          previewImageUrl: localSignedUrl,
        });
      } else {
        const sb = getSupabaseAdmin();
        if (sb) {
        const { data: signed, error } = await sb.storage
          .from("record-photos")
          .createSignedUrl(input.photoPath, 60 * 60);
        if (!error && signed?.signedUrl) {
          messages.push({
            type: "image",
            originalContentUrl: signed.signedUrl,
            previewImageUrl: signed.signedUrl,
          });
        }
        }
      }
    } else {
      logAudit({
        action: "PHOTO_OWNERSHIP_REJECT",
        actorLineUserId: input.actorLineUserId,
        resourceType: "photo",
        resourceId: input.photoPath,
        status: "forbidden",
        metadata: { context: "expense_push", elderId: input.elderId },
      });
    }
  }

  const result = await pushMessage(input.ownerLineUserId, messages);

  logAudit({
    action: "PUSH_RECORD",
    actorLineUserId: input.ownerLineUserId,
    resourceType: "expense_push",
    resourceId: String(input.expenseId),
    status: result.ok ? "ok" : "fail",
    metadata: { category: input.category, lineStatus: result.status },
  });

  return { ok: result.ok };
}
