## ADDED Requirements

### Requirement: Family can manage paired elder care events
The system SHALL allow a signed-in family owner to create, update, and cancel care events only for elders they own through `elder_pairings.owner_line_user_id`.

#### Scenario: Family creates a care event for owned elder
- **WHEN** a signed-in family owner submits a valid care event for an elder they own
- **THEN** the system creates the event with that `elder_id`, the owner LINE user ID, the creator LINE user ID, event type, time range, status, and medical-related flag

#### Scenario: Family cannot create an event for unowned elder
- **WHEN** a signed-in family owner submits a care event for an elder they do not own
- **THEN** the system rejects the request without creating an event

#### Scenario: Family cancels an owned care event
- **WHEN** a signed-in family owner cancels an event for an elder they own
- **THEN** the system marks the event as cancelled without deleting audit-relevant history

### Requirement: Caregiver can view paired elder future care events
The system SHALL allow a signed-in caregiver to view future care events only for elders paired to that caregiver through `elder_pairings.paired_line_user_id`.

#### Scenario: Caregiver views seven-day events
- **WHEN** a signed-in caregiver requests the next 7 days of events for a paired elder
- **THEN** the system returns non-cancelled events in chronological order for that elder only

#### Scenario: Caregiver views thirty-day events
- **WHEN** a signed-in caregiver requests the next 30 days of events for a paired elder
- **THEN** the system returns non-cancelled events in chronological order for that elder only

#### Scenario: Unpaired caregiver cannot view events
- **WHEN** a signed-in caregiver requests events for an elder not paired to them
- **THEN** the system rejects the request without returning event details

### Requirement: Care events use constrained event types and statuses
The system SHALL restrict care event type and status values to the supported first-version set.

#### Scenario: Supported event type is accepted
- **WHEN** a request uses one of `medical_appointment`, `rehab`, `medication_pickup`, `exam`, `care_visit`, or `other`
- **THEN** the system accepts the type if the rest of the request is valid

#### Scenario: Unsupported event type is rejected
- **WHEN** a request uses an event type outside the supported set
- **THEN** the system rejects the request without writing the event

#### Scenario: Unsupported event status is rejected
- **WHEN** a request attempts to set a status outside `scheduled`, `done`, or `cancelled`
- **THEN** the system rejects the request without changing the event

### Requirement: Medical-related event copy stays non-medical
The system SHALL treat medical-related care events as general schedule reminders and SHALL NOT provide diagnosis, triage, treatment, medication dosage, or urgency judgment.

#### Scenario: Medical-related event is labelled as general reminder
- **WHEN** an event is marked as medical-related
- **THEN** caregiver UI, family UI, and LINE reminder copy include the meaning of "此為一般日程提醒，非醫療指示" or an approved equivalent

#### Scenario: Medical-related event does not imply urgency
- **WHEN** an event type is `medical_appointment`, `rehab`, `medication_pickup`, or `exam`
- **THEN** the system does not rank urgency, recommend treatment, recommend dosage, or instruct the user to seek emergency care

### Requirement: Care event reminders are not guaranteed delivery
The system SHALL present LINE reminders as best-effort assistance and SHALL NOT describe reminders as guaranteed delivery.

#### Scenario: Reminder copy avoids delivery guarantees
- **WHEN** a care event reminder is shown in UI or sent through LINE
- **THEN** the copy does not state or imply guaranteed delivery

#### Scenario: Reminder failure is visible without PII leakage
- **WHEN** a reminder attempt fails
- **THEN** the system records a failure state suitable for troubleshooting without exposing raw LINE user IDs, free-text medical notes, photo URLs, or raw provider error text in public responses

### Requirement: Care event data has retention and deletion boundaries
The system SHALL document retention, deletion, readable roles, writable roles, and right-to-erasure behavior before production use of care events.

#### Scenario: Production readiness review checks care event data policy
- **WHEN** maintainers review the implementation for production readiness
- **THEN** docs describe care event retention, deletion handling, backup handling, readable roles, writable roles, and whether audit metadata is redacted
