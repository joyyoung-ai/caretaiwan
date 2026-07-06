# Changelog

本文件記錄中揚資訊接手後的版本變更。原作者階段的完整歷史仍以 git history、README 與 [../security/SECURITY_AUDIT.md](../security/SECURITY_AUDIT.md) 為準。

格式參考 Keep a Changelog，但不硬套。每次 release 要讓使用者與維護者看得懂實際影響。

## Unreleased

### Added

- `docs/engineering/AI_AGENT_WORKFLOW.md`：說明 OpenSpec、Superpowers 與 Codex 的文件化協作流程。
- `docs/governance/DECISIONS.md` 新增 ADR-0008，記錄短期保留 CareTaiwan 作為開源專案名稱。
- 新增 route handler regression tests：cloud upload / download / delete ownership、data-retention cron response redaction、photo upload pairing guard、photo signed token route、family paired ownership query、pairing bind / ensure / unbind、group-code / group-photo / group-unbind、pairing status owner query、expense list photo signed URL metadata gate、expense verify validation。
- 補 route handler 錯誤路徑測試：cloud upload malformed / oversized / DB failure、cloud delete partial DB failure、photo upload invalid bytes / metadata rollback、family paired DB failure、expense list failure、data-retention cron auth / config failure。
- 補 representative cloud disabled / unauthenticated gate tests，並新增 session route response shape 測試，避免回傳 LINE user ID。
- 補齊其餘 route 的 disabled cloud / unauthenticated / DB failure matrix，新增 health route 與 consent route tests。
- 新增 `npm run test:smoke` production HTTP smoke test，啟動 `next start` 後檢查核心頁面、session API 與安全 headers。
- 引入 Playwright，新增 `npm run test:e2e` 瀏覽器級 smoke，覆蓋桌機與 mobile Chromium 的首頁 shell、公開 legal/about 頁與 session API redaction。
- 新增 GitHub Actions CI gate，於 push / pull request 執行 lint、docs check、Vitest、build、production smoke 與 Playwright E2E。
- 新增 `npm run audit` dependency security gate，並以安全升級與 `postcss` override 清除目前 npm audit vulnerabilities。
- 初始化 OpenSpec 設定與 Codex OpenSpec skills。
- 新增 OpenSpec change proposal `v1-0-1-runtime-safety`，用來管理 v1.0.1 第一批 runtime safety 修補；本次只新增 proposal，不包含 runtime code 變更。
- 記錄 Superpowers 僅作為維護者本機或 Codex plugin 工作流，不作為 CareTaiwan runtime dependency。
- 新增 v1.1.0 照護行程 schema draft，涵蓋 `care_events`、`caregiver_leave_requests`、retention 與 rollback notes。
- 新增 v1.1.0 production migration series 與 `npm run migrations:check`，同步建立 forward / rollback SQL 與 idempotent schema 檢查。
- 補 VM 自管 Postgres 的 migration、backup 與 restore drill runbook 模板，並記錄目前 app data layer 仍需依 ADR-0010 重構為 server-side 直接連 Postgres。
- 新增 OpenSpec change `v1-2-0-care-reminders`，先定義 LINE reminder runtime 的排程、claim、retry、失敗狀態、文案與 redaction 邊界，尚未啟用推播 runtime。
- 新增 `docs/governance/RELEASE_PROCESS.md`，定義 release gate、tag、branch protection target 與 production image 規則。
- 將 `/privacy`、`/terms`、ConsentModal 與 about page 對外窗口切換為中揚資訊股份有限公司版本草案，並 bump consent version。
- 新增 ADR-0010，決定 app data layer 逐步重構為 server-side 直接連 VM 自管 Postgres，不以 Supabase-compatible API / PostgREST 作為正式主路線。
- 更新 `v1-2-0-care-reminders` OpenSpec，確認 reminder 第一版支援看護、家屬與已綁定 LINE 群組，retry 由系統參數控制，失敗原因只顯示粗分類，醫療相關文案採自然繁體中文。
- 新增 OpenSpec change `v2-0-0-direct-postgres-data-layer` 與 Superpowers phase 1 實作計畫，先規劃 server-only Postgres adapter 與 health route pilot，尚未開始 runtime migration。
- 新增 direct Postgres data layer foundation：`src/lib/db/*` adapter、public-safe DB error mapping、health route pilot 與相關測試；其他資料 helper 仍保留 Supabase client，後續分批搬移。
- 將照護行程與看護請假 data helpers 改用 direct Postgres adapter，相關 API route 的服務開關也改看 `DATABASE_URL`；pairing、audit、expense、photo metadata、cloud backup 與 data-retention cron 仍待分批搬移。
- 將 audit helper 改用 direct Postgres adapter，保留 fire-and-forget 行為、IP 匿名化與 metadata redaction；pairing、expense、photo metadata、cloud backup 與 data-retention cron 仍待分批搬移。
- 新增照護行程 helper 與 API foundation：已配對家屬 / 看護可建立、查詢、更新與取消行程，並保留 inert `remind_at`。
- 新增看護請假 helper 與 API foundation：看護可建立固定原因加自由文字備註的請假紀錄，家屬可查看並標記已收到。
- 看護端與家屬端首頁新增照護行程 / 請假紀錄最小流程：看護可切換 7 / 30 天行程並送出請假紀錄，家屬可新增、編輯、取消行程並標記請假紀錄已收到。
- 照護行程 UI 保留非醫療與 LINE reminder inactive 文案，提醒 runtime 尚未啟用。
- 請假紀錄文案改用「已收到」語氣，不把流程寫成考勤、審核、薪資或排班工具。

