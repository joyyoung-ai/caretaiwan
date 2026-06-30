"use server";

import { auth } from "@/auth";
import { pushMessage, isLineBotEnabled } from "@/lib/line-bot";
import { getPairingsByPaired } from "@/lib/pairing";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { verifyPhotoOwnership } from "@/lib/record-photos";
import { createLocalSignedPhotoUrl } from "@/lib/local-photo-storage";

type RecordType =
  | "temp"
  | "stool"
  | "sleep"
  | "fall"
  | "med"
  | "meal"
  | "ng_feed"
  | "turn"
  | "bp"
  | "glucose"
  | "spo2"
  | "diaper"
  | "back_pat"
  | "ng_change"
  | "catheter_change"
  | "alert";

const TYPE_LABEL: Record<RecordType, { icon: string; label: string }> = {
  temp:  { icon: "🌡️", label: "體溫記錄" },
  stool: { icon: "💩", label: "排便記錄" },
  sleep: { icon: "😴", label: "睡眠記錄" },
  fall:  { icon: "🤕", label: "跌倒記錄" },
  med:   { icon: "💊", label: "吃藥記錄" },
  meal:  { icon: "🍚", label: "用餐記錄" },
  ng_feed:         { icon: "🥣", label: "鼻胃管灌食" },
  turn:            { icon: "🔄", label: "翻身" },
  bp:              { icon: "🫀", label: "血壓" },
  glucose:         { icon: "🩸", label: "血糖" },
  spo2:            { icon: "🫁", label: "血氧" },
  diaper:          { icon: "🧷", label: "尿布更換" },
  back_pat:        { icon: "👐", label: "翻身拍背" },
  ng_change:       { icon: "💉", label: "鼻胃管更換" },
  catheter_change: { icon: "💧", label: "尿管更換" },
  alert: { icon: "🚨", label: "緊急情況" },
};

/**
 * 看護端按下「送出給家屬」時呼叫。
 * 流程：
 *  caller = 看護（paired_line_user_id）
 *  找 pairings 中 paired_line_user_id = caller 的記錄
 *  推播給對應 owner_line_user_id（家屬，他必須已加 LINE Bot 為好友）
 */
