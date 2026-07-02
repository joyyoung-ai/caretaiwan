## 1. Cron runtime safety PR

- [x] 1.1 Add or confirm a reusable cron redaction helper for LINE user references, using a non-reversible `lineUserRef` or equivalent reference.
- [x] 1.2 Update or confirm data retention warn-stage responses so returned samples never include full LINE user IDs, display names, raw DB errors, photo URLs, medical notes, or free-text PII.
- [x] 1.3 Update or confirm data retention delete-stage responses so deleted and partial-failure records use only redacted user references.
- [x] 1.4 Update or confirm cron bearer token parsing and comparison so `Authorization: Bearer <token>` is checked with fixed-length, timing-safe comparison rather than plain string equality.
- [x] 1.5 Update or confirm delete ordering so `cloud_backups` deletion succeeds before related `elder_pairings` are deleted.
- [x] 1.6 Update or confirm partial failure handling so pairing delete failures are visible in redacted response / audit metadata without raw DB error text.

## 2. Origin allowlist PR

- [ ] 2.1 Update or confirm production origin allowlist generation from `PUBLIC_APP_URL`, `PRODUCTION_ALLOWED_HOSTS`, or an equivalent env-driven mechanism.
- [ ] 2.2 Ensure production rejects localhost, preview-only hosts, arbitrary Vercel preview hosts, and unconfigured domains unless explicitly configured.
- [ ] 2.3 Ensure preview / development hosts remain available only outside production or when explicitly configured as production hosts.
- [ ] 2.4 Update env examples and deployment docs only if implementation changes documented environment behavior.

## 3. Helper tests and lint PR

- [ ] 3.1 Add or confirm helper tests for pairing code TTL.
- [ ] 3.2 Add or confirm helper tests for self-pairing prevention.
- [ ] 3.3 Add or confirm helper tests for configured production hosts, rejected cross-origin requests, and direct GET behavior.
- [x] 3.4 Add or confirm helper tests for cron bearer parsing, timing-safe compare behavior, and LINE user ID reference generation.
- [ ] 3.5 Clean up lint warnings in the touched scope so `npm run lint` has no warning output.

## 4. Documentation and release verification

- [x] 4.1 Update `docs/releases/CHANGELOG.md` for implementation PRs without describing unimplemented work as complete.
- [ ] 4.2 Update `docs/engineering/TESTING.md`, `docs/security/SECURITY.md`, or deployment docs if implementation behavior changes those documents.
- [x] 4.3 Verify product boundaries: no medical advice, diagnosis, triage, treatment, dosage, urgency judgment, calendar feature, schema migration, UI refactor, deployment rearchitecture, or CareTaiwan positioning change.
- [x] 4.4 Run `npm run docs:check`.
- [x] 4.5 Run `npm run test` if the branch includes or confirms test coverage.
- [x] 4.6 Run `npm run lint`.
- [x] 4.7 Run `npm run build`.
