begin;

-- Rollback 前應先停用照護行程 / 看護請假 API route 與 UI 入口。
-- 本 rollback 只移除 v1.1.0 新增資料表，不得影響 elder_pairings、cloud_backups、expense_logs、record_photos 或 audit_logs。
drop table if exists caregiver_leave_requests;
drop table if exists care_events;

commit;
