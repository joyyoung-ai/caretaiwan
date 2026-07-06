## 1. Scope and product gates

- [x] 1.1 Confirm v1.2 only enables care event LINE reminders, not medical advice or scheduling.
- [x] 1.2 Confirm reminder runtime must not promise delivery.
- [ ] 1.3 Review reminder copy with product owner before implementation.
- [ ] 1.4 Confirm whether reminders go to caregiver only, family owner only, bound LINE group, or a constrained first-version subset.

## 2. Data model and migration

- [ ] 2.1 Design reminder delivery state using a separate table or explicit columns, with claim state, attempts, last attempt time and coarse error code.
- [ ] 2.2 Add production migration with rollback, indexes, retention, deletion and right-to-erasure notes.
- [ ] 2.3 Update `supabase-schema.sql` and `npm run migrations:check` for the new reminder schema.
- [ ] 2.4 Verify forward / rollback in disposable or staging Postgres before production use.

## 3. Reminder helper tests and implementation

- [ ] 3.1 Add failing tests for reminder copy, including medical-related disclaimer and no note leakage.
- [ ] 3.2 Add failing tests for due reminder selection, claim TTL, max attempts and cancelled event exclusion.
- [ ] 3.3 Add failing tests for provider error classification and redaction.
- [ ] 3.4 Implement reminder helper functions with minimal data exposure.

## 4. Cron / worker runtime and tests

- [ ] 4.1 Add failing tests for missing / invalid cron secret.
- [ ] 4.2 Add failing tests for dry-run response redaction.
- [ ] 4.3 Add failing tests for successful send, retryable failure and permanent failure.
- [ ] 4.4 Implement server-only cron or worker endpoint.
- [ ] 4.5 Ensure runtime does not require LINE OAuth session and does not expose raw LINE IDs in response.

## 5. LINE push integration

- [ ] 5.1 Add LINE client wrapper tests using mocks, not real LINE token.
- [ ] 5.2 Implement constrained reminder message payload.
- [ ] 5.3 Ensure medical-related reminders include approved non-medical copy.
- [ ] 5.4 Ensure raw provider errors are not persisted or returned.

## 6. UI and operations

- [ ] 6.1 Update UI copy from "LINE reminder inactive" to active status only after runtime exists.
- [ ] 6.2 Show failure / pending status without implying medical urgency or guaranteed delivery.
- [ ] 6.3 Update `docs/operations/RUNBOOK.md` with cron schedule, manual dry-run and failure handling.
- [ ] 6.4 Update `docs/security/SECURITY.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/engineering/TESTING.md` and changelog.

## 7. Verification

- [ ] 7.1 Run `npm run migrations:check`.
- [ ] 7.2 Run `npm run docs:check`.
- [ ] 7.3 Run `npm run test`.
- [ ] 7.4 Run `npm run lint`.
- [ ] 7.5 Run `npm run build`.
- [ ] 7.6 Run `npm run test:smoke`.
- [ ] 7.7 Run `npm run test:e2e` when UI status changes.