### Changed

- `AGENTS.md` 增加 OpenSpec / Superpowers 使用邊界，避免把協作工具當成 runtime dependency。
- `docs/README.md` 在 Engineering 區塊加入 AI agent workflow 文件連結。
- 確認 v1.0.1 第一批 helper tests 已覆蓋 pairing code TTL、禁止自己配對、origin checks 與 cron security helper；`npm run lint` 目前維持無 warning。
- Production origin allowlist 改為只接受 `PUBLIC_APP_URL` 與 `PRODUCTION_ALLOWED_HOSTS` 明確設定的 host；localhost、preview host 與 Vercel host 不再於 production 自動放行。
- Roadmap 與使用者需求文件更新 v1.1.0 範圍：共同管理行程、請假原因固定選項加自由文字、正式 migration 以 VM 自管 Postgres 路線落地、LINE reminder runtime 延後。

### Security

- 資料保留 cron response 改由 helper 統一輸出去識別化的 `lineUserRef`，warn / delete / dry-run sample 不回傳完整 LINE user ID。
- 資料保留 cron delete stage 明確維持先刪 `cloud_backups`、成功後才刪相關 `elder_pairings`；pairing 刪除失敗時以去識別化 partial failure 回報，不輸出 raw DB error。
- cron bearer token parser 收緊為只接受單一 Bearer token，並保留固定長度 digest 搭配 timing-safe compare 的驗證方式。

## v1.0.0 - 2026-07-01

### Added

- Fork 接手說明。
- 第一版 bug / 改善規劃。
- 第一版系統架構整理。
- 使用者需求整理，包含行事曆與看護請假需求。
- `.env.example` 與 VM production env 範例整理。
- 開源治理文件：Project Vision、Contributing、Roadmap、Decisions、Maintainers、Known Limitations。
- GitHub issue / PR template 草案。
- 正式 VM / Docker 部署參考與供應商中立安全基準。
- Support、Code of Conduct、Testing、Runbook 骨架。
- `npm run docs:check`，用本機 Node 腳本檢查 Markdown 內部連結。
- Security issue template，公開 issue 只作為私下通報入口，不收漏洞細節。

### Changed

- 將分支定位調整為中揚資訊股份有限公司後續維護的開源分支。
- 保留原作者 README 敘事，並補充分支接手邊界。
- README 改為先提供 maintained fork quick start，再進入原作者歷史脈絡。
- `BUGFIX_PLAN.md` 將已修文件問題移到 Resolved，P1 保留仍待修的 runtime / code 風險。
- `RUNBOOK.md` 明確標示為 Draft，並列出 production 前必填的維運項目。
- `AGENTS.md`、README 與 PR template 補上 `npm run docs:check`。
- `SYSTEM_ARCHITECTURE_PLAN.md` 移除已解決的 README 醫療內容殘留待辦，改列 runtime / code 風險。
- `SECURITY.md` 與 `MAINTAINERS.md` 明確標示公開前必須指定 security contact。
- 將部署方向從原作者 Vercel 原型整理為正式 VM / Docker 方向。
- README 清楚區分目前 fork 維護狀態、原上游服務狀態與原作者保留敘事。
- 文件搬入 `docs/` 分類維護，根目錄只保留 GitHub 慣例入口。

### Security

- 文件層明確要求 PII redaction、資料保留、刪除權、備份處理、audit log 與 VM 安全基準。
- 補上 vulnerability reporting、supported versions 與 response target 草案。

### Removed

- 移除 NAS POC 文件，避免與正式 VM 部署方向混淆。

## 原作者階段

原作者在 2026-04 完成原型與資安審計，2026-06 停止原線上服務並開源。此階段的主要敘事保留在 [../../README.md](../../README.md) 與 [../../README.zh-TW.md](../../README.zh-TW.md)。
