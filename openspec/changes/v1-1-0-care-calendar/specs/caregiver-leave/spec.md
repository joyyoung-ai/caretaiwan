## ADDED Requirements

### Requirement: Caregiver can create leave request for paired elder
The system SHALL allow a signed-in caregiver to create leave requests only for elders paired to that caregiver.

#### Scenario: Caregiver creates leave request
- **WHEN** a signed-in caregiver submits a valid leave request for a paired elder
- **THEN** the system creates the request with `pending` status, the caregiver LINE user ID, owner LINE user ID, elder ID, time range, reason, note, and timestamps

#### Scenario: Unpaired caregiver cannot create leave request
- **WHEN** a signed-in caregiver submits a leave request for an elder not paired to them
- **THEN** the system rejects the request without writing a leave request

#### Scenario: Anonymous user cannot create leave request
- **WHEN** a request lacks a signed-in caregiver session
- **THEN** the system rejects the request without writing a leave request

### Requirement: Family can acknowledge caregiver-created leave request
The system SHALL allow a signed-in family owner to view and acknowledge leave requests for elders they own, but SHALL NOT allow family users to create leave requests on behalf of caregivers.

#### Scenario: Family views owned elder leave requests
- **WHEN** a signed-in family owner requests leave requests for an elder they own
- **THEN** the system returns leave requests for that elder without exposing unrelated elder data

#### Scenario: Family acknowledges leave request
- **WHEN** a signed-in family owner acknowledges a pending leave request for an elder they own
- **THEN** the system changes the status to `acknowledged` and records the acknowledgement time or equivalent audit metadata

#### Scenario: Family cannot create leave request for caregiver
- **WHEN** a signed-in family owner attempts to create a leave request on behalf of a caregiver
- **THEN** the system rejects the request

### Requirement: Leave requests avoid scheduling and payroll scope
The system SHALL treat caregiver leave as a record and notification flow, not as scheduling, staffing, payroll, deduction, or labor-dispute adjudication.

#### Scenario: Leave request does not calculate payroll
- **WHEN** a leave request is created, viewed, acknowledged, or cancelled
- **THEN** the system does not calculate salary, deductions, replacement staffing, or labor dispute outcomes

#### Scenario: Leave request copy avoids coercive language
- **WHEN** caregiver-facing or family-facing leave copy is shown
- **THEN** the copy describes request and acknowledgement status without framing the caregiver as being monitored or disciplined

### Requirement: Leave request fields and statuses are constrained
The system SHALL restrict leave request statuses to the supported first-version set, validate time ranges, and support both fixed reason options and free-text notes.

#### Scenario: Fixed reason option and free-text note are accepted
- **WHEN** a caregiver submits a valid leave request with a supported fixed reason option and an optional free-text note
- **THEN** the system stores both fields without treating them as payroll, deduction, or labor-dispute data

#### Scenario: Valid leave request time range is accepted
- **WHEN** a caregiver submits a leave request where `ends_at` is after `starts_at`
- **THEN** the system accepts the time range if all ownership and field checks pass

#### Scenario: Invalid leave request time range is rejected
- **WHEN** a caregiver submits a leave request where `ends_at` is not after `starts_at`
- **THEN** the system rejects the request without writing a leave request

#### Scenario: Unsupported leave status is rejected
- **WHEN** a request attempts to set a status outside `pending`, `acknowledged`, or `cancelled`
- **THEN** the system rejects the request without changing the leave request

### Requirement: Leave request data has retention and deletion boundaries
The system SHALL document retention, deletion, readable roles, writable roles, and right-to-erasure behavior before production use of caregiver leave requests. Leave request retention SHALL follow care record retention unless a later data governance change overrides it.

#### Scenario: Production readiness review checks leave data policy
- **WHEN** maintainers review the implementation for production readiness
- **THEN** docs describe leave request retention matching care records, deletion handling, backup handling, readable roles, writable roles, and whether audit metadata is redacted
