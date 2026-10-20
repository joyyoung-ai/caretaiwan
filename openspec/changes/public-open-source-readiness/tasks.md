## 1. Scope and decisions

- [x] 1.1 Create a dedicated OpenSpec change for public open-source readiness.
- [x] 1.2 Confirm repository visibility will not be changed by this readiness change.
- [x] 1.3 Decide final open-source license before publishing.
- [x] 1.4 Decide public security reporting contact or private vulnerability channel.
- [x] 1.5 Decide whether first public release includes screenshots, and only use anonymized or synthetic data if screenshots are included.

## 2. Repository hygiene scan

- [x] 2.1 Run a current tree scan for secrets, private keys, database URLs, LINE tokens, LINE IDs, signed URLs, logs and real personal data.
- [x] 2.2 Run a git history scan for the same categories before repository visibility changes.
- [x] 2.3 If any secret appears in history, rotate or revoke it before cleanup. Not applicable after the 2026-10-20 Gitleaks and manual review: no real credential was confirmed, so no rotation or history rewrite was needed.
- [x] 2.4 Review and redact any real care data before publication. The embedded demo declares synthetic fixtures; the three tracked PNGs were visually checked as app icons. No real care records or user photos were found in this review.
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

## 7. 2026-10-20 release gate remediation

- [x] 7.1 Update vulnerable dependencies within the existing Next.js 16, React 19 and Auth.js v5 lines; use npm 11.21.1 locally, in CI and in Docker. Full audit: zero findings. Preserve Next.js lint rules and verify its scoped glob replacement through five consumer tests.
- [x] 7.2 Make pairing tests independent of the wall clock and clear queued mock responses between cases, while retaining expiry and ownership guards.
- [x] 7.3 Align the Docker example with the declared Node.js / npm toolchain without changing the deployment architecture.
- [x] 7.4 Re-scan the current tree and reachable Git history with Gitleaks 8.30.1; review synthetic demo data and app icons without introducing real care records.
- [x] 7.5 Pass the complete local release gate: 199 tests, eight browser tests, audit, lint, docs, lockfile, migration check, build and smoke. Docker build/runtime and isolated Postgres forward/rollback/reapply also passed.
- [x] 7.6 Correct the public cutover checklist for GitHub plan restrictions and prepare branch protection policy. Visibility remains private; actual publication still requires maintainer approval and immediate cutover configuration.
