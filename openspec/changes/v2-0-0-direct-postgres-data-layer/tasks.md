## 1. Scope and safety gates

- [x] 1.1 Confirm ADR-0010 direct Postgres route is the target data strategy.
- [x] 1.2 Confirm first phase should not replace every Supabase call at once.
- [x] 1.3 Confirm client components must never connect directly to Postgres.
- [ ] 1.4 Review first implementation PR scope before adding runtime dependency.

## 2. Adapter foundation

- [ ] 2.1 Add `pg` and `@types/pg` dependencies.
- [ ] 2.2 Add `src/lib/db/client.ts` with server-only env parsing, singleton pool creation and `isDatabaseEnabled()`.
- [ ] 2.3 Add `src/lib/db/postgres.ts` with typed query and transaction helpers.
- [ ] 2.4 Add `src/lib/db/errors.ts` with coarse DB error mapping and redaction helpers.
- [ ] 2.5 Add tests for missing config, repeated pool access, query success, transaction rollback and redacted driver errors.

## 3. Env and operations docs

- [ ] 3.1 Add `DATABASE_URL` and optional DB runtime settings to `.env.example`.
- [ ] 3.2 Add production DB env notes to `docker/.env.production.example`.
- [ ] 3.3 Update `docs/operations/DEPLOY.md` with direct Postgres runtime requirements.
- [ ] 3.4 Update `docs/operations/RUNBOOK.md` with DB connectivity check and rollback notes.
- [ ] 3.5 Update `docs/engineering/TESTING.md` with adapter and route pilot checks.

## 4. Health route pilot

- [ ] 4.1 Add failing route tests for direct Postgres health success, disabled config and redacted failure.
- [ ] 4.2 Migrate `src/app/api/health/route.ts` to use the DB adapter pilot.
- [ ] 4.3 Ensure health response does not expose DB host, username, raw SQL, driver error or sensitive table names.
- [ ] 4.4 Verify route still works when cloud data features are disabled.

## 5. Feature migration sequence

- [ ] 5.1 Migrate `src/lib/care-calendar.ts` to the DB adapter with API contract tests unchanged.
- [ ] 5.2 Migrate `src/lib/caregiver-leave.ts` to the DB adapter with ownership tests unchanged.
- [ ] 5.3 Migrate audit helper with redacted metadata tests.
- [ ] 5.4 Migrate pairing helper and all pairing route tests.
- [ ] 5.5 Migrate expense and photo metadata helpers without changing photo file storage.
- [ ] 5.6 Migrate cloud backup and data-retention cron after storage strategy is reviewed.
- [ ] 5.7 Remove Supabase server client and env only after `rg "getSupabaseAdmin|SUPABASE_SERVICE_ROLE|NEXT_PUBLIC_SUPABASE"` confirms no runtime user remains.

## 6. Verification

- [ ] 6.1 Run `npm run docs:check`.
- [ ] 6.2 Run `npm run migrations:check`.
- [ ] 6.3 Run adapter and affected route tests.
- [ ] 6.4 Run `npm run lint`.
- [ ] 6.5 Run `npm run build`.
- [ ] 6.6 Run `npm run test:smoke`.
- [ ] 6.7 Run `npm run test:e2e` when UI behavior changes.
- [ ] 6.8 Run disposable or staging Postgres connectivity check before production rollout.
