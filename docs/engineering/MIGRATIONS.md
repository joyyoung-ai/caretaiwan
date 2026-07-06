# Production Migrations

日期：2026-07-06

正式資料庫採 VM 自管 Postgres。`supabase-schema.sql` 仍保留為本機、測試或一次性初始化用的 idempotent schema，但 production 不再只靠手動 SQL 或單一 schema 檔。

## 目前 migration series

- `supabase/migrations/202607060001_create_care_calendar_tables.sql`
  - 建立 `care_events` 與 `caregiver_leave_requests`。
  - 加上固定類型、狀態、時間範圍與醫療相關旗標 constraints。
  - 啟用 RLS，並建立查詢需要的 indexes。
  - 補上資料保留、刪除請求、PII 與請假紀錄用途限制註解。
- `supabase/migrations/202607060001_create_care_calendar_tables.down.sql`
  - 只移除 v1.1.0 新增的兩張表。
  - Rollback 前應先停用照護行程與看護請假 API / UI 入口。

## 驗證

每次新增或修改 migration 後，至少執行：

```bash
npm run migrations:check
npm run docs:check
```

`npm run migrations:check` 會檢查：

- forward 與 rollback migration 檔是否存在。
- `supabase-schema.sql` 是否同步包含新表。
- 主要 constraints、indexes、RLS 與資料治理註解是否保留。
- rollback 是否只 drop v1.1.0 新增資料表。

正式套用 production 前，仍需在 disposable 或 staging Postgres 跑一次 forward / rollback。檢查腳本只能避免漏檔與明顯 schema drift，不能取代資料庫實際演練。

## 後續規則

- 不修改已套用到 production 的 migration；只能新增下一個 migration。
- 會刪資料、改欄位型別、搬移 PII 或新增敏感表時，要先寫風險說明與 rollback strategy。
- 新增資料表或敏感欄位時，文件要說明保留期限、刪除流程、可讀寫角色、right-to-erasure 與是否需要 redaction。
