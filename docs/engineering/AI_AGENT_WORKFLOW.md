# AI Agent Workflow

日期：2026-07-02

這份文件說明 CareTaiwan 如何把 OpenSpec、Superpowers 與 Codex 放進同一套協作流程。這是 workflow 文件，不是 runtime dependency 設定。

OpenSpec 已完成 repository 初始化，設定在 `openspec/config.yaml`，Codex skills 位於 `.codex/skills/openspec-*`。Superpowers 仍是維護者本機或 Codex plugin 設定，不是 CareTaiwan runtime dependency。

## Tool Roles

- `AGENTS.md`：repo-level rules。Codex 與其他 AI agent 都要先遵守這裡的規則。
- OpenSpec：用來管理 proposal、design、tasks 與 spec changes。啟用後，需求、範圍、驗收條件與任務拆分應先寫在 OpenSpec change 裡。
- Superpowers：用來協助 AI agent 做需求釐清、計畫、TDD、實作紀律與檢查。它不決定產品範圍，也不取代人類 review。
- Codebase Memory MCP 或其他本機索引工具：只能作為本機搜尋輔助，不是公開 contributor 必備工具。本機路徑與私有指令放在 `AGENTS.local.md`，不要提交。

## Not Runtime Dependencies

OpenSpec 與 Superpowers 不應加入 `package.json`、`package-lock.json` 或任何 CareTaiwan runtime dependency。

OpenSpec 已初始化。未經維護者明確要求，不要重新執行 `openspec init`、不要安裝 runtime dependency，也不要修改 `package.json` 或 `package-lock.json`。Superpowers 的安裝與啟用由維護者在 Codex App / CLI 或本機環境處理。

OpenSpec 初始化後，應先檢查產生的檔案，再決定哪些規格資料可以 commit。規格、proposal、design、tasks 通常可以進 repo；cache、本機設定、私人 note、含本機絕對路徑的內容不應提交。

## Source of Truth Order

遇到衝突時，照下面順序判斷：

1. `AGENTS.md`
2. `docs/governance/PROJECT_VISION.md`
3. `docs/governance/KNOWN_LIMITATIONS.md`
4. `docs/governance/DECISIONS.md`
5. `docs/security/SECURITY.md`
6. `docs/governance/CONTRIBUTING.md`
7. 使用者明確核准的需求、issue 或 roadmap 項目
8. active OpenSpec change
9. Superpowers plan

OpenSpec 與 Superpowers 的一般建議不能覆蓋前面的文件。若工具建議和產品邊界、資安基準或 PR 規則衝突，以本 repo 文件為準。

## When to Open an OpenSpec Change First

以下情境先建立 OpenSpec change，不要直接改 code：

- 新功能。
- schema / migration。
- API ownership、role、auth 或 permission 變更。
- LINE webhook、push、reminder 或群組通知流程。
- PII、照片、備份、audit log、刪除請求。
- 醫療相關文案、回診提醒、照護提醒或免責文字。
- 大型 refactor、架構重整或設計系統導入。
- 部署策略、正式 VM、資料庫策略或 storage 策略變更。

小型 typo、文件連結修正、明確的低風險文件更新，不一定需要 OpenSpec change；仍要遵守 PR 範圍規則。

## Default Workflow

1. Explore：先讀 `PROJECT_VISION.md`、`KNOWN_LIMITATIONS.md`、`DECISIONS.md`、`SECURITY.md` 與相關工程文件。需求不清時先問清楚，不要直接動產品程式碼。
2. Propose：若屬於需要 OpenSpec 的範圍，啟用後用 OpenSpec 建立 proposal、design、tasks 與必要的 spec changes。
3. Human review：人類維護者確認 proposal、風險、驗收條件與不做事項後，才進入實作。
4. Plan：使用 Superpowers 的 planning / TDD discipline，把任務拆成可驗證的小步驟。
5. Implement：按已確認的範圍實作。不要把 feature、bug fix、refactor、documentation、migration 混成同一件事。
6. Verify：依風險執行 `npm run docs:check`、`npm run test`、`npm run lint`、`npm run build`，並補手動檢查項目。
7. Update docs：需要時更新 changelog、roadmap、testing、security、operations 或 ADR。
8. Archive：OpenSpec change 完成並合併後，再依 OpenSpec 流程 archive。不要在尚未合併或尚未確認時提前 archive。

若 OpenSpec slash commands 尚未啟用，文件仍可照同一個流程手動維護 proposal / design / tasks。不要為了使用工具而改動產品範圍。

## Human Review Gate

以下改動必須等人類維護者確認 proposal 後才能實作：

- 會碰到 PII、LINE ID、照片 URL、醫療備註、自由文字 note、備份或 audit metadata。
- 會改 database schema、migration、資料保留期限、刪除流程或 right-to-erasure。
- 會改 LINE webhook、push、reminder、群組推播或家屬端分享流程。
- 會改登入、session、service-role access、ownership check、rate limit 或 origin allowlist。
- 會新增或修改醫療相關提醒與免責文字。
- 會改部署策略、production env、VM / Docker 安全基準或 storage policy。

OpenSpec proposal 不是法務、醫療或資安審查的替代品。它只能把需求、設計與風險寫清楚，不能替專業審查背書。

## v1.0.1 Runtime Safety Example

若要用 OpenSpec 補管 v1.0.1 第一批 runtime safety 工作，可使用以下 change id：

```text
v1-0-1-runtime-safety
```

範圍限於：

- data retention cron PII redaction。
- cron bearer token safe compare。
- deletion order / partial failure handling。
- origin allowlist env-driven。
- first helper tests。

這個 change 應對齊 `docs/engineering/BUGFIX_PLAN.md`、`docs/product/ROADMAP.md`、`docs/engineering/TESTING.md` 與 `docs/security/SECURITY.md`。若目前工作樹已經有相關 code change，只用 OpenSpec 整理 proposal / design / tasks，不要在同一輪順手追加新實作。

## Boundaries

AI agent、OpenSpec 與 Superpowers 都不得：

- 新增醫療建議、診斷、分流、治療、劑量或急迫性判斷。
- 把 CareTaiwan 改成 EMR、HIS、醫療器材、長照 ERP、排班系統或薪資系統。
- 在 public response、client log、LINE push log 或 audit metadata 輸出未遮蔽 PII。
- 把 unrelated refactor 混進 bug fix。
- 把 documentation、feature、schema migration、security fix 混在同一個 PR。
- 把 OpenSpec / Superpowers 加進 runtime dependency。
- 提交 `AGENTS.local.md`、本機絕對路徑、私人 token、真實 LINE user ID、production backup 或本機自動化設定。

遇到邊界不清的需求，先停在 proposal。不要用工具流程替代產品、資安、法務或醫療專業判斷。
