# Production Runbook

日期：2026-07-01

狀態：Draft。Not sufficient for production operation.

這份文件是正式 VM / Docker 維運 runbook 的骨架。內容還沒完整到可以直接承接 production，但欄位先固定下來，之後部署前逐項補齊。正式環境若已處理真實個資，不得只依這份草稿操作。

## Required Before Production

正式上線前至少要補齊：

- 實際部署指令與 image tag 管理規則。
- 實際 rollback 指令與資料庫 migration 回退判斷。
- 實際 log 路徑、查詢方式與保存天數。
- 實際 database / storage backup 指令。
- restore drill 指令與演練紀錄格式。
- 依 ADR-0010 完成 data layer 改造，讓 server-side app 直接連 VM 自管 Postgres。Direct Postgres adapter、health route pilot、照護行程、看護請假、audit、pairing、expense 與 photo metadata helper 已先搬移；photo file storage、cloud backup 與 data-retention cron 仍需逐批從 Supabase client 搬移或另案決定，production 前不得帶著這個落差上線。
- incident contact、法務 / 隱私窗口與 escalation 時限。暫定對外窗口為 `services@joyyoung.com.tw`。
- token rotation owner 與每種 secret 的輪替週期。

## Actual Production Values

正式環境選定後，把這一節改成實際值。不要長期保留 TBD 後就上 production。

- App service name：TBD。
- Docker compose file path：TBD。
- Database service name：TBD。若採 Docker Compose，以下範例假設為 `postgres`。
- Database name：TBD。以下範例假設為 `caretaiwan`。
- Database app role：TBD。不得使用 superuser 作為 app runtime role。
- Database migration role：TBD。只能由維運人員或 CI deploy job 使用。
- Reverse proxy：TBD。
- App log command：TBD。
- Proxy access log：TBD。
- Proxy error log：TBD。
- Backup command：TBD。
- Restore command：TBD。
- Backup root：TBD。建議放在 VM 上受限目錄，例如 `/var/backups/caretaiwan`，並同步到加密離站備份。
- Cron scheduler：TBD。
- Incident contact：`services@joyyoung.com.tw`。
- Legal / privacy contact：`services@joyyoung.com.tw` 作為暫定收件窗口，正式責任人待指定。
- Token rotation owner：TBD。

## Database Migration

正式資料庫採 VM 自管 Postgres，但目前 app data layer 仍有部分 helper 使用 Supabase client。ADR-0010 已決定重構 `src/lib/supabase-server.ts` 與相關 data helpers，改為 server-side 直接連 self-managed Postgres。VM 內提供 Supabase-compatible API / PostgREST 不作為正式主路線。

不論採哪條路，migration SQL 先以 Postgres 為基準。以 Docker Compose 為例，套用 v1.1.0 migration 前先在 staging 或 disposable DB 執行：

```bash
cd /srv/caretaiwan/repo
docker compose exec -T postgres psql -U caretaiwan_migrator -d caretaiwan -v ON_ERROR_STOP=1 < supabase/migrations/202607060001_create_care_calendar_tables.sql
```

驗證：

```bash
docker compose exec -T postgres psql -U caretaiwan_migrator -d caretaiwan -c "\d+ care_events"
docker compose exec -T postgres psql -U caretaiwan_migrator -d caretaiwan -c "\d+ caregiver_leave_requests"
npm run migrations:check
```

Rollback 演練：

```bash
docker compose exec -T postgres psql -U caretaiwan_migrator -d caretaiwan -v ON_ERROR_STOP=1 < supabase/migrations/202607060001_create_care_calendar_tables.down.sql
```

Rollback 前應先停用相關 API route / UI 入口。已進 production 且有真實資料後，不得把 rollback 當成一般清資料工具；要先確認資料匯出、法務保留與刪除請求狀態。

## Deploy

- 確認 image tag。
- 確認 `.env.production` 來源與異動。
- 執行 `docker compose up -d` 或正式部署腳本。
- 記錄部署時間、操作者、image tag、commit SHA。

## Rollback

- 保留上一版 image tag。
- 回滾前先確認 migration 是否可回退。
- 照護行程 / 看護請假 migration 已建立於 `supabase/migrations/202607060001_create_care_calendar_tables.sql`。回滾前應先停用相關 API route / UI 入口，再執行 `supabase/migrations/202607060001_create_care_calendar_tables.down.sql`，不得影響既有 `elder_pairings`、照護紀錄、照片、備份或核帳資料。
- 回滾後檢查 health check、LINE webhook、登入與配對流程。

## Health Check

- App 首頁可正常回應。
- `/api/health` 在 `DATABASE_URL` 設定完成後可用 direct Postgres 執行 `select 1`，失敗時只回粗略 `database_error`，不得輸出 DB host、username、raw SQL 或 driver error。
- `/api/line/webhook` 可通過 LINE Verify。
- 登入 callback 正常。
- 產生配對碼正常。
- family push 測試不使用真實個資。

## Log Locations

正式環境前要把下列位置改成實際值：

- App container log：`docker compose logs app` 或實際 service name。
- Reverse proxy access / error log：例如 `/var/log/nginx/access.log`、`/var/log/nginx/error.log`，或 Caddy / Traefik / 企業閘道的實際路徑。
- App audit log：資料庫 `audit_logs` 表，需定義保存天數與查閱權限。
- Cron log：systemd timer、host cron、container scheduler 或外部 scheduler 的實際 log 位置。
- Backup job log：backup script stdout / stderr、systemd journal、CI job log 或備份服務 dashboard。
- System auth log：SSH / sudo / bastion / VPN 登入紀錄的實際查詢方式。

