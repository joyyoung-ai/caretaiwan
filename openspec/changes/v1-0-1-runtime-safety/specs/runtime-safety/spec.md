## ADDED Requirements

### Requirement: Data retention cron responses redact LINE user IDs
The system SHALL NOT include full LINE user IDs in public responses, client logs, cron responses, LINE push logs, or audit metadata. Data retention cron responses MAY include a non-reversible short reference such as `lineUserRef` for troubleshooting.

#### Scenario: Warn stage response contains only redacted references
- **WHEN** an authorized data retention warn-stage cron request returns candidate results
- **THEN** each returned candidate reference is redacted and no full LINE user ID is present

#### Scenario: Delete stage response contains only redacted references
- **WHEN** an authorized data retention delete-stage cron request returns deletion results
- **THEN** each returned user reference is redacted and no full LINE user ID is present

#### Scenario: Audit metadata avoids raw identifiers
- **WHEN** data retention cron writes audit metadata for warn, delete, dry-run, or partial failure cases
- **THEN** metadata used for public inspection does not expose raw LINE user IDs, display names, DB error text, or free-text PII

### Requirement: Cron bearer tokens use safe comparison
The system SHALL validate data retention cron bearer tokens with a fixed-length, timing-safe comparison strategy after parsing the `Authorization: Bearer <token>` header.

#### Scenario: Missing cron secret fails closed
- **WHEN** `CRON_SECRET` is not configured
- **THEN** the cron endpoint rejects the request and does not run warn or delete work

#### Scenario: Wrong bearer token is rejected
- **WHEN** a request sends a missing, malformed, or incorrect bearer token
- **THEN** the cron endpoint returns an unauthorized response without revealing which part of the token failed

#### Scenario: Correct bearer token is accepted
- **WHEN** a request sends a correctly parsed bearer token matching `CRON_SECRET`
- **THEN** the cron endpoint may continue to stage validation and cloud availability checks

### Requirement: Data retention deletion preserves recovery order
The system SHALL delete data retention records in an order that avoids orphaned backups and reports partial failures without exposing raw database errors.

#### Scenario: Backup delete failure stops pairing delete
- **WHEN** deletion of `cloud_backups` fails for a LINE user
- **THEN** the system does not delete related `elder_pairings` for that user in the same attempt

#### Scenario: Pairing delete failure is reported as partial failure
- **WHEN** `cloud_backups` deletion succeeds but deleting related `elder_pairings` fails
- **THEN** the response and audit metadata record a redacted partial failure status without raw DB error text

#### Scenario: Successful delete removes backup before pairings
- **WHEN** both backup and pairing deletions succeed
- **THEN** the system records the backup deletion and pairing deletion count using redacted user references

### Requirement: Origin allowlist is deployment-configurable
The system SHALL derive allowed production origins from deployment configuration such as `PUBLIC_APP_URL`, `PRODUCTION_ALLOWED_HOSTS`, or an equivalent env-driven mechanism.

#### Scenario: Configured production host is allowed
- **WHEN** a request host and origin match a configured production host
- **THEN** same-origin checks allow the request to continue

#### Scenario: Unconfigured production host is rejected
- **WHEN** production receives a request from localhost, preview-only hosts, or an unconfigured host
- **THEN** same-origin checks reject the request

#### Scenario: Preview hosts remain limited to non-production
- **WHEN** preview or development environments use `PREVIEW_ALLOWED_HOSTS`, `VERCEL_URL`, localhost, or `127.0.0.1`
- **THEN** those hosts are allowed only outside production unless explicitly configured as production hosts

### Requirement: First helper tests cover runtime safety helpers
The system SHALL include helper-level automated tests for the first v1.0.1 runtime safety boundary before or with the implementation PRs.

#### Scenario: Pairing helper tests cover TTL and self-pairing prevention
- **WHEN** the test suite runs locally or in CI
- **THEN** pairing helper tests verify code expiry behavior and prevent a LINE user from pairing with their own elder

#### Scenario: Origin helper tests cover configured hosts
- **WHEN** the test suite runs locally or in CI
- **THEN** origin helper tests verify configured production hosts, rejected cross-origin requests, and direct GET behavior

#### Scenario: Cron helper tests cover token and redaction helpers
- **WHEN** the test suite runs locally or in CI
- **THEN** cron helper tests verify bearer parsing, timing-safe secret comparison behavior, and LINE user ID reference generation

### Requirement: Lint warnings stay actionable
The system SHALL keep `npm run lint` free of warnings for the v1.0.1 runtime safety scope.

#### Scenario: Lint is clean before release
- **WHEN** maintainers run the release verification commands for v1.0.1
- **THEN** `npm run lint` exits without warnings that would hide future runtime safety regressions

### Requirement: Runtime safety scope preserves product boundaries
The system SHALL NOT add medical advice, calendar functionality, schema migration, UI refactor, deployment rearchitecture, or CareTaiwan product-positioning changes as part of this runtime safety change.

#### Scenario: Runtime safety implementation excludes unrelated features
- **WHEN** maintainers review implementation PRs for this change
- **THEN** the diff only contains scoped runtime safety code, helper tests, and necessary documentation updates

#### Scenario: Medical content remains out of scope
- **WHEN** maintainers review any user-facing text touched by this change
- **THEN** the text does not provide diagnosis, triage, treatment, medication dosage, or urgency judgment