export async function pushRecordToFamily(input: {
  elderId: string;
  elderName?: string;
  recordType: RecordType;
  value?: string;
  note?: string;
  timestamp: number;
  photoPath?: string; // Supabase Storage path (private bucket)
  alsoSendToGroup?: boolean; // 是否同時推播到家族 LINE 群組
}): Promise<{ ok: boolean; reason?: string; groupSent?: boolean }> {
  if (!isLineBotEnabled()) return { ok: false, reason: "BOT_DISABLED" };
  const session = await auth();
  const lineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!lineUserId) return { ok: false, reason: "NOT_LOGGED_IN" };

  const pairings = await getPairingsByPaired(lineUserId);
  const target = pairings.find(
    (p) => p.elder_id === input.elderId && p.owner_line_user_id
  );
  if (!target) return { ok: false, reason: "NOT_PAIRED" };

  const meta = TYPE_LABEL[input.recordType];
  const lines: string[] = [];
  lines.push(`【${input.elderName ?? "老人"} ${meta.icon} ${meta.label}】`);
  if (input.value) {
    if (input.recordType === "temp") lines.push(`🌡️ ${input.value}°C`);
    else if (input.recordType === "bp") lines.push(`🫀 ${input.value} mmHg`);
    else if (input.recordType === "glucose") lines.push(`🩸 ${input.value} mg/dL`);
    else if (input.recordType === "spo2") lines.push(`🫁 ${input.value}%`);
  }
  if (input.note) {
    lines.push(`💬 看護備註：${input.note}`);
  }
  lines.push("");
  lines.push(
    `📅 ${new Date(input.timestamp).toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })}`
  );
  lines.push("─────────────");
  lines.push("緊急狀況請撥 119");

  // Push to family (owner) - 有照片就一起傳 (LINE 訊息陣列最多 5 則)
  const messages: Array<
    | { type: "text"; text: string }
    | { type: "image"; originalContentUrl: string; previewImageUrl: string }
  > = [{ type: "text", text: lines.join("\n") }];

  // 照片:從 private bucket path 簽 1h signed URL,只給 LINE 平台這一次
  // 1h 後 LINE CDN 已 cache 完訊息,signed URL 過期不影響家屬已收到的訊息
  // v55: 簽 URL 前先驗 metadata（uploader+elder+purpose 三者吻合）— codex HIGH-2
  // 無 metadata 或不符 → skip 照片，不擋整則 push
  let photoOwned = false;
  if (input.photoPath) {
    photoOwned = await verifyPhotoOwnership({
      path: input.photoPath,
      actorLineUserId: lineUserId,
      elderId: input.elderId,
      purpose: "record",
    });
    if (!photoOwned) {
      logAudit({
        action: "PHOTO_OWNERSHIP_REJECT",
        actorLineUserId: lineUserId,
        resourceType: "photo",
        resourceId: input.photoPath,
        status: "forbidden",
        metadata: { context: "record_push", elderId: input.elderId },
      });
    }
  }
  if (input.photoPath && photoOwned) {
    const localSignedUrl = createLocalSignedPhotoUrl(input.photoPath, 60 * 60);
    if (localSignedUrl) {
      messages.push({
        type: "image",
        originalContentUrl: localSignedUrl,
        previewImageUrl: localSignedUrl,
      });
    } else {
      const sbAdmin = getSupabaseAdmin();
      if (sbAdmin) {
      const { data: signed, error: signErr } = await sbAdmin.storage
        .from("record-photos")
        .createSignedUrl(input.photoPath, 60 * 60);
      if (!signErr && signed?.signedUrl) {
        messages.push({
          type: "image",
          originalContentUrl: signed.signedUrl,
          previewImageUrl: signed.signedUrl,
        });
      }
      // 簽不出來就只送文字訊息,不要因為照片掛掉整則 push 失敗
      }
    }
  }

  const result = await pushMessage(target.owner_line_user_id, messages);

  // Audit log: only record type + status, never content (privacy)
  const sb = getSupabaseAdmin();
  if (sb) {
    sb.from("push_logs")
      .insert({
        elder_id: input.elderId,
        line_user_id: target.owner_line_user_id,
        record_type: input.recordType,
        status: result.ok ? "sent" : `error_${result.status}`,
      })
      .then(() => {});
  }

  logAudit({
    action: "PUSH_RECORD",
    actorLineUserId: lineUserId,
    resourceType: "push",
    resourceId: input.elderId,
    status: result.ok ? "ok" : "fail",
    metadata: { recordType: input.recordType, lineStatus: result.status },
  });

  // ---- 家族 LINE 群組推播 (Phase: 1對1 之後另推一則) ----
  let groupSent = false;
  // target 是 Pairing 物件,可能含 notify_group_id;但 getPairingsByPaired 是 select * 已有此欄位
  const targetWithGroup = target as typeof target & {
    notify_group_id?: string | null;
    notify_group_photo?: boolean | null;
  };
  if (
    input.alsoSendToGroup &&
    targetWithGroup.notify_group_id &&
    isLineBotEnabled()
  ) {
    // 群組訊息:文字一致;照片受 notify_group_photo 開關控制(預設開)
    const groupMessages: Array<
      | { type: "text"; text: string }
      | { type: "image"; originalContentUrl: string; previewImageUrl: string }
    > = [{ type: "text", text: lines.join("\n") }];

    const includePhotoInGroup =
      targetWithGroup.notify_group_photo !== false; // null/undefined/true 都算 true

    // v55: 群組推播也走相同 photoOwned gate（已在 1-on-1 段驗過、這裡複用）
    if (input.photoPath && includePhotoInGroup && photoOwned) {
      const localSignedUrl = createLocalSignedPhotoUrl(input.photoPath, 60 * 60);
      if (localSignedUrl) {
        groupMessages.push({
          type: "image",
          originalContentUrl: localSignedUrl,
          previewImageUrl: localSignedUrl,
        });
      } else {
        const sbAdmin = getSupabaseAdmin();
        if (sbAdmin) {
        const { data: signed, error: signErr } = await sbAdmin.storage
          .from("record-photos")
          .createSignedUrl(input.photoPath, 60 * 60);
        if (!signErr && signed?.signedUrl) {
          groupMessages.push({
            type: "image",
            originalContentUrl: signed.signedUrl,
            previewImageUrl: signed.signedUrl,
          });
        }
        }
      }
    }

    const groupResult = await pushMessage(
      targetWithGroup.notify_group_id,
      groupMessages
    );
    groupSent = groupResult.ok;

    if (sb) {
      sb.from("push_logs")
        .insert({
          elder_id: input.elderId,
          line_user_id: targetWithGroup.notify_group_id,
          record_type: input.recordType,
          status: groupResult.ok ? "group_sent" : `group_error_${groupResult.status}`,
        })
        .then(() => {});
    }

    logAudit({
      action: "PUSH_GROUP",
      actorLineUserId: lineUserId,
      resourceType: "push",
      resourceId: input.elderId,
      status: groupResult.ok ? "ok" : "fail",
      metadata: {
        recordType: input.recordType,
        lineStatus: groupResult.status,
        includePhoto: includePhotoInGroup && !!input.photoPath,
      },
    });
  }

  return {
    ok: result.ok,
    reason: result.ok ? undefined : `LINE_${result.status}`,
    groupSent,
  };
}
