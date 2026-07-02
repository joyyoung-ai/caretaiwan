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
- incident contact、法務 / 隱私窗口與 escalation 時限。暫定對外窗口為 `services@joyyoung.com.tw`。
- token rotation owner 與每種 secret 的輪替週期。

## Actual Production Values

正式環境選定後，把這一節改成實際值。不要長期保留 TBD 後就上 production。

- App service name：TBD。
- Docker compose file path：TBD。
- Reverse proxy：TBD。
- App log command：TBD。
- Proxy access log：TBD。
- Proxy error log：TBD。
- Backup command：TBD。
- Restore command：TBD。
- Cron scheduler：TBD。
- Incident contact：`services@joyyoung.com.tw`。
- Legal / privacy contact：`services@joyyoung.com.tw` 作為暫定收件窗口，正式責任人待指定。
- Token rotation owner：TBD。

## Deploy

- 確認 image tag。
- 確認 `.env.production` 來源與異動。
- 執行 `docker compose up -d` 或正式部署腳本。
- 記錄部署時間、操作者、image tag、commit SHA。

## Rollback

- 保留上一版 image tag。
- 回滾前先確認 migration 是否可回退。
- 回滾後檢查 health check、LINE webhook、登入與配對流程。

## Health Check

- App 首頁可正常回應。
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

- database backup。
- photo / object storage backup。
- env / secret 不進一般備份。
- 備份加密。
- 至少一份備份離開原 VM。

## Restore Drill

- 定期在隔離環境演練 restore。
- 不得把 production 個資還原到個人本機。
- restore drill 結束後清除測試資料。

## Token Rotation

需要輪替：

- `AUTH_SECRET`
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

## User Data Deletion Request

- live database / storage 執行刪除。
- audit log 記錄刪除請求與處理狀態。
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
