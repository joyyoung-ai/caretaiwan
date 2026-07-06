## Why

ADR-0010 已決定正式路線是讓 app 的 server-side data layer 直接連 VM 自管 Postgres，不再把 Supabase-compatible API / PostgREST 當成主要正式路線。現在 runtime 仍大量使用 `@supabase/supabase-js` 與 service-role client；若直接全域替換，容易一次影響登入後 API、照片 metadata、照護行程、記帳、data-retention cron 與 health check。

這個 change 先定義重構邊界與分階段落地方式。目標不是把所有資料功能一次切完，而是建立 server-only Postgres adapter，先用低風險 route 驗證連線、錯誤處理與 redaction，再逐步搬移各資料 helper。

## What Changes

- 新增 server-only Postgres data adapter：
  - 由 `DATABASE_URL` 等 server-only env 控制。
  - 提供 typed query / transaction helper。
  - 集中處理連線缺漏、driver error、timeout 與 redacted error mapping。
  - 不允許 client component 或 browser bundle import DB adapter。
- 逐步遷移現有 Supabase data helpers：
  - 第一階段只建立 adapter 與 health route pilot。
  - 第二階段搬移照護行程與請假 helper，因為測試面較集中。
  - 第三階段再處理 audit、pairing、expense、photo metadata、cloud backup 與 cron。
- 保留 application-level ownership checks：
  - 第一階段不假設 DB RLS 已完成。
  - 每個 route / helper 仍需檢查 elder owner、paired caregiver、session 與 same-origin 邊界。
- 把照片 / object storage 視為獨立決策：
  - DB adapter 只處理 relational data。
  - Supabase Storage、local filesystem 或 object storage 的正式選型另開 ADR / OpenSpec。
- 更新 env、部署、測試與 runbook 文件：
  - `.env.example`、`docker/.env.production.example`、部署文件與 runbook 要補 direct Postgres 設定。
  - 測試文件要列出 adapter unit tests、route pilot tests 與後續 migration gate。

明確排除：

- 不在本 change 直接導入 Prisma、ORM 或 DB schema 大重寫。
- 不在 client component 直接連 Postgres。
- 不把 Supabase Storage 的替代方案混進第一階段。
- 不在未完成 route migration 前移除 `@supabase/supabase-js`。
- 不改變使用者可見產品功能。

## Capabilities

### New Capabilities

- `data-layer`: 定義 server-side direct Postgres adapter、client / server 邊界、錯誤 redaction、逐步 migration 與 verification 要求。

### Modified Capabilities

- `runtime-safety`: DB 錯誤與 health / cron response 必須維持 redacted response。
- `care-calendar`: 後續 data helper 會從 Supabase service-role client 搬到 direct Postgres adapter，但 ownership 模型不變。

## Impact

- Affected runtime areas in later implementation PRs:
  - `src/lib/supabase-server.ts`
  - new `src/lib/db/*`
  - `src/app/api/health/route.ts`
  - `src/lib/care-calendar.ts`
  - `src/lib/caregiver-leave.ts`
  - later: pairing, audit, expense, photo metadata, cloud backup and cron routes
- Affected dependencies:
  - likely add `pg` and `@types/pg` in the first implementation PR.
  - keep `@supabase/supabase-js` until all runtime users are migrated.
- Affected docs:
  - `.env.example`
  - `docker/.env.production.example`
  - `docs/operations/DEPLOY.md`
  - `docs/operations/RUNBOOK.md`
  - `docs/engineering/TESTING.md`
  - `docs/releases/CHANGELOG.md`
- Security boundaries:
  - DB URL and credentials are server-only secrets.
  - Public responses must not expose hostnames, usernames, raw SQL, LINE IDs, elder notes, photo URLs or driver error details.
