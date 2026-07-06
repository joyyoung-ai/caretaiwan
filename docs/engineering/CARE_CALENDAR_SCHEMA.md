# Care Calendar Schema Draft

日期：2026-07-03

這份文件是 v1.1.0 照護行程與看護請假資料模型。正式資料庫已決定採 VM 自管 Postgres；production migration series 已建立於 `supabase/migrations/202607060001_create_care_calendar_tables.sql`，檢查方式見 [MIGRATIONS.md](./MIGRATIONS.md)。production 前仍需在 disposable 或 staging Postgres 實際演練 forward / rollback。

## care_events

用途：家屬與看護共同管理已配對長者的照護行程。

欄位：

- `id bigserial primary key`
- `elder_id text not null`
- `owner_line_user_id text not null`
- `created_by_line_user_id text not null`
- `updated_by_line_user_id text`
- `type text not null check (type in ('medical_appointment', 'rehab', 'medication_pickup', 'exam', 'care_visit', 'other'))`
- `is_medical_related boolean not null default false`
- `title text not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz`
- `location text`
- `note text`
- `remind_at timestamptz`
- `status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled'))`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Index：

- `idx_care_events_elder_starts` on `(elder_id, starts_at)`
- `idx_care_events_owner` on `(owner_line_user_id)`
- `idx_care_events_status` on `(status)`

資料保留：跟照護紀錄一致。使用者刪除請求要涵蓋 live database、備份與 audit metadata。

## caregiver_leave_requests

用途：看護提出請假紀錄，家屬查看並確認。

欄位：

- `id bigserial primary key`
- `elder_id text not null`
- `caregiver_line_user_id text not null`
- `owner_line_user_id text not null`
- `reason text not null check (reason in ('personal', 'health', 'family', 'documents', 'other'))`
- `note text`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `status text not null default 'pending' check (status in ('pending', 'acknowledged', 'cancelled'))`
- `acknowledged_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Index：

- `idx_caregiver_leave_elder_starts` on `(elder_id, starts_at)`
- `idx_caregiver_leave_caregiver` on `(caregiver_line_user_id)`
- `idx_caregiver_leave_owner` on `(owner_line_user_id)`
- `idx_caregiver_leave_status` on `(status)`

資料保留：跟照護紀錄一致。請假資料不得用於薪資、扣款、排班或勞資爭議判定。

## Rollback Notes

Rollback 應先停用相關 API route / UI 入口，再執行 `supabase/migrations/202607060001_create_care_calendar_tables.down.sql` drop 新表。Rollback 不得影響 `elder_pairings`、`cloud_backups`、`expense_logs`、`record_photos` 或既有照護紀錄資料。
