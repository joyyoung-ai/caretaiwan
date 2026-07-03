## 1. Scope and review gates

- [ ] 1.1 Confirm whether v1.1.0 is "family creates, caregiver views" or "family and caregiver jointly manage care events"; update `design.md` open questions after the decision.
- [ ] 1.2 Confirm whether LINE reminder runtime is included in v1.1.0 or deferred to a follow-up change.
- [ ] 1.3 Confirm database migration route: create formal `supabase/migrations/` series or keep a short-term idempotent schema draft until production DB strategy is selected.
- [ ] 1.4 Review medical-related copy with product owner: it must remain a general schedule reminder and not become medical advice.
- [ ] 1.5 Review leave request copy with product owner: it must not frame caregivers as monitored or disciplined.

## 2. Data model and migration

- [ ] 2.1 Add `care_events` schema with elder ownership fields, event type, medical-related flag, title, time range, location, note, reminder fields, status, timestamps, indexes, and rollback notes.
- [ ] 2.2 Add `caregiver_leave_requests` schema with elder ownership fields, caregiver and owner LINE user IDs, time range, reason, note, status, timestamps, indexes, and rollback notes.
- [ ] 2.3 Document retention, deletion, readable roles, writable roles, backup handling, and right-to-erasure behavior for both new tables.
- [ ] 2.4 Verify the schema in a disposable database before production use.

## 3. Care event API and tests

- [ ] 3.1 Add failing tests for family owner creating, updating, and cancelling care events for owned elders.
- [ ] 3.2 Add failing tests for rejecting unowned elder care event access, anonymous access, unsupported event types, unsupported statuses, and invalid time ranges.
- [ ] 3.3 Add failing tests for caregiver 7-day and 30-day event reads scoped to paired elders only.
- [ ] 3.4 Implement care event helpers and API routes with application-level ownership checks.
- [ ] 3.5 Ensure public responses and audit metadata do not expose raw LINE user IDs, free-text medical notes, raw DB errors, or unrelated elder data.

## 4. Caregiver leave API and tests

- [ ] 4.1 Add failing tests for caregiver-created leave requests on paired elders.
- [ ] 4.2 Add failing tests for rejecting unpaired caregiver access, anonymous access, family-created leave requests, unsupported statuses, and invalid time ranges.
- [ ] 4.3 Add failing tests for family owner listing and acknowledging leave requests for owned elders.
- [ ] 4.4 Implement leave request helpers and API routes with application-level ownership checks.
- [ ] 4.5 Ensure leave request responses and audit metadata do not expose unrelated elder data, raw LINE user IDs, or raw DB errors.

## 5. UI and copy

- [ ] 5.1 Add caregiver-facing event view for upcoming 7-day and 30-day care events.
- [ ] 5.2 Add family-facing care event create, edit, and cancel flow using constrained event types and statuses.
- [ ] 5.3 Add caregiver-facing leave request create flow.
- [ ] 5.4 Add family-facing leave request list and acknowledgement flow.
- [ ] 5.5 Update user-facing copy and i18n entries; medical-related reminders must include the approved non-medical disclaimer.
- [ ] 5.6 Keep UI changes scoped; do not introduce a broad design system or unrelated navigation refactor.

## 6. LINE reminder slice

- [ ] 6.1 If reminder runtime is approved for v1.1.0, define scheduler trigger, reminder window, recipient rules, retry behavior, and failure states before implementation.
- [ ] 6.2 Add tests for reminder eligibility, medical-related disclaimer copy, non-guaranteed delivery copy, failure logging, and PII redaction.
- [ ] 6.3 Implement reminder sending only after tests and reminder rules are approved.
- [ ] 6.4 If reminder runtime is deferred, keep `remind_at` or equivalent data fields inert and document that reminders are not active yet.

## 7. Documentation and release verification

- [ ] 7.1 Update `docs/product/USER_REQUIREMENTS.md` with final v1.1.0 scope decisions.
- [ ] 7.2 Update `docs/product/ROADMAP.md`, `docs/engineering/TESTING.md`, `docs/security/SECURITY.md`, `docs/governance/KNOWN_LIMITATIONS.md`, `docs/operations/RUNBOOK.md`, and `docs/releases/CHANGELOG.md` where behavior changes.
- [ ] 7.3 Verify product boundaries: no diagnosis, triage, treatment, dosage, urgency judgment, payroll, scheduling, labor-dispute decision, EMR / HIS, or long-term care ERP behavior.
- [ ] 7.4 Run `npm run docs:check`.
- [ ] 7.5 Run `npm run test`.
- [ ] 7.6 Run `npm run lint`.
- [ ] 7.7 Run `npm run build`.
- [ ] 7.8 Run `npm run test:smoke`.
- [ ] 7.9 Run `npm run test:e2e`.
