## ADDED Requirements

### Requirement: Public visibility is gated by maintainer approval
The system maintainers SHALL NOT change the repository visibility to public until the open-source readiness checklist is complete and explicitly approved.

#### Scenario: Readiness checklist is incomplete
- **WHEN** any public readiness checklist item remains incomplete
- **THEN** maintainers keep the repository private and continue remediation

#### Scenario: Maintainer approves public visibility
- **WHEN** all readiness checklist items pass and the owner approves publication
- **THEN** maintainers may change repository visibility using the documented release process

#### Scenario: Repository is accidentally made public early
- **WHEN** the repository becomes public before readiness approval
- **THEN** maintainers immediately make it private again, rotate exposed secrets, review public exposure and record an internal incident note

### Requirement: Repository is scanned for secrets and personal data before publication
The repository SHALL be scanned across the current tree and git history before publication for secrets, identifiers and personal data.

#### Scenario: Current tree scan finds no sensitive data
- **WHEN** the current tree scan completes without findings
- **THEN** the release checklist records the scan command, date and non-sensitive result summary

#### Scenario: Git history scan finds a secret
- **WHEN** git history scan finds an access token, private key, database URL, LINE credential or signing secret
- **THEN** maintainers rotate or revoke the secret before cleanup and before repository publication

#### Scenario: Scan finds care-related personal data
- **WHEN** scan finds real names, phone numbers, addresses, LINE IDs, photos, signed URLs, raw logs or care records
- **THEN** maintainers remove or anonymize the data before repository publication

### Requirement: Public documentation states care and medical boundaries
Public documentation SHALL state that CareTaiwan is a care coordination system and not a medical advice, diagnosis, treatment, triage, emergency or guaranteed delivery system.

#### Scenario: External developer reads README
- **WHEN** an external developer opens the public README
- **THEN** the README explains the project purpose, development status and non-medical boundary before production setup details

#### Scenario: Medical-related reminder copy appears in public docs
- **WHEN** public docs include medical-related reminder examples
- **THEN** the copy is natural Traditional Chinese and states that the reminder is a general schedule reminder, not medical instruction

#### Scenario: Public docs describe notification delivery
- **WHEN** public docs describe LINE reminders or notifications
- **THEN** the docs state that delivery can fail or be delayed and is not guaranteed

### Requirement: Local quick start does not require production services
The public quick start SHALL allow basic local development without production LINE credentials, production VM storage or real care data.

#### Scenario: Developer starts local environment
- **WHEN** a developer follows the quick start
- **THEN** they can run basic local checks with local Postgres, local photo storage path and mocked or disabled LINE integration

#### Scenario: Developer lacks LINE credentials
- **WHEN** a developer does not have LINE channel credentials
- **THEN** the quick start still provides a supported local path for tests and non-LINE development

#### Scenario: Developer configures local photo storage
- **WHEN** a developer configures local photo storage
- **THEN** docs explain the local path, signing secret requirement and the difference between local development storage and production VM persistent storage

### Requirement: Public issues and security reports avoid sensitive disclosure
The repository SHALL guide public reporters away from posting personal data, secrets, LINE identifiers, raw provider errors or care records in public issues.

#### Scenario: User opens a bug report template
- **WHEN** a user creates a public bug report
- **THEN** the template instructs them to redact names, phone numbers, addresses, LINE IDs, tokens, database URLs, photo URLs, signed URLs and raw logs

#### Scenario: User reports a vulnerability
- **WHEN** a user needs to report a security vulnerability
- **THEN** public docs direct them to the private security reporting channel instead of a public issue

#### Scenario: Maintainer asks for logs
- **WHEN** a maintainer asks for diagnostic logs in a public issue
- **THEN** the requested logs must be redacted and must not include secrets, personal data, raw LINE provider responses or complete audit records

### Requirement: Production limitations are visible before publication
Public docs SHALL describe current production limitations before the repository is published.

#### Scenario: Reader reviews deployment notes
- **WHEN** a reader reviews deployment documentation
- **THEN** the docs state that VM local photo storage is single-node oriented and requires persistent volume, backup / restore drill, permissions and capacity monitoring

#### Scenario: Reader reviews database notes
- **WHEN** a reader reviews database documentation
- **THEN** the docs state that Postgres migrations must be tested on disposable or staging databases before production

#### Scenario: Reader reviews development status
- **WHEN** a reader reviews the project status
- **THEN** the docs distinguish completed foundations from features still under development or pending owner decisions
