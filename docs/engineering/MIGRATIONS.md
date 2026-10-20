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

2026-07-06 已用本機一次性 Docker Postgres `postgres:16-alpine` 演練 v1.1.0 migration：

- forward：`202607060001_create_care_calendar_tables.sql` 套用成功。
- 驗證：`care_events` 與 `caregiver_leave_requests` 兩張表存在，且 `relrowsecurity = true`。
- rollback：`202607060001_create_care_calendar_tables.down.sql` 套用成功。
- rollback 驗證：兩張 v1.1.0 新表剩餘數量為 0。

production 套用前，若已建立正式 staging DB，仍建議用 staging DB 再跑一次同樣流程。檢查腳本只能避免漏檔與明顯 schema drift，不能取代資料庫實際演練。

2026-10-20 開源準備時再次使用一次性 Postgres 16 容器驗證。容器沒有對外連線、沒有掛載正式資料，也沒有開放主機連接埠：

- 完整初始化後先移除 v1.1.0 兩張表，再套用 forward，確保真正走過建表路徑。
- 確認兩張表都啟用資料列層級安全性。
- 執行 rollback 後確認兩張表已移除，原有其他資料表清單完全相同。
- 重新套用 forward 成功，最後移除測試容器。

本輪沒有修改任何 schema 或 migration。

## 後續規則

- 不修改已套用到 production 的 migration；只能新增下一個 migration。
- 會刪資料、改欄位型別、搬移 PII 或新增敏感表時，要先寫風險說明與 rollback strategy。
- 新增資料表或敏感欄位時，文件要說明保留期限、刪除流程、可讀寫角色、right-to-erasure 與是否需要 redaction。
