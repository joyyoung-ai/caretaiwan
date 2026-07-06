# Production Readiness Checklist

日期：2026-07-03

這份清單整理 CareTaiwan 進入試辦或正式導入前要補齊的基礎工作。它不是部署指令；實際操作仍以 [RUNBOOK.md](./RUNBOOK.md) 和 [DEPLOY.md](./DEPLOY.md) 為準。

## 1. Release and Repository Controls

- [x] 建立正式 release 流程：版本號、tag、changelog、rollback note。
- [ ] 設定 branch protection，要求 PR 通過 CI 才能合併。
- [ ] 確認 GitHub organization、team、CODEOWNERS 與 maintainer 權限。
- [ ] 確認 GitHub private vulnerability reporting 是否啟用。
- [x] 建立 production image 建置規則；測試失敗不得產生 production image。

## 2. Deployment Environment

- [x] 選定正式環境：VM / Docker app 搭配 VM 自管 Postgres。
- [ ] 補實際 app service name、compose path、reverse proxy、domain、TLS、log path。
- [ ] public network 只開反向代理與必要 app port。
- [ ] database、storage、Redis 或等效內部服務不得開 public port。
- [ ] SSH / admin access 走 VPN、bastion、固定 IP allowlist 或等效控管。
- [ ] `PUBLIC_APP_URL` 與 `PRODUCTION_ALLOWED_HOSTS` 設為正式網域，不沿用 legacy preview host。

## 3. Data and Migration

- [x] 建立 production migration series，不再只依賴 `supabase-schema.sql`。
- [x] 每個新增資料表都要有 rollback strategy、保留期限、刪除流程、可讀寫角色與 right-to-erasure 說明。
- [ ] 決定 Supabase RLS、scoped JWT、database RPC 或 application-level checks 的長期路線。
- [x] 決定 app data layer 依 ADR-0010 重構為 server-side 直接連 VM 自管 Postgres。
- [ ] migration 先套用到 disposable project 或 staging database，再進 production。
- [ ] 建立資料匯出、restore drill 與測試資料清除流程。

## 4. Secrets and Token Rotation

- [ ] 指定 `AUTH_SECRET`、`DATABASE_URL` 對應 DB role、LINE secrets、`CRON_SECRET`、`LOCAL_PHOTO_SIGNING_SECRET` 的 owner。
- [ ] 定義每種 secret 的輪替週期與緊急輪替流程。
- [ ] 確認 DB password、Bot access token、cron secret、photo signing secret 不會進 client bundle、log 或文件。
- [ ] 建立 token rotation 後的驗證清單：登入、webhook、推播、cron、照片 signed URL。

## 5. Privacy, Legal, and Data Residency

- [x] `/privacy`、`/terms`、ConsentModal 切換為中揚資訊股份有限公司版本。
- [x] 定義 Data Controller、Data Processor、第三方服務、資料保留、刪除權、備份處理與聯絡窗口。
- [ ] 決定資料庫、檔案儲存與備份所在區域；若使用境外服務，要完成風險評估與使用者告知。
- [ ] 法律專業審閱隱私權政策與服務條款。
- [ ] 明確揭露 LINE 服務邊界與群組推播風險。

## 6. Operations and Incident Response

- [ ] 補齊實際部署、rollback、health check、backup、restore、cron、log 查詢指令。
- [ ] 定義 app / proxy log、security / audit log、backup job log 的保存天數與查閱權限。
- [ ] 建立資安事件應變流程：停 endpoint、輪替 token、保存 log、確認影響範圍、通知窗口。
- [ ] 使用者刪除請求要涵蓋 live database / storage、audit log、LINE push 記錄與歷史備份處理。
- [ ] 安排第三方滲透測試或至少獨立資安 review。

## 7. Product Boundary Review

- [ ] 所有提醒文案不得提供診斷、分流、治療、劑量或急迫性判斷。
- [ ] 行事曆與請假功能不得變成排班、薪資、扣款或勞資爭議判定。
- [ ] 家屬端功能不得把看護端變成監控工具。
- [ ] 多家屬、機構角色、醫院串接、HL7 / FHIR 或 EMR / HIS 需求必須另開 ADR / OpenSpec change。

## 8. Verification Gate

正式部署前至少執行：

```bash
npm run audit
npm run lint
npm run docs:check
npm run test
npm run build
npm run test:smoke
npm run test:e2e
```

另需手動檢查：

- LINE Login。
- pairing。
- photo upload。
- expense creation。
- family expense review。
- LINE webhook mock events。
- data-retention cron dry-run。
- backup / restore drill。
