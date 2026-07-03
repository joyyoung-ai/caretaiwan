# Testing

日期：2026-07-03

## Current Status

已建立第一批 Vitest helper tests，也開始補 API route 邊界測試。`npm run test` 目前會執行 pairing、origin check、cron security、audit metadata redaction、photo magic-byte detection、rate limiter fallback、photo ownership、cloud upload / download / delete ownership and failure paths、representative cloud disabled / unauthenticated gates、photo upload pairing guard / invalid bytes / metadata rollback、family paired ownership query and DB failure、pairing bind / ensure / unbind、group-code / group-photo / group-unbind、pairing status owner query、photo signed token route、session response shape、expense create / list / verify ownership、data-retention cron auth / config / redaction 與 LINE webhook security-path 測試。`npm run test:smoke` 會啟動 production server，檢查首頁、about、privacy、terms、session API 與安全 headers。`npm run lint` 目前可無 warning 通過。

本輪已重新跑過 `npm run test`、`npm run test:smoke`、`npm run lint`、`npm run build`、`npm run docs:check` 與 `git diff --check`。第一批 helper tests、route tests、smoke test 和 lint 狀態可作為 v1.0.1 runtime safety 收尾依據。

正式建置 Docker image 前，應透過 CI pipeline 強制執行 lint 與自動化測試。測試失敗不得產生 production image。

## Proposed Tool

第一批測試建議使用 Vitest。原因很單純：目前最需要保護的是純 helper 與低依賴邏輯，不需要先把 route handler、資料庫 mock 和瀏覽器環境全部架起來。

暫時不要為了補測試而大改 production code。若 helper 需要拆出來測，拆分範圍要小，並在 PR 說明行為沒有改變。

## First Test Files

第一批測試檔先落在這些位置：

- `src/lib/pairing.test.ts`（已建立）
- `src/lib/origin-check.test.ts`（已建立）
- `src/lib/cron-security.test.ts`（已建立）
- `src/lib/rate-limit.test.ts`（已建立）
- `src/lib/photo-format.test.ts`（已建立）
- `src/lib/audit.test.ts`（已建立）
- `src/lib/record-photos.test.ts`（已建立）
- `src/app/api/cloud/delete/route.test.ts`（已建立）
- `src/app/api/cloud/download/route.test.ts`（已建立）
- `src/app/api/cloud/upload/route.test.ts`（已建立）
- `src/app/api/cron/data-retention/route.test.ts`（已建立）
- `src/app/api/expense/create/route.test.ts`（已建立）
- `src/app/api/expense/list/route.test.ts`（已建立）
- `src/app/api/expense/verify/route.test.ts`（已建立）
- `src/app/api/family/paired/route.test.ts`（已建立）
- `src/app/api/line/webhook/route.test.ts`（已建立）
- `src/app/api/pairing/bind/route.test.ts`（已建立）
- `src/app/api/pairing/ensure/route.test.ts`（已建立）
- `src/app/api/pairing/group-code/route.test.ts`（已建立）
- `src/app/api/pairing/group-photo/route.test.ts`（已建立）
- `src/app/api/pairing/group-unbind/route.test.ts`（已建立）
- `src/app/api/pairing/status/route.test.ts`（已建立）
- `src/app/api/pairing/unbind/route.test.ts`（已建立）
- `src/app/api/photo/signed/[token]/route.test.ts`（已建立）
- `src/app/api/photo/upload/route.test.ts`（已建立）
- `src/app/api/session/route.test.ts`（已建立）
- `scripts/smoke-test.mjs`（已建立）

## First Test Targets

第一批測試先放在純 helper 與低依賴邏輯：

