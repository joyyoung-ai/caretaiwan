-- 看護助手 CareTaiwan — Supabase Schema
-- 在 Supabase SQL Editor 執行

-- 雲端備份（Phase 2 LINE 登入後）
create table if not exists cloud_backups (
  line_user_id text primary key,
  display_name text,
  data jsonb not null,
  updated_at timestamptz default now()
);
alter table cloud_backups enable row level security;

-- 老人 ↔ 家屬配對
-- 安全設計：
--   pairing_code 24 小時過期（expires_at）
--   一旦 paired_line_user_id 已填，不可被覆蓋（防綁架）
create table if not exists elder_pairings (
  elder_id text primary key,
  pairing_code text unique not null,
  paired_line_user_id text,
  paired_at timestamptz,
  owner_line_user_id text not null,
  display_name text,
  expires_at timestamptz,
  created_at timestamptz default now()
);
alter table elder_pairings enable row level security;
create index if not exists idx_elder_pairings_code on elder_pairings (pairing_code);
create index if not exists idx_elder_pairings_owner on elder_pairings (owner_line_user_id);
-- post-flip 後 /api/family/paired 看護端走這條 query
create index if not exists idx_elder_pairings_paired on elder_pairings (paired_line_user_id);

-- 既存資料補欄位（正向 migration）
alter table elder_pairings add column if not exists expires_at timestamptz;

-- 家族 LINE 群組推播（台灣家庭多成員場景）
--   notify_group_id     = 已綁定的群組 ID（null 表示未綁）
--   notify_group_bound_at = 綁定時間
--   notify_group_photo  = 群組推播是否包含照片（預設 true，user 可關）
--   group_pairing_code  = 一次性配對碼，給家屬在群組裡輸入
--   group_pairing_expires_at = 群組配對碼過期時間（24h）
alter table elder_pairings add column if not exists notify_group_id text;
alter table elder_pairings add column if not exists notify_group_bound_at timestamptz;
alter table elder_pairings add column if not exists notify_group_photo boolean default true;
alter table elder_pairings add column if not exists group_pairing_code text;
alter table elder_pairings add column if not exists group_pairing_expires_at timestamptz;
create index if not exists idx_elder_pairings_group_code on elder_pairings (group_pairing_code);

-- 推播紀錄（除錯用）— 不存原文，只記錄類型 + 狀態（隱私）
create table if not exists push_logs (
  id bigserial primary key,
  elder_id text,
  line_user_id text,
  record_type text,
  status text,
  created_at timestamptz default now()
);
alter table push_logs enable row level security;
create index if not exists idx_push_logs_elder on push_logs (elder_id);

-- push_logs.record_type 欄位（給之前的 schema 補上）
alter table push_logs add column if not exists record_type text;
-- 註:舊的 message 欄位已在更早 migration 移除,此處不再清理

-- 稽核日誌：誰、何時、做了什麼動作（不存內容）
-- 保留 90 天供合規查詢與資安事件回溯
create table if not exists audit_logs (
  id bigserial primary key,
  actor_line_user_id text,           -- 行為人（可為 null：webhook 來源等）
  actor_ip text,                     -- 來源 IP（截掉最後一段做匿名）
  action text not null,              -- 動作代號（CLOUD_UPLOAD / PAIRING_CREATE / PAIRING_BIND / DATA_DELETE 等）
  resource_type text,                -- elder / pairing / cloud_backup / push
  resource_id text,                  -- 對應 ID
  status text not null,              -- ok / fail / forbidden
  metadata jsonb,                    -- 結構化補充欄位（不放 PII）
  created_at timestamptz default now()
);
alter table audit_logs enable row level security;
create index if not exists idx_audit_logs_actor on audit_logs (actor_line_user_id);
create index if not exists idx_audit_logs_action on audit_logs (action);
create index if not exists idx_audit_logs_created on audit_logs (created_at desc);

-- 90 天保留：可在 Supabase 設 cron job 跑這段
-- delete from audit_logs where created_at < now() - interval '90 days';

-- 記帳本（看護記、家屬查、可核帳）
-- 設計：
--   每筆綁定一張老人卡（elder_id）
--   actor_line_user_id = 看護（記帳的人）
--   owner_line_user_id = 家屬（資料擁有者，查帳/核帳的人）
--   verify_status: pending / confirmed / disputed
--   verify_note: 家屬標 disputed 時的備註原因
--   photo_path: Supabase Storage record-photos bucket 的 path (跟記錄共用 bucket)
create table if not exists expense_logs (
  id bigserial primary key,
  elder_id text not null,
  actor_line_user_id text not null,   -- 看護
  owner_line_user_id text not null,   -- 家屬（雲端推播目標 + 核帳人）
  item_name text not null,            -- 品項名稱
  amount numeric(10,2) not null,      -- 金額（最多 8 位整數 + 2 位小數）
  category text not null,             -- med / supply / food / medical / other
  note text,                          -- 備註（可選）
  photo_path text,                    -- Storage path (private bucket)
  verify_status text not null default 'pending',  -- pending / confirmed / disputed
  verify_note text,                   -- 家屬核帳時的說明（disputed 必填）
  verified_at timestamptz,
  created_at timestamptz default now()
);
alter table expense_logs enable row level security;
create index if not exists idx_expense_elder on expense_logs (elder_id);
create index if not exists idx_expense_owner on expense_logs (owner_line_user_id);
create index if not exists idx_expense_actor on expense_logs (actor_line_user_id);
create index if not exists idx_expense_created on expense_logs (created_at desc);
-- 篩 pending 的會比較頻繁（家屬看待核帳）
create index if not exists idx_expense_status on expense_logs (verify_status);

