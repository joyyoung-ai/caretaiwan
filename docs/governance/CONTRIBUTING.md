# 參與貢獻指南

日期：2026-07-01

CareTaiwan 歡迎 issue、文件修正與小範圍 PR。這個專案處理照護紀錄、LINE ID、照片與健康相關資料，改動不能只看功能能不能跑，還要看隱私、法律責任與使用者權力關係。

## 開始前先讀

請先讀：

- [PROJECT_VISION.md](./PROJECT_VISION.md)
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md)
- [DECISIONS.md](./DECISIONS.md)
- [RELEASE_PROCESS.md](./RELEASE_PROCESS.md)
- [../../CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md)
- [../../AGENTS.md](../../AGENTS.md)

如果你的提案會改資料庫、部署方式、身份權限、LINE 推播、照片或醫療相關文字，請先開 issue 討論。

## Issue 格式

開 issue 時請選最接近的類型：

- Bug：現有行為錯誤、資安疑慮、資料保護問題、部署失敗。
- Feature：新增功能或調整產品流程。
- Documentation：文件錯誤、連結失效、說明不清。
- Security：不要公開貼敏感資料。請先看 [../security/SECURITY.md](../security/SECURITY.md) 的通報方式。

好的 issue 至少要包含：

- 目前發生什麼事。
- 你預期應該發生什麼事。
- 重現步驟或截圖。
- 涉及的頁面、API、資料表或文件。
- 是否可能碰到個資、照片、LINE ID、醫療內容或刪除請求。

## Branch 規則

建議分支命名：

- `feature/<short-name>`
- `bugfix/<short-name>`
- `docs/<short-name>`
- `chore/<short-name>`
- `security/<short-name>`

`main` 代表可發布狀態。若團隊導入 `develop`，`develop` 作為整合分支，正式 release 再合回 `main`。不要直接把實驗功能推到 `main`。

## Commit 格式

Commit message 請使用繁體中文，讓維護者在 git history 裡可以直接看懂改動目的。可以保留簡短類型前綴，但前綴也應使用中文：

- `功能：新增照護事件草案 schema`
- `修正：遮蔽資料保留 cron response 的 LINE user ID`
- `文件：新增專案願景`
- `維護：更新部署 env 範例`
- `資安：收緊 webhook 驗簽流程`

一個 commit 應該能說清楚一件事。不要把 bug fix、formatting、文件搬移與新功能混在同一個 commit。

## PR 規則

一個 PR 只做一件事：

- Bug fix 不混 feature。
- Feature 不混 refactor。
- Documentation 不混 DB migration。
- Schema 變更不混 UI 大改。
- 資安修補要盡量縮小 diff。

PR 說明要包含：

- 這次改了什麼。
- 為什麼要改。
- 影響哪些頁面、API、資料表、環境變數或文件。
- 有沒有個資、醫療內容、LINE 推播、照片或刪除請求風險。
- 驗證方式，例如 `npm run lint`、`npm run build`、手動測試項目。

PR checklist 請使用 [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)。送出前至少確認：

- 沒有把 production secret、LINE token、service-role key 或真實備份放進 repo。
- 沒有在 API response、client log、push log 或 audit metadata 輸出未遮蔽 PII。
- Feature、bug fix、refactor、documentation、migration 沒有混在同一個 PR。
- 涉及醫療相關提醒時，文案沒有提供醫療判斷或醫療指示。
- 相關文件與 changelog 已更新，或明確說明不需要更新。

## Coding Style

- 使用既有 Next.js 16 App Router 結構。
- 優先使用 `src/lib/*` 既有 helper。
- 不要從 client component import server-only module。
- API response 不回傳詳細 DB 錯誤。
- 使用者可控輸入要做 allowlist 或結構化驗證。
- UI 文案以繁體中文為主；若已有多語字典，需同步更新越南文、印尼文與英文。

目前可執行的基本檢查：

```bash
npm run docs:check
npm run migrations:check
npm run test
npm run lint
npm run build
```

已建立第一批 helper tests。新增 route handler、E2E 或需要外部服務 mock 的測試前，請在 PR 說明測試邊界與假資料來源。

## Migration Rule

`supabase-schema.sql` 是 idempotent schema，不取代正式 migration series。production migration series 建立後，schema 變更仍要同步更新 idempotent schema 與 `npm run migrations:check`。

在 migration series 建立後：

- 不得修改已套用到 production 的 migration。
- 只能新增 migration。
- migration 要能清楚說明 up / down 或回滾策略。
- 會刪資料、改欄位型別、搬移 PII 的 migration 要先寫風險說明。
- 新增資料表要說明保留期限、刪除流程、讀寫角色與 right-to-erasure。

新增 production migration 前，先在 issue、OpenSpec change 或文件裡寫資料模型草案，再依 VM 自管 Postgres 路線實作。

## Documentation Rule

新增功能時，至少檢查：

- README 是否需要更新。
- `.env.example` / `docker/.env.production.example` 是否需要更新。
- [../product/ROADMAP.md](../product/ROADMAP.md) 是否需要調整。
- [DECISIONS.md](./DECISIONS.md) 是否需要新增 ADR。
- [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) 是否需要改。
- [../releases/CHANGELOG.md](../releases/CHANGELOG.md) 是否需要記錄。

中文文件請套用 `Humanizer-zh-TW` 原則：直接、具體、不要寫成宣傳稿。
