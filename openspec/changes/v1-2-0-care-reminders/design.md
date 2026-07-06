## Context

v1.1.0 已有 `care_events`、`remind_at`、醫療相關旗標與首頁最小流程。當時明確決定 reminder runtime 延後，避免在沒有排程、重試與失敗處理的情況下讓使用者誤以為 LINE 提醒已啟用。

提醒 runtime 會碰到敏感資料與營運責任：回診時間、地點、自由文字備註、LINE ID、群組 ID、推播失敗原因與 cron logs 都不能隨意輸出。設計上要把「一般日程提醒」和「醫療指示」切開，也要把「輔助提醒」和「保證送達」切開。

## Goals / Non-Goals

**Goals:**

- 讓 server-side runtime 能送出到期的照護行程 LINE reminder。
- 第一版支援看護、家屬與已綁定 LINE 群組三種收件者，但收件對象必須明確選擇。
- 避免同一筆 reminder 被重複 worker 送出。
- 記錄送達狀態、嘗試次數、最後嘗試時間與去識別化錯誤類型。
- 對醫療相關行程固定加入自然、直接的非醫療指示文案。
- 保持 cron response、audit metadata 與 logs 不輸出 raw LINE user ID、自由文字 note、raw provider error 或無關長者資料。
- 以 tests 保護 claim、retry、redaction、copy 與 disabled / unauthenticated / invalid secret paths。

**Non-Goals:**

- 不做醫療判斷、診斷、分流、治療、劑量或急迫性建議。
- 不保證 LINE 一定送達。
- 不做日曆雙向同步、週期性事件、拖拉排程或大型 calendar grid。
- 不做薪資、排班或請假代理人安排。
- 不重構多家屬角色或整體 data layer。

## Decisions

### 1. Add explicit reminder delivery state instead of inferring from `remind_at`

`remind_at` 只代表使用者希望何時提醒，不代表已排程、已送出或失敗。runtime 應新增 delivery state，例如獨立 `care_event_reminders` 表，或在 `care_events` 上新增 `reminder_status`、`reminder_attempts`、`reminder_claimed_at`、`reminder_last_attempt_at` 與 `reminder_last_error_code`。

建議先用獨立表。理由是 delivery log 與行程本身生命週期不同，後續若要多次提醒、不同收件者或群組提醒，不會把 `care_events` 塞滿 runtime 欄位。

### 2. Claim due reminders in a transaction

Cron / worker 每次只 claim 一批 due reminders。Claim 條件應包含 `remind_at <= now()`、行程未取消、尚未送出、attempts 未超過上限，以及 claim 已過期或未被 claim。Claim 後才呼叫 LINE API。

這可以降低重複推播風險。若 worker crash，claim TTL 到期後可重試。

### 3. Store provider errors as coarse codes

LINE provider error 不應原文寫進 public response、audit metadata 或可長期保存的資料欄位。runtime 只保存粗分類，例如 `provider_rejected`、`rate_limited`、`network_error`、`config_missing`、`unknown_error`。

詳細錯誤只能短期留在 server log，且不得含 LINE user ID、token、自由文字 note 或完整 payload。

### 4. Keep reminder copy short and constrained

Reminder message 只放必要資訊：

- 行程標題。
- 日期時間。
- 地點若存在可放，但不要放長篇 note。
- 醫療相關行程附上自然版提醒文案，例如：「這是一般日程提醒，不是醫療指示。實際照護或用藥請依醫師、護理師或藥師說明。」
- 一般提醒附上不保證送達的語氣，例如：「LINE 通知可能因網路或使用者設定延遲，請仍以實際安排為準。」

自由文字 note 預設不推播。若後續要推播 note，要另開產品與資安審查。

### 5. Recipient targeting is explicit

第一版支援三種收件者：

- 看護：送到已配對看護的 LINE user ID。
- 家屬：送到 owner LINE user ID。
- LINE 群組：送到已綁定的 `notify_group_id`。

建立或更新提醒時必須保存收件者類型。系統不得因為三種收件者都存在就預設全發。群組提醒需要二次確認，因為群組內所有現有與未來成員都可能看到提醒。

### 6. Retry behavior is configurable

重試次數與時間由系統參數控制。第一版建議預設：

- `REMINDER_MAX_ATTEMPTS=3`
- `REMINDER_RETRY_DELAY_MINUTES=10`
- `REMINDER_CLAIM_TTL_MINUTES=5`

參數缺漏時 runtime 應使用保守預設值，並在 server log 只記錄設定缺漏類型，不輸出 secret 或完整 payload。

### 7. User-visible failure reasons are coarse

提醒失敗要讓使用者看見，但只能顯示大概原因。建議分類：

- `blocked_or_disabled`：通知設定、封鎖或收件端狀態造成無法送達。
- `line_unavailable`：LINE 服務或網路暫時無法送出。
- `config_missing`：系統提醒設定尚未完成。
- `expired`：提醒逾時，系統未再重送。
- `unknown`：暫時無法判斷原因。

UI 文案範例：

> 這筆提醒沒有成功送出。可能是 LINE 通知設定、封鎖、網路或系統設定造成。系統不會顯示完整錯誤內容，以避免洩漏個資。

不得顯示 LINE user ID、group ID、raw provider error、token 狀態、完整 note 或 provider response body。

### 8. Runtime is server-only

Reminder runtime 只能由 cron secret 驗證後的 server endpoint、worker 或 scheduler 觸發。Client UI 只管理 `remind_at` 與顯示狀態，不直接呼叫 LINE push。

## Risks / Trade-offs

- LINE 失敗可能被誤解成系統失職 → UI 與文件要說提醒是輔助，delivery status 不能寫成保證。
- 醫療相關提醒容易越界 → copy helper 與 tests 要固定禁止醫療建議語氣。
- 群組提醒隱私風險高 → 群組收件者必須二次確認，不預設啟用。
- 重複推播會造成使用者困擾 → claim / lock 與 idempotency 是第一版必要條件。
- 保存 delivery log 會新增敏感資料面 → 欄位最小化，保留期限跟照護紀錄或更短，刪除請求要涵蓋 reminder logs。
- 現有 app 仍依賴 Supabase client → schema migration 可以先定義，但 production runtime 還要配合 ADR-0010 的直接連 Postgres data layer 重構。

## Migration Plan

1. 先新增 OpenSpec capability 與 tasks，不直接啟用 runtime。
2. 建立 reminder delivery state migration，包含 rollback、retention 與 redaction 說明。
3. 以 TDD 實作 copy helper、recipient target helper、claim helper、retry classification helper。
4. 實作 server-only cron / worker endpoint，沿用 cron secret 與 redacted response 模式。
5. 接 LINE client mock tests，再接實際 LINE push wrapper。
6. 更新 UI 顯示 reminder status，但不做大型 calendar grid。
7. 更新 runbook：cron schedule、manual dry-run、failure handling、token rotation 後驗證。

Rollback 原則：

- 先停用 cron / worker，再停止 UI 上的 active reminder 說明。
- 若 rollback runtime code，保留 reminder delivery state 供稽核，除非已確認沒有 production 真實資料或已有資料匯出 / 刪除處理。
- 不修改既有 v1.1.0 migration；新增 migration 只能 forward，rollback 另附 `.down.sql`。