-- 照片擁有權 metadata（v55, codex audit HIGH-2 修補）
-- 防止「已配對使用者請 server 簽任意 record-photos path」越權
-- 每張照片上傳時 insert 一列 → push/expense-push 簽 signed URL 前查驗
--   path                 = Supabase Storage object path（即 record-photos/{uuid}.{ext}）
--   uploader_line_user_id = 上傳當下的看護（盜用者非他本人，verify 即失敗）
--   elder_id              = 上傳時所屬醫護卡（防跨卡借用 path）
--   purpose               = 'record' or 'expense'（防上下文錯置）
create table if not exists record_photos (
  path text primary key,
  uploader_line_user_id text not null,
  elder_id text not null,
  purpose text not null check (purpose in ('record', 'expense')),
  created_at timestamptz default now()
);
alter table record_photos enable row level security;
create index if not exists idx_record_photos_uploader on record_photos (uploader_line_user_id);
create index if not exists idx_record_photos_elder on record_photos (elder_id);

-- v55 backfill（一次性、idempotent）：把已存在的 expense_logs.photo_path 補進 metadata
-- 否則 v55 上線後舊收據照片會被當「無 metadata」而無法在 LINE 推播裡顯示
insert into record_photos (path, uploader_line_user_id, elder_id, purpose)
select photo_path, actor_line_user_id, elder_id, 'expense'
from expense_logs
where photo_path is not null
on conflict (path) do nothing;

-- v1.1.0 照護行程。資料保留期限跟照護紀錄一致；使用者刪除請求要涵蓋 live database、備份與 audit metadata。
create table if not exists care_events (
  id bigserial primary key,
  elder_id text not null,
  owner_line_user_id text not null,
  created_by_line_user_id text not null,
  updated_by_line_user_id text,
  type text not null,
  is_medical_related boolean not null default false,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  note text,
  remind_at timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_events_type_check check (type in ('medical_appointment', 'rehab', 'medication_pickup', 'exam', 'care_visit', 'other')),
  constraint care_events_status_check check (status in ('scheduled', 'done', 'cancelled')),
  constraint care_events_time_range_check check (ends_at is null or ends_at > starts_at),
  constraint care_events_title_not_blank_check check (length(btrim(title)) > 0),
  constraint care_events_medical_flag_check check (
    is_medical_related = (type in ('medical_appointment', 'rehab', 'medication_pickup', 'exam'))
  )
);
alter table care_events enable row level security;
create index if not exists idx_care_events_elder_starts on care_events (elder_id, starts_at);
create index if not exists idx_care_events_owner on care_events (owner_line_user_id);
create index if not exists idx_care_events_status on care_events (status);

comment on table care_events is '家屬與看護共同管理已配對長者的照護行程。資料保留期限跟照護紀錄一致；使用者刪除請求要涵蓋 live database、備份與 audit metadata。';
comment on column care_events.owner_line_user_id is '家屬 LINE user ID，屬敏感識別資料，不得直接輸出到公開 response、client log 或 push log。';
comment on column care_events.created_by_line_user_id is '建立者 LINE user ID，屬敏感識別資料。';
comment on column care_events.updated_by_line_user_id is '最後更新者 LINE user ID，屬敏感識別資料。';
comment on column care_events.note is '自由文字可能含健康或照護細節，audit metadata 與推播記錄不得保存原文。';
comment on column care_events.remind_at is 'v1.1.0 只保留欄位；LINE reminder runtime 尚未啟用。';
comment on column care_events.is_medical_related is '醫療相關行程只作一般日程提醒，非醫療指示。';

-- v1.1.0 看護請假紀錄。資料保留期限跟照護紀錄一致；不得用於薪資、扣款、排班或勞資爭議判定。
create table if not exists caregiver_leave_requests (
  id bigserial primary key,
  elder_id text not null,
  caregiver_line_user_id text not null,
  owner_line_user_id text not null,
  reason text not null,
  note text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending',
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint caregiver_leave_reason_check check (reason in ('personal', 'health', 'family', 'documents', 'other')),
  constraint caregiver_leave_status_check check (status in ('pending', 'acknowledged', 'cancelled')),
  constraint caregiver_leave_time_range_check check (ends_at > starts_at)
);
alter table caregiver_leave_requests enable row level security;
create index if not exists idx_caregiver_leave_elder_starts on caregiver_leave_requests (elder_id, starts_at);
create index if not exists idx_caregiver_leave_caregiver on caregiver_leave_requests (caregiver_line_user_id);
create index if not exists idx_caregiver_leave_owner on caregiver_leave_requests (owner_line_user_id);
create index if not exists idx_caregiver_leave_status on caregiver_leave_requests (status);

comment on table caregiver_leave_requests is '看護提出請假紀錄，家屬查看並確認。資料保留期限跟照護紀錄一致；使用者刪除請求要涵蓋 live database、備份與 audit metadata；不得用於薪資、扣款、排班或勞資爭議判定。';
comment on column caregiver_leave_requests.caregiver_line_user_id is '看護 LINE user ID，屬敏感識別資料，不得直接輸出到公開 response、client log 或 push log。';
comment on column caregiver_leave_requests.owner_line_user_id is '家屬 LINE user ID，屬敏感識別資料。';
comment on column caregiver_leave_requests.note is '自由文字可能含個人或健康細節，audit metadata 與推播記錄不得保存原文。';
comment on column caregiver_leave_requests.status is '家屬只能確認看護提出的紀錄；此欄位不得延伸為考勤、薪資或排班判定。';
