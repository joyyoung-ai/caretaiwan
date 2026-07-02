## Context

CareTaiwan 處理照護紀錄、LINE ID、照片、備份與 audit metadata。v1.0.1 的 runtime safety 線先處理接手後最直接的部署與隱私風險：data retention cron response、cron bearer token、刪除順序、origin allowlist、第一批 helper tests 與 lint warning。

目前 Roadmap 和 bugfix 文件已把這批項目列為 v1.0.1 工程修補。這個 OpenSpec change 用來補齊 proposal / design / tasks / spec delta，讓後續 review、驗收與 archive 有共同依據。本 change 本身不修改 runtime code。

相關邊界：

- `AGENTS.md` 要求 API response、client log、LINE push log、cron response 與 audit metadata 不輸出未遮蔽 PII。
- `docs/security/SECURITY.md` 把 LINE ID、照片 URL、備份與 token 都列為敏感資料。
- `docs/governance/PROJECT_VISION.md` 明確排除醫療判斷、EMR / HIS、長照 ERP、排班與薪資。
- `docs/governance/CONTRIBUTING.md` 要求一個 PR 只做一件事，資安修補要縮小 diff。

## Goals / Non-Goals

**Goals:**

- Data retention cron response 不回傳完整 LINE user ID。
- Cron bearer token 改用固定長度、timing-safe 的比對策略。
- Data retention delete stage 先處理 backup，再處理 pairing；部分失敗要可觀測，但 response 不洩漏 DB error 原文。
- Origin allowlist 可由 production env 設定，不把正式網域寫死在單一部署平台。
- 第一批 helper tests 覆蓋 pairing TTL、self-pairing prevention、origin checks 與 cron security helper。
- v1.0.1 release 前維持 `npm run lint` 無 warning。
- 把後續實作切成小 PR，避免 cron、origin、tests 與 lint cleanup 混在同一個 diff。

**Non-Goals:**

- 不新增醫療功能、醫療建議、診斷、分流、治療、劑量或急迫性判斷。
- 不新增行事曆、照護提醒、請假流程、LINE reminder 或家屬協作功能。
- 不做 schema migration、production migration series 或資料模型重整。
- 不做 UI refactor、設計系統導入或頁面重排。
- 不重構 Docker / VM 部署架構，不決定雲端供應商。
- 不修改 `package.json` / `package-lock.json` 作為 OpenSpec 或 Superpowers dependency。

## Decisions

### 1. PII redaction uses a non-reversible LINE user reference

Data retention cron response 只需要讓維護者能比對同一次 run 的結果，不需要完整 LINE user ID。設計方向是使用 deterministic、non-reversible short reference，例如 `lineUserRef`。來源可以是 LINE user ID 的 hash prefix，但 response、client log、cron response 與可公開檢視的 audit metadata 不應包含原始 LINE user ID、display name、照片 URL、自由文字 note 或 DB error 原文。

替代方案：完全不回傳任何 per-user result。這樣最保守，但 dry-run 和 partial failure 排查會變困難。短 hash reference 在不暴露 raw ID 的前提下保留排查能力。

### 2. Cron token compare normalizes length before timing-safe compare

直接用字串相等比較 bearer token 會留下 timing side-channel 的風險，也容易在 malformed header 時有不一致行為。設計方向是先解析 `Authorization: Bearer <token>`，再把 actual / expected token 轉成固定長度 digest，最後用 timing-safe compare。

替代方案：只檢查 token 長度後用 `===`。這比較簡單，但沒有必要承擔 timing compare 風險。

### 3. Delete stage protects backup before pairing cleanup

Data retention delete stage 要避免留下孤立 backup。刪除順序應先處理 `cloud_backups`。只有 backup deletion 成功後，才刪除同一 user 相關的 `elder_pairings`。若 pairing cleanup 失敗，response 和 audit metadata 記錄 redacted partial failure；不回傳 raw DB error。若 backup deletion 失敗，當次不刪 pairing。

替代方案：用 transaction 一次刪除 backup 和 pairings。這在 route handler 透過 Supabase client 操作時不一定容易落地；短期先用明確順序與 partial failure reporting，之後若改 RPC 或 RLS 再評估 transaction。