- pairing code TTL。
- self-pairing prevention。
- origin checks。
- cron bearer token parsing / safe compare / LINE user ID reference。
- rate limiter fallback。
- photo magic-byte detection。
- audit metadata redaction。
- photo ownership metadata checks。
- expense create route ownership checks。
- expense list photo signed URL metadata gate。
- cloud download 只查登入者自己的 backup。
- cloud upload 只用登入者 LINE user ID 寫入，並剔除非預期 top-level keys。
- cloud delete 只刪除 / 解除登入者相關資料。
- cloud download、expense create / verify、pairing bind / status 的 representative cloud disabled / unauthenticated gates。
- data-retention cron warn / delete response redaction。
- data-retention cron missing / invalid auth 與 missing secret。
- photo upload 未配對 elder 時不寫 storage 或 metadata。
- photo upload invalid image bytes 與 metadata insert failure rollback。
- family paired 只查登入看護已配對的長者卡。
- family paired pairing lookup DB failure。
- pairing bind code validation、rate limit gate 與登入看護綁定。
- pairing ensure / unbind owner id checks。
- group-code、group-photo、group-unbind owner id checks。
- pairing status 只用登入家屬 owner id 查詢，且不回傳過期群組碼。
- photo signed token route 的 success / invalid-token response。
- session route 只回傳登入狀態、name、picture，不回傳 LINE user ID。
- production smoke test：啟動 `next start` 後檢查核心頁面、session API 與安全 headers。
- expense verify 需要 disputed reason，並用登入家屬 id 執行核帳。
- LINE webhook disabled / signature / malformed JSON security paths。

第二批 route handler 已涵蓋：

- cloud upload / download / delete ownership checks。
- photo upload pairing guard。
- family paired ownership query。
- pairing bind / ensure / unbind。
- group-code / group-photo / group-unbind。
- pairing status owner query。
- photo signed token route。
- expense list / verify ownership and failure checks。
- photo signed URL ownership。
- cloud upload malformed JSON、oversized request、upsert failure。
- cloud delete partial DB failure。
- representative cloud disabled / unauthenticated gates。
- photo upload invalid bytes / metadata rollback。
- session response shape。
- production HTTP smoke test。

下一批再補：

- 其餘 route 的 disabled cloud / unauthenticated / DB failure matrix。
- 若要做瀏覽器級 E2E，再評估是否引入 Playwright。

## Required Before v1.0.1

v1.0.1 不應只停在「測試策略已寫」。截至 2026-07-02，下列 helper tests 已可由本機執行：

- pairing code TTL。
- self-pairing prevention。
- `checkSameOrigin` / `checkSameOriginGet` host 行為。
- cron bearer token 與 LINE user ID 去識別化 reference。
- audit metadata redaction。
- photo magic-byte detection。
- rate limiter fallback 與 Upstash error fallback。
- photo ownership metadata checks。
- expense create route ownership checks。
- expense list photo signed URL metadata gate。
- cloud download ownership query。
- cloud upload / delete ownership checks。
- representative cloud disabled / unauthenticated gates。
- data-retention cron warn / delete response redaction。
- data-retention cron auth / config failure checks。
- photo upload pairing guard。
- photo upload invalid bytes / metadata rollback。
- family paired ownership query。
- family paired DB failure。
- pairing bind / ensure / unbind route checks。
- group-code / group-photo / group-unbind route checks。
- pairing status owner query。
- photo signed token route success / invalid-token checks。
- session response shape。
- expense list failure、expense verify ownership and disputed-note validation。
- LINE webhook disabled、signature verification 與 malformed JSON handling。

## Test Command

測試工具使用 Vitest：

```bash
npm run test
```

Production HTTP smoke test 需要先完成 build，並會在本機開一個 ephemeral port：

```bash
npm run build
npm run test:smoke
```

建議 CI pipeline 更新為：

```bash
npm run lint
npm run test
npm run build
npm run test:smoke
```

## Documentation Check

Markdown 內部連結檢查已可用：

```bash
npm run docs:check
```

這個指令會檢查根目錄入口、`docs/` 與 `.github/` 內的 Markdown 相對連結。它只檢查 repo 內檔案是否存在，不檢查外部網址可用性。

## Test Data Rules

- 不使用 production 真實個資。
- 不使用正式 LINE token。
- 不使用 production 備份檔。
- 測試照片要使用假圖或去識別化素材。
- 涉及 LINE ID 的測試資料要使用明確標示的 fake ID。
