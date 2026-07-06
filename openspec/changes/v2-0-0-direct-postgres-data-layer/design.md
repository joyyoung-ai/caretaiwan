## Context

CareTaiwan 目前的 data layer 仍以 Supabase service-role client 為核心。這在 prototype 階段可行，但正式 VM 導入時會產生幾個問題：runtime 和 Supabase API 耦合、production migration / backup / restore 已走自管 Postgres 路線、service-role client 需要每個 route 自己補 ownership guard，而且錯誤與回應 redaction 分散在不同 helper。

ADR-0010 已決定不把 Supabase-compatible API / PostgREST 作為正式主路線。接下來需要一個小而明確的 Postgres adapter，讓 server-side code 逐步改用 direct Postgres，同時保留現有權限檢查與測試。

## Goals / Non-Goals

**Goals:**

- 建立 server-only Postgres adapter，統一連線、transaction、timeout 與錯誤 redaction。
- 讓第一個 pilot route 在不改變使用者功能的情況下驗證 adapter。
- 保留既有 application-level ownership checks。
- 支援分階段 migration，讓 Supabase client 可以在最後一批 runtime user 移除後再刪。
- 文件化 env、部署、測試與 rollback。

**Non-Goals:**

- 不導入 ORM 或大幅重寫 schema。
- 不把 client component 變成 DB caller。
- 不在第一階段處理照片檔案儲存正式選型。
- 不重新設計身份、配對、長者 ownership 或多家屬角色。
- 不在沒有 staging / disposable Postgres 驗證前切 production runtime。

## Decisions

### 1. Use a small adapter before migrating feature helpers

先新增 `src/lib/db/*`，不要在 feature helper 內各自建立 `new Pool()` 或直接 import driver。建議結構：

- `src/lib/db/client.ts`：讀取 server-only env、建立 singleton pool、判斷 DB 是否啟用。
- `src/lib/db/postgres.ts`：提供 `query<T>()`、`withTransaction<T>()` 與 timeout / release 處理。
- `src/lib/db/errors.ts`：把 driver error 轉成內部粗分類，public response 只能拿粗分類。

這樣可以先把連線與錯誤邊界固定下來，再遷移 feature helper。

### 2. Keep ownership checks in application code for the first phase

目前很多 API route 依賴 `elder_pairings.owner_line_user_id`、`paired_line_user_id` 與 Auth.js LINE session 判斷可讀寫資料。Direct Postgres 不會自動讓這些 guard 消失。第一階段維持 application-level ownership checks，避免把 data layer refactor 變成權限模型重寫。

若後續要導入 DB role、RLS 或 stored procedure，需要另開 ADR / OpenSpec。

### 3. Start with health route pilot

第一個 runtime pilot 建議選 `src/app/api/health/route.ts`。理由：

- 不處理使用者輸入。
- 不回傳個資。
- 可用 `select 1` 或 migration marker 驗證 DB connectivity。
- 出錯時可以回傳 redacted health status，不會影響照護資料寫入。

Pilot 通過後再搬移 `care-calendar` / `caregiver-leave`，因為這兩個 helper 測試較集中，而且是近期新增功能，資料模型也比較清楚。

### 4. Keep Supabase dependency until migration is complete

`@supabase/supabase-js` 目前仍被 photo file storage fallback、cloud backup 與 cron 使用。第一階段不能移除 dependency，也不能刪 `src/lib/supabase-server.ts`。每一批 migration 應在 tasks 中列出受影響 helper、route tests、redaction checks 與 rollback。

### 5. Treat storage separately

Direct Postgres adapter 只處理 relational data。照片檔案或備份 payload 的儲存策略仍需獨立決策。第一階段只可搬移 `record_photos` metadata，不應順手決定 Supabase Storage、local filesystem、S3-compatible object storage 或 NAS 的正式路線。

## Risks / Trade-offs

- 一次替換所有 Supabase 呼叫會讓故障面過大。分階段 migration 比較慢，但比較容易驗證和 rollback。
- `pg` adapter 會讓 app 直接持有 DB credential；部署文件必須清楚要求 server-only env，不得加 `NEXT_PUBLIC_*`。
- Connection pool 在 Next.js runtime 需要小心 singleton 與 hot reload；tests 要覆蓋 repeated import 不重複建立過多 pool。
- 只做 application-level ownership checks 仍有 service-role 類型風險；這是第一階段接受的 trade-off，後續可再評估 DB-level enforcement。
- Health route pilot 能驗證連線與 redaction，但不能代表所有 SQL helper 都正確。後續每個 feature helper 還是要逐一補測試。
- Supabase Storage / backup payload 尚未決定正式路線。若在 data layer PR 順手處理，會混淆風險與 review 範圍。

## Migration Plan

1. 建立 OpenSpec 與第一階段 Superpowers plan。
2. 新增 `pg` / `@types/pg` dependency，建立 `src/lib/db/*` adapter 與 unit tests。
3. 更新 env 範例與部署文件，說明 `DATABASE_URL` 與 SSL / pool 設定。
4. 將 health route 改用 adapter pilot，保留 redacted response。
5. 在 disposable 或 staging Postgres 驗證 DB connectivity 與 health route。
6. 第二批搬移 `care-calendar` / `caregiver-leave` helper，保持 API contract 不變。
7. 第三批再搬移 audit、pairing、expense、photo metadata、cloud backup 與 cron；已完成的 relational helper 不代表 photo file storage 已定案。
8. 所有 runtime user 搬完且 storage 策略另案決定後，才移除 Supabase server client 與相關 env。

Rollback 原則：

- Adapter pilot 可回退 health route 到原本 Supabase health check。
- 若 feature helper migration 出問題，先回退該 helper，不動已完成的 adapter 基礎。
- Production 前每一批都要保留 migration / deployment rollback note。
- 不得修改已套用 production 的 migration；需要 schema 調整時新增 migration。
