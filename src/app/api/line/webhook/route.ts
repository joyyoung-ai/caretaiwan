// LINE Messaging API webhook
// Handles: family adding bot, sending pairing codes, etc.
import { NextResponse } from "next/server";
import {
  isLineBotEnabled,
  verifyLineSignature,
  replyMessage,
} from "@/lib/line-bot";
import { bindFamily, bindNotifyGroup, findPairingByCode } from "@/lib/pairing";
import { rateLimitAsync } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const WELCOME = (
  "歡迎加入看護助手 CareTaiwan 家屬端！\n" +
  "\n" +
  "你的 LINE 已連線。當看護按「送出給家屬」時，記錄會直接推送到這裡。\n" +
  "\n" +
  "若還沒配對看護，請先在 PWA 開啟老人醫護卡，產生 6 位配對碼後傳給看護。\n" +
  "\n" +
  "⚠️ 本服務目前為試辦版，僅供受邀測試與導入準備使用，不取代醫療建議。緊急狀況請撥 119。"
);

const HELP = (
  "📌 使用說明\n" +
  "\n" +
  "1) 在 PWA 建立老人醫護卡並產生 6 位配對碼\n" +
  "2) 把配對碼傳給看護，他在 PWA 輸入後即配對\n" +
  "3) 配對成功後，看護按「送出給家屬」的記錄會推送到這裡\n" +
  "\n" +
  "（也可以把看護給你的舊配對碼直接傳到這裡作為備援。）"
);

const GROUP_WELCOME = (
  "👋 大家好,我是看護助手 CareTaiwan。\n" +
  "\n" +
  "若要讓本群組接收看護回報的記錄,請由醫護卡擁有者:\n" +
  "1) 在 PWA 開啟醫護卡 → 點「家族群組推播」→ 產生 6 位群組配對碼\n" +
  "2) 在本群組直接傳送該配對碼\n" +
  "3) 綁定成功後,看護的記錄會推到群組裡\n" +
  "\n" +
  "⚠️ 群組內所有成員都會看到老人健康記錄與照片,請評估隱私後再綁定。\n" +
  "緊急狀況請撥 119。"
);

const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/i;

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string; groupId?: string; roomId?: string };
  message?: { type: string; text?: string };
};

