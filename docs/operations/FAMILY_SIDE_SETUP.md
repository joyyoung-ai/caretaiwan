# 家屬端 LINE Bot 設置指南

日期：2026-07-01

這份文件說明家屬端 LINE Bot、webhook 與配對流程。正式環境以 VM / Docker 部署為主；原作者 Vercel 流程只保留為歷史參考。

## Production / VM Setup

### 1. 建立 LINE Messaging API Channel

到 [LINE Developers Console](https://developers.line.biz/console/)：

1. 選擇 Provider。
2. Create a new channel。
3. 選 **Messaging API**，不是 LINE Login。
4. 建立名稱，例如 `看護助手家屬端` 或 `CareTaiwan Family`。

建好後確認：

- Basic settings：取得 **Channel secret**。
- Messaging API：Issue **long-lived channel access token**。
- Messaging API：設定 **Webhook URL**。

正式 VM webhook URL 格式：

```text
https://your-app.example.com/api/line/webhook
```

LINE Developers 設定：

- Use webhook：開啟。
- Auto-reply messages：關閉。LINE 預設自動回覆可能擋掉 webhook。
- Greeting messages：可開可關，webhook 會處理 follow event。

### 2. 設定 production 環境變數

在 `docker/.env.production` 填入：

| Key | 來源 |
|---|---|
| `LINE_BOT_CHANNEL_SECRET` | LINE Messaging API Channel secret |
| `LINE_BOT_CHANNEL_ACCESS_TOKEN` | LINE Messaging API long-lived channel access token |

目前程式不讀 `LINE_BOT_CHANNEL_ID`。Channel ID 可留在內部部署筆記，但不要放進 production 必填 env 清單。

### 3. 重啟容器

```bash
cd docker
docker compose up -d
docker compose ps
```

如果只更新 env，依實際部署方式重啟 app container。正式 runbook 補齊前，至少要記錄本次部署時間、image tag、env 變更與操作者。

### 4. 驗證 webhook

在 LINE Developers Console 的 Messaging API 頁面點 **Verify**。應回 Success。

若失敗，先檢查：

- `PUBLIC_APP_URL` 是否是正式 HTTPS 網域。
- 反向代理是否把 `/api/line/webhook` 轉到 app container。
- `LINE_BOT_CHANNEL_SECRET` 是否正確。
- app log 是否出現 signature 驗證失敗。

### 5. 取得 Bot ID 或 QR Code

LINE Developers Console → Messaging API → Bot basic ID / QR code。

將 Bot basic ID 或 QR code 提供給家屬測試。不要把 production channel token 貼到 issue、PR 或聊天截圖。

## 配對測試流程

1. 看護端登入並開啟 `/card`。
2. 在「配對家屬 LINE」區塊產生配對碼。
3. 使用另一個 LINE 帳號加 Bot 為好友。
4. 對 Bot 傳送 6 位配對碼。
5. Bot 回覆配對成功。
6. 看護端新增照護紀錄，並主動開啟「送出給家屬」。
7. 家屬 LINE 收到推播。

測試資料不可使用 production 真實個資、正式備份檔或未去識別化照片。

## 相關環境變數

| 變數 | 用途 |
|---|---|
| `LINE_CHANNEL_ID` | LINE Login Channel |
| `LINE_CHANNEL_SECRET` | LINE Login Channel secret |
| `LINE_BOT_CHANNEL_SECRET` | LINE Messaging API webhook 驗簽 |
| `LINE_BOT_CHANNEL_ACCESS_TOKEN` | LINE Messaging API push message |
| `AUTH_SECRET` | Auth.js session secret |
| `DATABASE_URL` | VM 自管 Postgres connection string |
| `LOCAL_PHOTO_STORAGE_DIR` | VM local photo storage path |
| `LOCAL_PHOTO_SIGNING_SECRET` | Photo signed URL secret |

## Legacy Vercel Reference

原作者原型曾使用 Vercel。若只是在追溯原型部署，可在 Vercel project Settings → Environment Variables 填入：

- `LINE_BOT_CHANNEL_SECRET`
- `LINE_BOT_CHANNEL_ACCESS_TOKEN`

然後 redeploy。這不是中揚資訊正式環境的部署標準。

## 故障排除

**家屬加 Bot 後沒收到歡迎訊息**

- LINE Developers Console → Channel → Use webhook 是否開啟。
- Auto-reply messages 是否關閉。
- Webhook URL 點 Verify 是否成功。
- app log 是否有 webhook request。

**配對碼傳給 Bot 沒反應**

- 看護端必須先在 `/card` 產生配對碼。
- 配對碼會自動轉大寫，傳小寫也可。
- 檢查 `LINE_BOT_CHANNEL_SECRET` 是否正確。
- 檢查 webhook route 是否回 503。

**送出記錄家屬沒收到**

- 確認長者已配對。
- 確認看護端登入 LINE Login。
- 檢查 `LINE_BOT_CHANNEL_ACCESS_TOKEN` 是否正確。
- 檢查 LINE push 額度是否用完。