### 4. Origin allowlist comes from deployment env

正式部署不能只靠 legacy domain 或 preview host 規則。Production allowed hosts 應從 `PUBLIC_APP_URL`、`PRODUCTION_ALLOWED_HOSTS` 或等效 env 產生。Preview / dev host，例如 localhost、`127.0.0.1`、`VERCEL_URL`、`PREVIEW_ALLOWED_HOSTS`，只能在非 production 使用，除非被明確列為 production host。

替代方案：把正式 host 寫死在程式。這會讓 rebrand、domain 切換或 VM 部署變得脆弱，也和 ADR-0008 的未來 rebrand 空間衝突。

### 5. Helper tests protect behavior before route-heavy tests

第一批 tests 先保護低依賴 helper：pairing TTL、self-pairing prevention、origin checks、cron bearer parsing / safe compare / redacted reference。Route handler 和 E2E tests 放到後續測試擴充，不在這輪硬塞。

替代方案：直接補 E2E 或所有 API route tests。這會把測試框架、mock 資料庫與瀏覽器流程拉進 v1.0.1，超過這輪 runtime safety 的小步範圍。

### 6. Implementation PRs split by risk surface

建議後續拆成三個實作 PR：

1. Cron response + token compare + delete order。
2. Origin allowlist env-driven。
3. First helper tests + lint warning cleanup。

Cron PR 涉及 PII、management endpoint 與資料保留；origin PR 涉及 CSRF / same-origin 與部署設定；tests / lint PR 是品質閘門。拆開 review 比一次合併更容易判斷風險。

## Risks / Trade-offs

- Redacted reference 仍可能被同一系統內的人用來跨 run 關聯同一 user → 只用於維運排查，不在 public UI 顯示；不回傳 raw LINE ID 或 display name。
- Hash prefix 太短可能碰撞 → 用足夠長度的 reference；若未來需要稽核級追蹤，再改為 server-side lookup。
- Pairing cleanup partial failure 會留下已刪 backup 但未清 pairing 的狀態 → audit metadata 要記錄 partial failure，後續 run 或人工處理可重試；不要把 DB error 原文放進 response。
- Env-driven origin allowlist 可能因設定錯誤擋掉合法 production host → env example、deployment docs 和 manual verification 要一起檢查。
- Helper tests 不等於完整 API route 或 E2E coverage → `docs/engineering/TESTING.md` 繼續追蹤第二批 route / photo / E2E tests。
- 目前 repo 文件已記錄 v1.0.1 engineering pass 狀態 → 這個 OpenSpec change 應被視為補齊規格治理，不代表本 commit 會改 runtime code。

## Migration Plan

這個 OpenSpec proposal commit 不做 migration，也不改 runtime code。後續實作 PR 應照以下順序：

1. Cron runtime safety PR：實作或確認 response redaction、token safe compare、delete order、partial failure handling；執行 `npm run test`、`npm run lint`、`npm run build`。
2. Origin allowlist PR：實作或確認 production env-driven allowlist；同步 env example / deploy docs（若行為或 env 文件需要更新）；執行 origin helper tests、lint、build。
3. Helper tests + lint cleanup PR：補足或確認 pairing / origin / cron helper tests，清掉 lint warning；執行 docs / test / lint / build。

Rollback 原則：

- Cron change 若造成 production cron 失敗，先停用排程或只跑 dry-run，再回復最近一版 route handler。
- Origin allowlist 若阻擋合法 host，先修 env 設定；若程式邏輯錯誤，再回復該 PR。
- Tests / lint cleanup 不應改 runtime 行為；若造成 CI 阻塞，先回復測試設定或拆小修正。

## Open Questions

- `lineUserRef` 長度是否固定為 12 hex chars，或要在 security review 後調整。
- Production 是否只接受 `PUBLIC_APP_URL` / `PRODUCTION_ALLOWED_HOSTS`，還是保留 legacy `caretaiwan.app` host 到 rebrand 完成。
- Data retention partial failure 是否需要後續補管理端重試工具，或先靠 audit log 與下次 cron run 處理。