export async function POST(req: Request) {
  if (!isLineBotEnabled()) {
    return NextResponse.json(
      { error: "LINE Bot 尚未啟用（環境變數未設定）" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // v55: malformed signed body → 400，不再讓 webhook 變 noisy 500（codex LOW-1）
  let data: { events: LineEvent[] };
  try {
    data = JSON.parse(rawBody) as { events: LineEvent[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await Promise.all(
    (data.events ?? []).map((ev) =>
      // Only log error message string — never the event payload (may contain user text)
      handleEvent(ev).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "unknown";
        console.error("[LINE Webhook]", msg);
      })
    )
  );

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: LineEvent) {
  const sourceType = event.source?.type;
  const replyToken = event.replyToken;
  if (!replyToken) return;

  // ---- Group / Room events (家族 LINE 群組推播) ----
  if (sourceType === "group" || sourceType === "room") {
    const groupId = event.source?.groupId ?? event.source?.roomId;
    if (!groupId) return;

    // Bot 被加進群組 / 聊天室
    if (event.type === "join") {
      await replyMessage(replyToken, [{ type: "text", text: GROUP_WELCOME }]);
      return;
    }

    // 群組內收到文字訊息 → 嘗試當成群組配對碼
    if (event.type === "message" && event.message?.type === "text") {
      // Rate limit per group（跨 Vercel instance 共用 Upstash）
      const rl = await rateLimitAsync(`line-group:${groupId}`, {
        max: 5,
        windowMs: 5 * 60 * 1000,
      });
      if (!rl.ok) {
        // 群組內被洗版時不回應(避免幫忙洗版)
        return;
      }

      const text = (event.message.text ?? "").trim();
      if (!CODE_REGEX.test(text)) {
        // 群組內非配對碼訊息 → 完全不回應(不打擾日常聊天)
        return;
      }

      const code = text.toUpperCase();
      const result = await bindNotifyGroup(code, groupId);
      if (!result.ok) {
        logAudit({
          action: "GROUP_PAIRING_BIND_REJECT",
          resourceType: "group_pairing",
          status: "forbidden",
          metadata: { reason: result.error },
        });
        await replyMessage(replyToken, [
          {
            type: "text",
            text:
              result.error === "INVALID_OR_EXPIRED_OR_BOUND"
                ? "配對碼錯誤、已過期、或此醫護卡已綁定其他群組。\n請家屬到 PWA 重新產生群組配對碼。"
                : "綁定失敗,請稍後再試。",
          },
        ]);
        return;
      }
      logAudit({
        action: "GROUP_PAIRING_BIND",
        resourceType: "group_pairing",
        resourceId: result.pairing?.elder_id,
        status: "ok",
      });
      const elderName = result.pairing?.display_name ?? "老人";
      await replyMessage(replyToken, [
        {
          type: "text",
          text:
            `✅ 群組綁定成功!\n\n` +
            `照顧對象:${elderName}\n` +
            `\n` +
            `之後看護按「送出給家屬+群組」的記錄會推送到本群組。\n` +
            `\n` +
            `⚠️ 提醒群組內所有成員:老人的健康狀況屬於隱私資料,` +
            `請勿截圖外傳。`,
        },
      ]);
      return;
    }

    // 其他 group 事件(leave, member-join 等)不處理
    return;
  }

  // ---- 1-on-1 user events (原有邏輯) ----
  const userId = event.source?.userId;
  if (!userId) return;

  // Family added bot as friend
  if (event.type === "follow") {
    await replyMessage(replyToken, [{ type: "text", text: WELCOME }]);
    return;
  }

  // Family sent a text message
  if (event.type === "message" && event.message?.type === "text") {
    // Rate limit per LINE user — 防爆破配對碼（5 次 / 5 分鐘）
    const rl = await rateLimitAsync(`line-msg:${userId}`, {
      max: 5,
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.ok) {
      logAudit({
        action: "RATE_LIMITED",
        actorLineUserId: userId,
        resourceType: "line_webhook",
        status: "forbidden",
      });
      await replyMessage(replyToken, [
        {
          type: "text",
          text: "訊息過於頻繁，請稍後再試（5 分鐘內最多 5 次）。",
        },
      ]);
      return;
    }

    const text = (event.message.text ?? "").trim();

    if (text === "說明" || text.toLowerCase() === "help") {
      await replyMessage(replyToken, [{ type: "text", text: HELP }]);
      return;
    }

    if (text === "重新配對" || text === "解除配對") {
      await replyMessage(replyToken, [
        {
          type: "text",
          text: "請在 PWA 重新產生新配對碼，或直接傳送 6 位英數字配對碼。",
        },
      ]);
      return;
    }

    // Try as pairing code
    if (CODE_REGEX.test(text)) {
      const code = text.toUpperCase();
      const pairing = await findPairingByCode(code);
      if (!pairing) {
        await replyMessage(replyToken, [
          {
            type: "text",
            text: "找不到配對碼。請確認 6 碼是否正確、是否仍在 24 小時有效期內。",
          },
        ]);
        return;
      }
      // 防錯綁：家屬(owner)不能在 Bot 把自己綁成看護(paired_line_user_id)
      if (pairing.owner_line_user_id === userId) {
        await replyMessage(replyToken, [
          {
            type: "text",
            text:
              "你是這張醫護卡的擁有者(家屬)，不需要透過 Bot 輸入配對碼。\n" +
              "看護應該在他們自己的 PWA 用 LINE 登入後輸入此碼。",
          },
        ]);
        return;
      }
      const result = await bindFamily(code, userId);
      if (!result.ok) {
        logAudit({
          action: "PAIRING_BIND_REJECT",
          actorLineUserId: userId,
          resourceType: "pairing",
          status: "forbidden",
          metadata: { reason: result.error },
        });
        const userMsg =
          result.error === "ALREADY_PAIRED_OR_EXPIRED"
            ? "此配對碼已被使用或已過期。請在 PWA 重新產生新配對碼。"
            : "配對失敗，請稍後再試。";
        await replyMessage(replyToken, [{ type: "text", text: userMsg }]);
        return;
      }
      logAudit({
        action: "PAIRING_BIND",
        actorLineUserId: userId,
        resourceType: "pairing",
        resourceId: result.pairing?.elder_id,
        status: "ok",
      });
      const elderName = result.pairing?.display_name ?? "老人";
      await replyMessage(replyToken, [
        {
          type: "text",
          text:
            `✅ 配對成功！\n\n` +
            `照顧對象：${elderName}\n` +
            `\n` +
            `之後看護按「送出給家屬」的記錄會直接傳到這裡。`,
        },
      ]);
      return;
    }

    // Default
    await replyMessage(replyToken, [
      {
        type: "text",
        text: WELCOME,
      },
    ]);
    return;
  }
}

export async function GET() {
  // For LINE webhook verification (some setups GET first)
  return NextResponse.json({ status: "ok", botEnabled: isLineBotEnabled() });
}
