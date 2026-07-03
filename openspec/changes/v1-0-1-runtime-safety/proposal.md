## Why

v1.0.1 是中揚資訊接手後第一批 runtime safety 修補線，先處理會影響部署、隱私與資料安全的問題。這些項目集中在 data retention cron、管理端點 token、刪除流程、origin allowlist、helper tests 與 lint warning，不應和新功能或 UI 重構混在一起。

這個 OpenSpec change 只建立提案、設計、任務與規格 delta。任何 runtime code、test、schema、Docker 或 env 範例變更都要放到後續實作 PR。

## What Changes

- 管理 data retention cron response 的 PII redaction，避免 public response 或 cron response 回傳完整 LINE user ID。
- 要求 cron bearer token 使用更安全、固定時間特性的比對方式，不使用單純字串相等。
- 明確 data retention cron 的刪除順序與部分失敗處理，避免先刪 pairing 後留下 backup 或把 DB error 原文丟到 response。
- 要求 origin allowlist 可由正式部署環境設定驅動，支援 `PUBLIC_APP_URL` / `PRODUCTION_ALLOWED_HOSTS` 或等效機制。
- 建立第一批 helper tests 範圍：pairing TTL、self-pairing prevention、origin checks，以及 cron security 相關 helper。
- 維持 lint 無 warning，避免 warning 變成背景噪音。
- 更新必要文件與 changelog，但只能記錄 proposal 或實作結果，不得把未完成工作寫成已完成。

明確排除：

- 醫療功能、醫療建議、診斷、分流、治療、劑量或急迫性判斷。
- 行事曆、照護提醒、請假功能或 LINE reminder 新功能。
- schema migration、資料模型重整或 production migration series。
- UI refactor、設計系統導入或頁面重排。
- VM / Docker 部署重構、CI/CD 重構或供應商選型。
- CareTaiwan 產品定位調整。

## Capabilities

### New Capabilities

- `runtime-safety`: 定義 v1.0.1 runtime safety 的可驗收行為，涵蓋 PII redaction、cron token compare、data retention 刪除順序、origin allowlist、helper tests 與 lint warning cleanup。

### Modified Capabilities

- None. 目前 `openspec/specs/` 尚無既有 capability spec；本 change 先新增 `runtime-safety`。

## Impact

- Affected runtime areas in later implementation PRs:
  - `src/app/api/cron/data-retention/route.ts`
  - `src/lib/origin-check.ts`
  - cron security / redaction helper under `src/lib/*`
  - pairing and origin helper tests under `src/lib/*.test.ts`
- Affected data and security boundaries:
  - LINE user ID and derived references
  - cron response and audit metadata
  - bearer token validation
  - data retention deletion order
  - production origin allowlist
- Affected docs:
  - `docs/releases/CHANGELOG.md`
  - `docs/engineering/TESTING.md`
  - `docs/security/SECURITY.md`
  - deployment docs only if later implementation changes env behavior
- No runtime dependency changes. Do not modify `package.json` or `package-lock.json` for this change proposal.
