## 1. Confirmed scope gates

- [x] 1.1 Confirm v1.1.0 uses "family and caregiver jointly manage care events".
- [x] 1.2 Confirm LINE reminder runtime is deferred and not included in v1.1.0.
- [x] 1.3 Confirm formal migration waits until production database strategy is decided.
- [x] 1.4 Confirm leave reason uses fixed options plus free-text notes.
- [x] 1.5 Confirm care event and leave request retention follows care records.
- [ ] 1.6 Review medical-related copy with product owner: it must remain a general schedule reminder and not become medical advice.
- [ ] 1.7 Review leave request copy with product owner: it must not frame caregivers as monitored or disciplined.

## 2. Data model and migration

- [x] 2.1 Draft `care_events` schema with elder ownership fields, event type, medical-related flag, title, time range, location, note, inert reminder fields, status, timestamps, indexes, and rollback notes.
- [x] 2.2 Draft `caregiver_leave_requests` schema with elder ownership fields, caregiver and owner LINE user IDs, time range, fixed reason option, free-text note, status, timestamps, indexes, and rollback notes.
- [x] 2.3 Document retention, deletion, readable roles, writable roles, backup handling, and right-to-erasure behavior for both new tables; retention follows care records.
- [ ] 2.4 After production database strategy is decided, turn the schema draft into a formal migration series and verify it in a disposable database before production use.

## 3. Care event API and tests

- [x] 3.1 Add failing tests for family owner and paired caregiver creating, updating, and cancelling care events for paired elders.
- [x] 3.2 Add failing tests for rejecting unpaired care event access, anonymous access, unsupported event types, unsupported statuses, and invalid time ranges.
- [x] 3.3 Add failing tests for caregiver 7-day and 30-day event reads scoped to paired elders only.
- [x] 3.4 Implement care event helpers and API routes with application-level ownership checks.
- [x] 3.5 Ensure public responses and audit metadata do not expose raw LINE user IDs, free-text medical notes, raw DB errors, or unrelated elder data.

## 4. Caregiver leave API and tests

- [x] 4.1 Add failing tests for caregiver-created leave requests on paired elders.
- [x] 4.2 Add failing tests for rejecting unpaired caregiver access, anonymous access, family-created leave requests, unsupported statuses, and invalid time ranges.
- [x] 4.3 Add failing tests for family owner listing and acknowledging leave requests for owned elders.
- [x] 4.4 Implement leave request helpers and API routes with application-level ownership checks.
- [x] 4.5 Ensure leave request responses and audit metadata do not expose unrelated elder data, raw LINE user IDs, or raw DB errors.

## 5. UI and copy

- [ ] 5.1 Add caregiver-facing event view for upcoming 7-day and 30-day care events.
- [ ] 5.2 Add family-facing care event create, edit, and cancel flow using constrained event types and statuses.
- [ ] 5.3 Add caregiver-facing leave request create flow.
- [ ] 5.4 Add family-facing leave request list and acknowledgement flow.
- [x] 5.5 Update user-facing copy and i18n entries; medical-related reminders must include the approved non-medical disclaimer.
- [x] 5.6 Keep UI changes scoped; do not introduce a broad design system or unrelated navigation refactor.

## 6. LINE reminder slice

- [x] 6.1 Keep `remind_at` or equivalent data fields inert in v1.1.0.
- [x] 6.2 Document that LINE reminder runtime is deferred and reminders are not active yet.
- [x] 6.3 Do not implement scheduler, retry, LINE push, or reminder failure logging in v1.1.0.
- [ ] 6.4 Open a follow-up change before implementing reminder runtime.

## 7. Documentation and release verification

- [x] 7.1 Update `docs/product/USER_REQUIREMENTS.md` with final v1.1.0 scope decisions.
- [x] 7.2 Update `docs/product/ROADMAP.md`, `docs/engineering/TESTING.md`, `docs/security/SECURITY.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/operations/RUNBOOK.md`, and `docs/releases/CHANGELOG.md` where behavior changes.
- [x] 7.3 Verify product boundaries: no diagnosis, triage, treatment, dosage, urgency judgment, payroll, scheduling, labor-dispute decision, EMR / HIS, or long-term care ERP behavior.
- [x] 7.4 Run `npm run docs:check`.
- [x] 7.5 Run `npm run test`.
- [x] 7.6 Run `npm run lint`.
- [x] 7.7 Run `npm run build`.
- [x] 7.8 Run `npm run test:smoke`.
- [x] 7.9 Run `npm run test:e2e`.