所有 log 預設不得保留未遮蔽 PII。保存天數需由維運與法務確認；在正式政策完成前，建議先以 app / proxy log 90 天、security / audit log 180 天作為暫定上限，之後依合約或法規調整。

## Backup

- Database backup 使用 `pg_dump --format=custom`，保留 schema 與資料，避免把 secret 檔放進同一份備份。
- Photo / object storage backup 需與 database backup 同批次記錄，至少包含時間戳、來源 path、目的地與 hash。
- `.env.production`、LINE token、service-role key、cron secret、photo signing secret 不進一般備份；secret 備份需另走受控金鑰庫或離線流程。
- 備份檔落地後要產生 SHA-256，並加密後再同步到離站位置。
- 至少一份備份離開原 VM。

Database backup 範例：

```bash
sudo install -d -m 0700 -o root -g root /var/backups/caretaiwan/db
backup_file="/var/backups/caretaiwan/db/caretaiwan-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T postgres pg_dump -U caretaiwan_backup -d caretaiwan --format=custom --no-owner --no-acl > "$backup_file"
sha256sum "$backup_file" > "$backup_file.sha256"
```

Photo storage backup 範例：

```bash
sudo install -d -m 0700 -o root -g root /var/backups/caretaiwan/photo-storage
rsync -a --delete /srv/caretaiwan/docker/photo-storage/ /var/backups/caretaiwan/photo-storage/current/
tar -C /var/backups/caretaiwan/photo-storage -czf "/var/backups/caretaiwan/photo-storage-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" current
sha256sum /var/backups/caretaiwan/photo-storage-*.tar.gz > /var/backups/caretaiwan/photo-storage.sha256
```

正式環境要把上述路徑、service name、DB role 與保留天數換成實際值。

## Restore Drill

- 每月至少在隔離 VM 或 staging network 演練一次 restore。不得把 production 個資還原到個人本機。
- Restore drill 要記錄備份檔名、hash 驗證結果、操作者、開始 / 結束時間、還原目標、驗證結果與清除時間。
- Restore drill 結束後清除測試資料，並確認隔離環境沒有對外 webhook、LINE token 或 production secret。

Restore drill 範例：

```bash
sha256sum -c /var/backups/caretaiwan/db/caretaiwan-YYYYMMDDTHHMMSSZ.dump.sha256
docker compose exec -T postgres createdb -U caretaiwan_migrator caretaiwan_restore_drill
docker compose exec -T postgres pg_restore -U caretaiwan_migrator -d caretaiwan_restore_drill --clean --if-exists --no-owner --no-acl < /var/backups/caretaiwan/db/caretaiwan-YYYYMMDDTHHMMSSZ.dump
docker compose exec -T postgres psql -U caretaiwan_migrator -d caretaiwan_restore_drill -c "select count(*) from elder_pairings;"
docker compose exec -T postgres dropdb -U caretaiwan_migrator caretaiwan_restore_drill
```

Restore drill 紀錄格式：

```text
日期：
操作者：
備份檔：
SHA-256 驗證：
還原目標：
驗證查詢：
發現問題：
清除時間：
```

## Token Rotation

需要輪替：

- `AUTH_SECRET`
- `DATABASE_URL` 對應的 DB app role 密碼。
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINE_BOT_CHANNEL_SECRET`
- `LINE_BOT_CHANNEL_ACCESS_TOKEN`
- `CRON_SECRET`
- `LOCAL_PHOTO_SIGNING_SECRET`

輪替後要確認登入、webhook、推播、cron、照片 signed URL 是否正常。

## LINE Webhook Verification

- LINE Developers Console Verify 成功。
- app log 沒有 signature error。
- Auto-reply messages 關閉。
- webhook URL 指向正式 VM HTTPS 網域。

## Cron Verification

- cron secret 正確。
- cron response 不輸出完整 LINE user ID。
- 失敗時有 log，但不含未遮蔽 PII。
- v1.1.0 照護行程的 `remind_at` 不應由 cron 或 LINE push 處理；v1.2.0 reminder runtime 已建立 OpenSpec change，實作前需補排程、claim、重試、失敗紀錄、dry-run、手動停用與使用者提示 runbook。
- v1.2.0 reminder 已確認第一版支援看護、家屬與已綁定 LINE 群組三種收件者，但必須由使用者明確選擇，不預設全發。群組提醒需二次確認。
- v1.2.0 reminder retry 由系統參數控制，建議預設 `REMINDER_MAX_ATTEMPTS=3`、`REMINDER_RETRY_DELAY_MINUTES=10`、`REMINDER_CLAIM_TTL_MINUTES=5`。
- 使用者可見失敗原因只能顯示粗分類，例如通知設定或封鎖、LINE 暫時無法送出、系統設定尚未完成、提醒逾時或未知原因。

## User Data Deletion Request

- live database / storage 執行刪除。
- audit log 記錄刪除請求與處理狀態。
- 照護行程與看護請假資料保留期限跟照護紀錄一致，刪除請求要涵蓋 live database、備份與 audit metadata。
- 歷史備份不直接拆包修改；依保留期到期覆蓋。
- 若法律或合約要求不同做法，以正式法務文件為準。

## Incident Response Entry Point

先看 [../security/SECURITY.md](../security/SECURITY.md)。

重大事件先做：

1. 停止受影響 endpoint 或 token。
2. 輪替相關 secret。
3. 保留必要 log 並遮蔽 PII。
4. 確認受影響資料範圍。
5. 通知維護、法務與隱私窗口。
