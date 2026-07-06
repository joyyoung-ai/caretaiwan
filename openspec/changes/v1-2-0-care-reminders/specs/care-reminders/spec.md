## ADDED Requirements

### Requirement: Due care event reminders are sent by server-side runtime
The system SHALL send LINE reminders only from a server-side cron, worker, or equivalent trusted runtime after validating the scheduler secret.

#### Scenario: Cron sends due reminder
- **WHEN** a care event has a reminder due at or before the runtime clock and the event is not cancelled
- **THEN** the server-side runtime claims the reminder and attempts to send the constrained LINE reminder

#### Scenario: Client cannot send reminder directly
- **WHEN** a browser client or unauthenticated request attempts to trigger reminder delivery
- **THEN** the system rejects the request without calling LINE push

#### Scenario: Missing cron secret is rejected
- **WHEN** the reminder runtime request lacks the required cron secret
- **THEN** the system rejects the request without selecting or sending reminders

### Requirement: Reminder recipients are explicitly selected
The system SHALL support caregiver, family owner, and bound LINE group reminder recipients, but SHALL NOT default to sending every reminder to all recipient types.

#### Scenario: Reminder targets caregiver
- **WHEN** a reminder is configured for the paired caregiver
- **THEN** the runtime sends only to the paired caregiver LINE user ID for that elder

#### Scenario: Reminder targets family owner
- **WHEN** a reminder is configured for the family owner
- **THEN** the runtime sends only to the owner LINE user ID for that elder

#### Scenario: Reminder targets bound LINE group
- **WHEN** a reminder is configured for a bound LINE group
- **THEN** the runtime sends only to the stored group destination after group reminder consent has been confirmed

#### Scenario: Recipient is not selected
- **WHEN** a care event has `remind_at` but no reminder recipient target
- **THEN** the runtime does not send a LINE reminder

### Requirement: Reminder claim prevents duplicate delivery
The system SHALL claim due reminders before sending so two runtime workers do not send the same reminder at the same time.

#### Scenario: Reminder is already claimed
- **WHEN** a reminder has an active claim that has not expired
- **THEN** another worker does not send that reminder

#### Scenario: Claim expires after worker crash
- **WHEN** a reminder was claimed but not completed before the claim TTL expires
- **THEN** a later runtime pass may retry the reminder if attempts remain

#### Scenario: Retry settings are configurable
- **WHEN** reminder runtime reads retry settings
- **THEN** max attempts, retry delay, and claim TTL come from system parameters with conservative defaults

#### Scenario: Cancelled event is not reminded
- **WHEN** a care event is cancelled before its reminder is sent
- **THEN** the reminder runtime does not send a LINE reminder for that event

### Requirement: Reminder delivery state is persisted with redacted failure details
The system SHALL persist reminder status, attempt count, last attempt time and coarse failure code without storing raw provider errors or unnecessary PII.

#### Scenario: Reminder send succeeds
- **WHEN** LINE push succeeds for a claimed reminder
- **THEN** the system marks the reminder as sent and records the sent time

#### Scenario: Reminder send fails with retryable error
- **WHEN** LINE push fails with a retryable error and attempts remain
- **THEN** the system records a coarse error code and leaves the reminder eligible for later retry

#### Scenario: Reminder send permanently fails
- **WHEN** LINE push fails after max attempts or with a non-retryable error
- **THEN** the system records failure status and a coarse error code without raw LINE user ID, raw provider response, token, note text or unrelated elder data

#### Scenario: User sees coarse failure reason
- **WHEN** a reminder fails and the user views reminder status
- **THEN** the system shows only a coarse reason such as notification disabled, LINE unavailable, system setting incomplete, expired, or unknown

### Requirement: Reminder copy stays short and non-medical
The system SHALL send reminder copy as a general schedule reminder and SHALL NOT include diagnosis, triage, treatment, medication dosage, urgency judgment or guaranteed delivery language.

#### Scenario: Medical-related reminder includes disclaimer
- **WHEN** a reminder is for a medical-related event
- **THEN** the message includes a natural Traditional Chinese disclaimer such as "這是一般日程提醒，不是醫療指示。實際照護或用藥請依醫師、護理師或藥師說明。"

#### Scenario: Reminder omits free-text note by default
- **WHEN** a care event has a free-text note
- **THEN** the first-version reminder message does not include the note text

#### Scenario: Reminder avoids guaranteed delivery language
- **WHEN** reminder copy is generated
- **THEN** the copy does not state or imply that LINE delivery is guaranteed

#### Scenario: General reminder includes delivery caveat
- **WHEN** reminder copy is generated
- **THEN** the copy states or implies that LINE notification may be delayed or missed because of network or user settings

### Requirement: Reminder runtime has production operation boundaries
The system SHALL document cron schedule, manual dry-run, retry handling, token rotation verification, retention, deletion and right-to-erasure behavior before production reminder runtime is enabled.

#### Scenario: Production readiness review checks reminder operations
- **WHEN** maintainers review the implementation for production readiness
- **THEN** docs describe reminder cron schedule, dry-run command, failure handling, log redaction, retention, deletion and token rotation checks
