## Why

使用者已提出行事曆、回診提醒與看護請假需求。現有系統有照護紀錄、家屬 LINE 推播、長者卡與記帳，但沒有未來行程或請假資料模型；若直接加頁面，會把 schema、權限、LINE reminder、醫療相關文案與隱私責任混在一起。

v1.1.0 先做最小可審查範圍：照護行程與看護請假紀錄。它要服務「外籍家庭看護與家屬之間的照護協作」，不能變成醫療系統、排班系統或看護監控工具。

## What Changes

- 新增照護行程能力：
  - 家屬與看護可共同管理已配對長者的照護行程。
  - 看護可查看與自己配對長者相關的未來 7 天 / 30 天行程。
  - 行程類型先限制為回診、復健、拿藥、檢查、家訪、其他。
  - 醫療相關行程必須有 `is_medical_related` 或等效欄位，UI 與 LINE reminder 文案要標示「此為一般日程提醒，非醫療指示」。
- 新增看護請假紀錄能力：
  - 看護可提出請假時間、原因與備註。
  - 家屬可查看請假紀錄並標記已確認。
  - 家屬不得代替看護新增請假紀錄。
- 新增必要資料模型與權限測試：
  - `care_events`。
  - `caregiver_leave_requests`。
  - migration 必須有回滾策略，且資料保留、刪除權、可讀寫角色要寫清楚。
- 新增 LINE reminder 的設計邊界：
  - LINE reminder runtime 先不納入 v1.1.0。
  - 本輪只保留 reminder 欄位與 UI 說明，等排程、重試與失敗處理確認後再做。
- 更新相關文件：
  - changelog、testing、security / known limitations、operations 或 privacy / terms 影響說明。

明確排除：

- 醫院掛號系統串接。
- Google Calendar / Apple Calendar 雙向同步。
- 複雜排班、代理人排班、薪資、扣款或勞資爭議判定。
- 醫療急迫性判斷、診斷、治療、劑量、分流或 AI 醫療建議。
- 多家屬角色重整；若 v1.1.0 需要多家屬權限，必須另開 ADR 或 change。
- 大型 UI refactor 或 design system 導入。

## Capabilities

### New Capabilities

- `care-calendar`: 定義照護行程的建立、修改、取消、查看、醫療相關提醒免責、LINE reminder 邊界與權限要求。
- `caregiver-leave`: 定義看護請假紀錄的建立、家屬確認、狀態流轉、權限邊界與不可做的排班 / 薪資範圍。

### Modified Capabilities

- None. 目前 `openspec/specs/` 尚無既有 capability spec；本 change 先新增 v1.1.0 相關能力。

## Impact

- Affected runtime areas in later implementation PRs:
  - new data access helpers under `src/lib/*` for care events and leave requests
  - new or updated API routes under `src/app/api/*`
  - caregiver-facing pages such as `src/app/page.tsx` or a dedicated calendar route
  - family-facing pages for event creation and leave acknowledgement
  - LINE reminder / push code is deferred until reminder rules are explicitly designed
- Affected data and security boundaries:
  - future care schedules, locations, notes, medical-related flags
  - caregiver leave reasons and notes
  - LINE user IDs and paired elder ownership checks
  - deletion requests, backup retention, audit metadata, reminder logs
- Affected docs:
  - `docs/product/USER_REQUIREMENTS.md`
  - `docs/product/ROADMAP.md`
  - `docs/engineering/TESTING.md`
  - `docs/security/SECURITY.md`
  - `docs/governance/KNOWN_LIMITATIONS.md`
  - `docs/operations/RUNBOOK.md`
  - `docs/releases/CHANGELOG.md`
- No runtime dependency changes are expected for the proposal phase. Do not add OpenSpec or Superpowers to `package.json`.
