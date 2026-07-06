# Release Process

日期：2026-07-06

這份文件定義 CareTaiwan 分支的 release 流程。它先把 repository 內可執行的規則固定下來；GitHub organization、team、branch protection 與 private vulnerability reporting 還需要在 GitHub 後台設定。

## Release types

- Patch：bug fix、資安修補、文件修正、小型 runtime safety 修補。
- Minor：新功能、schema / migration、新 API、LINE 推播或部署流程變更。
- Major：產品邊界、資料責任、權限模型、正式服務品牌或不相容 migration 重大變更。

正式 release tag 使用 `vMAJOR.MINOR.PATCH`，例如 `v1.1.0`。若只是內部試辦 build，可在 release note 標明 `pilot` 或 `staging`，但不要把未驗證 build 標成 production release。

## Release gate

Release 前至少要通過：

```bash
npm run audit
npm run lint
npm run docs:check
npm run migrations:check
npm run test
npm run build
npm run test:smoke
npm run test:e2e
```

若 release 不碰 UI，維護者仍可要求跑 `test:e2e`，因為首頁 shell、legal pages、session redaction 與照護行程入口都屬於 smoke baseline。

## Required review

Release PR 至少檢查：

- 是否符合 [PROJECT_VISION.md](./PROJECT_VISION.md)。
- 是否沒有新增醫療建議、診斷、治療、劑量、分流或急迫性判斷。
- 是否沒有把請假功能做成排班、薪資、扣款或勞資爭議判定。
- 是否沒有在 response、client log、push log、audit metadata 或長期 log 輸出未遮蔽 PII。
- 若有 migration，是否新增 forward / rollback SQL，並更新 `supabase-schema.sql` 與 `npm run migrations:check`。
- 若有 production schema 變更，是否在 disposable 或 staging Postgres 演練 forward / rollback。
- 若有 LINE push / reminder，是否有 provider error redaction、token rotation 驗證與 runbook。

## Changelog and tag

Release PR 要更新 [../releases/CHANGELOG.md](../releases/CHANGELOG.md)。內容至少包含：

- 新增功能。
- 修正 bug。
- 資安或隱私變更。
- migration 或部署變更。
- 已知限制。
- 驗證指令與結果摘要。

Tag 前確認 `main` 已通過 CI。Tag 格式：

```bash
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```

若 release 後發現阻斷問題，先停止部署或回滾 image，再開 follow-up issue / PR。不要直接修改已發布 tag。

## Branch protection target

GitHub branch protection 尚未設定前，維護者需人工確認 PR 通過 CI 才能合併。正式公開前建議設定：

- `main` 需要 pull request review。
- `main` 需要通過 CI workflow。
- 禁止直接 push 到 `main`，除非是受控 emergency fix。
- 要求 conversation resolved。
- CODEOWNERS 啟用後，要求對應 owner review。

## Production image rule

Production image 只能從通過 release gate 的 commit 建置。測試失敗不得產生 production image；若 CI 尚未自動建置 image，手動 build 也要把 commit SHA、image tag、操作者與驗證結果寫進 release note 或 deployment log。
