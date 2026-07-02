# Testing

日期：2026-07-01

## Current Status

已建立第一批 Vitest helper tests，也開始補 API route 邊界測試。`npm run test` 目前會執行 pairing、origin check、cron security、audit metadata redaction、photo magic-byte detection、rate limiter fallback、photo ownership、expense create ownership 與 LINE webhook security-path 測試。`npm run lint` 目前可無 warning 通過。

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
- `src/app/api/expense/create/route.test.ts`（已建立）
- `src/app/api/line/webhook/route.test.ts`（已建立）

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
- LINE webhook disabled / signature / malformed JSON security paths。

第二批再補：

- 其他 API route ownership / role checks。
- data-retention cron response redaction。
- photo signed URL ownership。

## Required Before v1.0.1

v1.0.1 不應只停在「測試策略已寫」。目前下列 helper tests 已可由本機執行：

- pairing code TTL。
- self-pairing prevention。
- `checkSameOrigin` / `checkSameOriginGet` host 行為。
- cron bearer token 與 LINE user ID 去識別化 reference。
- audit metadata redaction。
- photo magic-byte detection。
- rate limiter fallback 與 Upstash error fallback。
- photo ownership metadata checks。
- expense create route ownership checks。
- LINE webhook disabled、signature verification 與 malformed JSON handling。

## Test Command

測試工具使用 Vitest：

```bash
npm run test
```

並將 CI pipeline 更新為：

```bash
npm run lint
npm run test
npm run build
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
