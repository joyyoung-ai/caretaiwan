# Changelog

本文件記錄中揚資訊接手後的版本變更。原作者階段的完整歷史仍以 git history、README 與 [../security/SECURITY_AUDIT.md](../security/SECURITY_AUDIT.md) 為準。

格式參考 Keep a Changelog，但不硬套。每次 release 要讓使用者與維護者看得懂實際影響。

## Unreleased

### Added

- `docs/engineering/AI_AGENT_WORKFLOW.md`：說明 OpenSpec、Superpowers 與 Codex 的文件化協作流程。
- `docs/governance/DECISIONS.md` 新增 ADR-0008，記錄短期保留 CareTaiwan 作為開源專案名稱。
- 初始化 OpenSpec 設定與 Codex OpenSpec skills；目前尚未建立 active change proposal。
- 記錄 Superpowers 僅作為維護者本機或 Codex plugin 工作流，不作為 CareTaiwan runtime dependency。

### Changed

- `AGENTS.md` 增加 OpenSpec / Superpowers 使用邊界，避免把協作工具當成 runtime dependency。
- `docs/README.md` 在 Engineering 區塊加入 AI agent workflow 文件連結。

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
