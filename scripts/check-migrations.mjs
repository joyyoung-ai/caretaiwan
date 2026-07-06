import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const forwardPath = "supabase/migrations/202607060001_create_care_calendar_tables.sql";
const rollbackPath = "supabase/migrations/202607060001_create_care_calendar_tables.down.sql";
const schemaPath = "supabase-schema.sql";

const errors = [];

function readRequired(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    errors.push(`missing ${path}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requirePattern(label, text, pattern) {
  if (!pattern.test(text)) {
    errors.push(`missing ${label}`);
  }
}

function requireAll(label, text, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) {
      errors.push(`missing ${label}: ${fragment}`);
    }
  }
}

const forward = readRequired(forwardPath);
const rollback = readRequired(rollbackPath);
const schema = readRequired(schemaPath);

requirePattern("forward transaction", forward, /\bbegin;\s*[\s\S]*\bcommit;/i);
requirePattern("rollback transaction", rollback, /\bbegin;\s*[\s\S]*\bcommit;/i);

for (const text of [forward, schema]) {
  requireAll("care event tables", text, [
    "create table if not exists care_events",
    "create table if not exists caregiver_leave_requests",
    "alter table care_events enable row level security",
    "alter table caregiver_leave_requests enable row level security",
  ]);

  requireAll("care event constraints", text, [
    "constraint care_events_type_check",
    "constraint care_events_status_check",
    "constraint care_events_time_range_check",
    "constraint care_events_medical_flag_check",
    "constraint caregiver_leave_reason_check",
    "constraint caregiver_leave_status_check",
    "constraint caregiver_leave_time_range_check",
  ]);

  requireAll("care event values", text, [
    "'medical_appointment'",
    "'rehab'",
    "'medication_pickup'",
    "'exam'",
    "'care_visit'",
    "'other'",
    "'scheduled'",
    "'done'",
    "'cancelled'",
    "'personal'",
    "'health'",
    "'family'",
    "'documents'",
    "'pending'",
    "'acknowledged'",
  ]);

  requireAll("care event indexes", text, [
    "idx_care_events_elder_starts",
    "idx_care_events_owner",
    "idx_care_events_status",
    "idx_caregiver_leave_elder_starts",
    "idx_caregiver_leave_caregiver",
    "idx_caregiver_leave_owner",
    "idx_caregiver_leave_status",
  ]);

  requireAll("data governance comments", text, [
    "資料保留期限跟照護紀錄一致",
    "使用者刪除請求",
    "不得用於薪資、扣款、排班或勞資爭議判定",
  ]);
}

requireAll("rollback drops only care calendar tables", rollback, [
  "drop table if exists caregiver_leave_requests",
  "drop table if exists care_events",
]);

if (errors.length > 0) {
  console.error("Migration check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Migration check passed.");
