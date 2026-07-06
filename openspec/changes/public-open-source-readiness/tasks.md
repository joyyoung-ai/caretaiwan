## 1. Scope and decisions

- [x] 1.1 Create a dedicated OpenSpec change for public open-source readiness.
- [x] 1.2 Confirm repository visibility will not be changed by this readiness change.
- [x] 1.3 Decide final open-source license before publishing.
- [x] 1.4 Decide public security reporting contact or private vulnerability channel.
- [x] 1.5 Decide whether first public release includes screenshots, and only use anonymized or synthetic data if screenshots are included.

## 2. Repository hygiene scan

- [x] 2.1 Run a current tree scan for secrets, private keys, database URLs, LINE tokens, LINE IDs, signed URLs, logs and real personal data.
- [x] 2.2 Run a git history scan for the same categories before repository visibility changes.
- [ ] 2.3 If any secret appears in history, rotate or revoke it before cleanup.
- [ ] 2.4 Redact or remove any real care records, names, phone numbers, addresses, photos, screenshots or logs.
- [x] 2.5 Document scan commands and final results in the release checklist without publishing sensitive findings.

## 3. Public documentation

- [x] 3.1 Update public README with project purpose, non-medical boundary, local development quick start and current development status.
- [x] 3.2 Add or update Traditional Chinese README for local contributors.
- [x] 3.3 Document local Postgres setup without requiring production credentials.
- [x] 3.4 Document VM local photo storage setup and limitations, including persistent volume, backup / restore drill and capacity monitoring.
- [x] 3.5 Document LINE integration as optional or mocked for local development.
- [x] 3.6 Update known limitations so open-source readers see single-node storage, notification delivery and development-stage caveats.

## 4. Governance and public issue safety

- [x] 4.1 Add or update `SECURITY.md` with reporting instructions and PII redaction rules.
- [x] 4.2 Add or update `CONTRIBUTING.md` with local setup, test commands and no-real-data contribution rules.
- [x] 4.3 Add or update `CODE_OF_CONDUCT.md` if the repository will accept external contributors.
- [x] 4.4 Add selected `LICENSE` file after owner decision.
- [x] 4.5 Add GitHub issue templates that warn users not to include names, phone numbers, LINE IDs, photos, logs with secrets, database URLs or raw provider errors.
- [x] 4.6 Add a security/private-reporting pointer in issue templates for vulnerabilities.

## 5. Release and visibility checklist

- [x] 5.1 Add a public release checklist covering docs, hygiene scan, CI, migrations, build, smoke test and maintainer approval.
- [x] 5.2 Include exact verification commands: `npm run docs:check`, `npm run migrations:check`, `npm run test`, `npm run lint`, `npm run build`, `npm run test:smoke` and `git diff --check`.
- [x] 5.3 Include manual checks for `.env*`, screenshots, fixtures, seed data and public issue templates.
- [x] 5.4 Require owner approval before changing GitHub repository visibility to public.
- [x] 5.5 Document immediate response steps if the repository is accidentally made public before readiness approval.

## 6. Verification

- [x] 6.1 Run `npm run docs:check`.
- [x] 6.2 Run `git diff --check`.
- [x] 6.3 Run broader test / lint / build gates once docs and templates are implemented.
- [x] 6.4 Push the readiness change after verification.
