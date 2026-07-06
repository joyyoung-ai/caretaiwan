## Context

CareTaiwan 已完成 direct Postgres foundation，並決定照片正式採 VM local storage。這些決策降低了對 Supabase runtime 的依賴，但也讓公開 repo 前的責任更清楚：外部開發者會看到自行部署、Postgres、local storage、LINE integration、reminder failure handling 和醫療相關提醒文案的邊界。

公開開源不是單純改 GitHub visibility。公開後，歷史 commit、issue、template、docs、sample data、screenshots 和 deployment notes 都會被外部檢視。這個 change 先建立 guardrails，避免公開前漏掉安全與治理工作。

## Goals / Non-Goals

**Goals:**

- 建立 repository 公開前的 secret / PII hygiene gate。
- 讓 public README 與 quick start 能在沒有 production service 的情況下被外部開發者理解。
- 明確揭露非醫療、非保證送達、非正式託管服務的限制。
- 建立 vulnerability reporting、issue template 與 redaction 規則。
- 建立 repo visibility checklist，讓公開動作需要 maintainer review。

**Non-Goals:**

- 不在這個 change 直接公開 repository。
- 不引入新的 hosting provider、VM、S3、CI vendor 或 SaaS decision。
- 不要求第一版公開 release 支援完整 production deployment。
- 不處理商標、公司法務、隱私權政策或服務條款的最終法律審查；這些需要 owner 另行決策。
- 不把 demo mode 連到真實 LINE 或真實照護資料。

## Decisions

### 1. Treat public visibility as a release gate, not a code change

repository visibility 變更必須等 readiness checklist 全部完成後才做。技術 PR 可以補文件、template 與檢查腳本，但不得在同一批順手切 public。

### 2. Scan both current tree and git history

只掃目前檔案不夠，因為公開 repo 會暴露歷史 commit。公開前至少需要：

- current tree scan：`.env*`、source、docs、fixtures、screenshots、logs。
- git history scan：token、private key、LINE IDs、database URLs、sample photos、真實姓名或電話。
- 若找到 secret：先 rotate / revoke，再決定 history rewrite 或保留 private archive 的處理方式。

這裡的重點是降低風險，不是假裝刪掉檔案就代表 secret 沒外洩。

### 3. Keep public quick start service-light

公開 quick start 應該優先支援 local developer flow：local Postgres、mock LINE / disabled LINE、VM local storage path 指向本機資料夾。不要要求外部 contributor 先申請 LINE channel 或 production VM 才能跑基本測試。

### 4. Make care and medical boundaries explicit

文件與範例要避免讓人以為 CareTaiwan 提供醫療指示。提醒、行程、看護協作與照片紀錄都應被描述為照護管理工具，不是診斷、治療、分流、急迫性判斷或送達保證。

醫療相關提醒文案若出現在 public docs，應使用自然繁體中文，避免法律免責堆疊或像系統公告。

### 5. Public issues must default to redacted evidence

issue templates 要要求使用者移除：

- 長者、家屬、看護姓名與聯絡資訊。
- LINE user ID、group ID、channel secret、access token。
- 照片 URL、signed URL、local storage path 中可識別資訊。
- 完整 audit logs、raw provider errors、database URLs。

需要安全通報時，文件應引導使用 private vulnerability channel，不要在 public issue 貼細節。

### 6. Production limitations stay visible after open-source release

第一版公開文件必須清楚說明：

- VM local photo storage 適合單機部署；多台 app server 前需 shared storage 或重新選型。
- local photo storage 需要 persistent volume、backup / restore drill、容量監控與權限設定。
- Postgres migration 需要 staging / disposable database 驗證。
- LINE reminder / notification 不能保證送達，失敗原因只能粗略揭露。
- 開發階段功能可能尚未確定，不應被描述成穩定 API。

## Risks / Trade-offs

- 完整 git history scan 與 secret rotation 會花時間，但公開後再補救成本更高。
- README 若太保守，外部 contributor 可能覺得門檻高；但照護資料與醫療邊界比行銷式簡化更重要。
- public demo 若完全 mock，無法代表 LINE production 行為；這是可接受 trade-off，因為公開 contributor flow 不應依賴真實 LINE credentials。
- VM local storage 文件若太詳盡，可能被誤解為 production ready；文件要同時提供設定方式與限制。
- security contact 若尚未決定，公開會被阻擋；這是 owner 決策，不應由工程假設。

## Implementation Plan

1. 補 OpenSpec，鎖定 public open-source readiness scope。
2. 盤點 repository 中既有 README、docs、templates、license、security 與 CI 狀態。
3. 執行 current tree 與 git history hygiene scan，列出需要 rotate / redact / rewrite 的項目。
4. 補 public README / quick start，讓 local dev 不依賴 production LINE 或 VM。
5. 補 governance files：license、security、contributing、code of conduct、issue templates。
6. 補 production limitation docs，明列 VM local storage、Postgres、LINE、提醒與非醫療邊界。
7. 補 release / visibility checklist，要求 maintainer review 後才可改 public。
8. 執行 docs、lint、test、build、smoke 與必要 scan，確認公開前 gate 可重複執行。

Rollback 原則：

- 文件與 template 變更可用一般 revert 回退。
- 若 secret scan 發現已提交 secret，不能只 revert；必須 rotate / revoke。
- repository 一旦 public，不能假設 fork / cache 會消失；若誤公開，應立即 private、rotate secrets、公告內部 incident note。
