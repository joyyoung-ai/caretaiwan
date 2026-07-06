## Why

v1.1.0 已建立照護行程與看護請假 foundation，並保留 `remind_at` 欄位，但刻意不啟用 LINE reminder runtime。下一步若要讓提醒真的送出，必須先把排程、claim、重試、失敗狀態、LINE 文案與 PII redaction 寫清楚，不能只在建立行程時即時推播。

這個 change 只處理照護行程提醒 runtime。它不新增醫療判斷，也不把 CareTaiwan 變成醫療系統、排班系統或保證送達的告警系統。

## What Changes

- 新增照護行程 LINE reminder runtime：
  - 只處理 `care_events.remind_at` 已到、狀態仍可提醒的行程。
  - 第一版支援提醒看護、家屬與已綁定 LINE 群組，但必須由使用者明確選擇收件對象，不預設全發。
  - 以 claim / lock 機制避免同一筆提醒被多個 worker 重複送出。
  - 記錄 reminder delivery 狀態、嘗試次數、最後錯誤類型與最後嘗試時間。
  - 支援由系統參數控制的 retry；永久失敗要可查，但 public response 與 audit metadata 不輸出原始 LINE user ID、自由文字 note、照片 URL 或 raw provider error。
- 新增 LINE reminder 文案規則：
  - 醫療相關行程必須包含「此為一般日程提醒，非醫療指示」或核准等效文案。
  - 提醒不得包含診斷、分流、治療、劑量、急迫性判斷或保證送達語氣。
  - 訊息內容要盡量短，只放必要時間、標題與一般提醒說明。
  - 醫療相關提醒文案依 `Humanizer-zh-TW` 原則撰寫：直接、具體、不要像系統公告或法律免責堆疊。
- 新增 cron / worker 邊界：
  - runtime 由 server-side cron 或 worker 觸發，不由 client 發送。
  - cron endpoint 必須使用既有 cron secret 驗證與 redacted response 模式。
  - reminder runtime 不依賴真實 LINE OAuth session。
- 更新測試與文件：
  - 補 helper tests、route / worker tests、LINE client mock tests。
  - 更新 `docs/engineering/TESTING.md`、`docs/security/SECURITY.md`、`docs/governance/KNOWN_LIMITATIONS.md`、`docs/operations/RUNBOOK.md` 與 changelog。

明確排除：

- 醫療建議、診斷、治療、劑量、分流或急迫性判斷。
- Google Calendar / Apple Calendar 雙向同步。
- 排班、薪資、扣款、代理人安排或勞資爭議判定。
- 多家屬角色重構。
- 保證 LINE 提醒一定送達。
- 預設將提醒送給所有可能收件者。
- 大型 UI calendar grid、週期性事件或拖拉編輯。

## Capabilities

### New Capabilities

- `care-reminders`: 定義照護行程 LINE reminder runtime 的排程、claim、送達狀態、retry、失敗處理、醫療相關文案與 redaction 要求。

### Modified Capabilities

- `care-calendar`: 啟用先前 inert `remind_at` 欄位的 server-side runtime，但不改變 v1.1.0 的行程 ownership 模型。

## Impact

- Affected runtime areas in later implementation PRs:
  - new reminder helper under `src/lib/*`
  - new cron / worker route under `src/app/api/cron/*` or equivalent server-only entrypoint
  - existing LINE Bot push helper or a dedicated reminder LINE client wrapper
  - care event update behavior if reminder status must reset when `remind_at` changes
- Affected data and security boundaries:
  - care event titles, time, location, note and medical-related flag
  - LINE user IDs, group IDs and delivery status
  - cron responses, audit metadata, provider error redaction and retry logs
- Affected docs:
  - `docs/engineering/TESTING.md`
  - `docs/security/SECURITY.md`
  - `docs/governance/KNOWN_LIMITATIONS.md`
  - `docs/operations/RUNBOOK.md`
  - `docs/releases/CHANGELOG.md`
- Schema may need a new production migration for reminder delivery state. Do not modify existing applied migrations.
