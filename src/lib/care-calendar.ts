import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

export const CARE_EVENT_TYPES = [
  "medical_appointment",
  "rehab",
  "medication_pickup",
  "exam",
  "care_visit",
  "other",
] as const;

export const CARE_EVENT_STATUSES = ["scheduled", "done", "cancelled"] as const;

export type CareEventType = (typeof CARE_EVENT_TYPES)[number];
export type CareEventStatus = (typeof CARE_EVENT_STATUSES)[number];

export type ParsedCareEventInput = {
  elderId: string;
  type: CareEventType;
  isMedicalRelated: boolean;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  note: string | null;
  remindAt: string | null;
};

export type CareEvent = {
  id: number;
  elder_id: string;
  owner_line_user_id: string;
  created_by_line_user_id: string;
  updated_by_line_user_id: string | null;
  type: CareEventType;
  is_medical_related: boolean;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  note: string | null;
  remind_at: string | null;
  status: CareEventStatus;
  created_at: string;
  updated_at: string;
};

export type CareEventResponse = Omit<
  CareEvent,
  "owner_line_user_id" | "created_by_line_user_id" | "updated_by_line_user_id"
>;

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanIso(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isCareEventType(raw: unknown): raw is CareEventType {
  return CARE_EVENT_TYPES.includes(raw as CareEventType);
}

export function isCareEventStatus(raw: unknown): raw is CareEventStatus {
  return CARE_EVENT_STATUSES.includes(raw as CareEventStatus);
}

export function isMedicalCareEventType(type: CareEventType): boolean {
  return type === "medical_appointment" || type === "rehab" || type === "medication_pickup" || type === "exam";
}

export function parseCareEventInput(
  raw: Record<string, unknown>
): { ok: true; value: ParsedCareEventInput } | { ok: false; error: string } {
  const elderId = cleanText(raw.elderId, 100);
  if (!elderId) return { ok: false, error: "ELDER_REQUIRED" };
  if (!isCareEventType(raw.type)) return { ok: false, error: "TYPE_INVALID" };
  const title = cleanText(raw.title, 100);
  if (!title) return { ok: false, error: "TITLE_REQUIRED" };
  const startsAt = cleanIso(raw.startsAt);
  if (!startsAt) return { ok: false, error: "STARTS_AT_INVALID" };
  const endsAt = cleanIso(raw.endsAt) ?? null;
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "TIME_RANGE_INVALID" };
  }

  return {
    ok: true,
    value: {
      elderId,
      type: raw.type,
      isMedicalRelated: isMedicalCareEventType(raw.type),
      title,
      startsAt,
      endsAt,
      location: cleanText(raw.location, 200),
      note: cleanText(raw.note, 500),
      remindAt: cleanIso(raw.remindAt) ?? null,
    },
  };
}

export function toCareEventResponse(event: CareEvent): CareEventResponse {
  return {
    id: event.id,
    elder_id: event.elder_id,
    type: event.type,
    is_medical_related: event.is_medical_related,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    note: event.note,
    remind_at: event.remind_at,
    status: event.status,
    created_at: event.created_at,
    updated_at: event.updated_at,
  };
}

export async function findCareEventPairing(
  elderId: string,
  actorLineUserId: string
): Promise<{ ok: true; ownerLineUserId: string; role: "owner" | "caregiver" } | { ok: false; error: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const [pairing] = await query<{
      owner_line_user_id: string;
      paired_line_user_id: string | null;
    }>(
      `select owner_line_user_id, paired_line_user_id
       from elder_pairings
       where elder_id = $1
       limit 1`,
      [elderId]
    );

    if (!pairing) return { ok: false, error: "NOT_PAIRED" };
    if (pairing.owner_line_user_id === actorLineUserId) {
      return { ok: true, ownerLineUserId: pairing.owner_line_user_id, role: "owner" };
    }
    if (pairing.paired_line_user_id === actorLineUserId) {
      return { ok: true, ownerLineUserId: pairing.owner_line_user_id, role: "caregiver" };
    }
    return { ok: false, error: "NOT_PAIRED" };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

export async function createCareEvent(
  input: ParsedCareEventInput & {
    actorLineUserId: string;
    ownerLineUserId: string;
  }
): Promise<{ ok: boolean; event?: CareEvent; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const [event] = await query<CareEvent>(
      `insert into care_events (
         elder_id,
         owner_line_user_id,
         created_by_line_user_id,
         updated_by_line_user_id,
         type,
         is_medical_related,
         title,
         starts_at,
         ends_at,
         location,
         note,
         remind_at,
         status
       ) values ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled')
       returning *`,
      [
        input.elderId,
        input.ownerLineUserId,
        input.actorLineUserId,
        input.type,
        input.isMedicalRelated,
        input.title,
        input.startsAt,
        input.endsAt,
        input.location,
        input.note,
        input.remindAt,
      ]
    );

    if (!event) return { ok: false, error: "INSERT_FAILED" };
    return { ok: true, event };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

export async function listCareEventsForElder(
  elderId: string,
  actorLineUserId: string,
  rangeDays = 7
): Promise<{ ok: boolean; events?: CareEvent[]; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  const pairing = await findCareEventPairing(elderId, actorLineUserId);
  if (!pairing.ok) return { ok: false, error: pairing.error };

  const now = new Date();
  const end = new Date(now.getTime() + Math.min(Math.max(rangeDays, 1), 30) * 24 * 60 * 60 * 1000);
  try {
    const events = await query<CareEvent>(
      `select *
       from care_events
       where elder_id = $1
         and status <> 'cancelled'
         and starts_at >= $2
         and starts_at <= $3
       order by starts_at asc`,
      [elderId, now.toISOString(), end.toISOString()]
    );

    return { ok: true, events };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

export async function updateCareEvent(input: {
  eventId: number;
  actorLineUserId: string;
  title?: string;
  startsAt?: string;
  endsAt?: string | null;
  location?: string | null;
  note?: string | null;
  status?: CareEventStatus;
}): Promise<{ ok: boolean; event?: CareEvent; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  let event: { id: number; elder_id: string; starts_at: string; ends_at: string | null } | undefined;
  try {
    [event] = await query<{ id: number; elder_id: string; starts_at: string; ends_at: string | null }>(
      `select id, elder_id, starts_at, ends_at
       from care_events
       where id = $1
       limit 1`,
      [input.eventId]
    );
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
  if (!event) return { ok: false, error: "NOT_FOUND" };

  const pairing = await findCareEventPairing(event.elder_id, input.actorLineUserId);
  if (!pairing.ok) return { ok: false, error: pairing.error };

  const mergedStartsAt = input.startsAt ?? event.starts_at;
  const mergedEndsAt = input.endsAt === undefined ? event.ends_at : input.endsAt;
  if (
    mergedStartsAt &&
    mergedEndsAt &&
    new Date(mergedEndsAt).getTime() <= new Date(mergedStartsAt).getTime()
  ) {
    return { ok: false, error: "TIME_RANGE_INVALID" };
  }

  const values: unknown[] = [input.eventId];
  const assignments: string[] = [];
  const addAssignment = (column: string, value: unknown) => {
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  };

  addAssignment("updated_by_line_user_id", input.actorLineUserId);
  addAssignment("updated_at", new Date().toISOString());
  if (input.title !== undefined) addAssignment("title", input.title.slice(0, 100));
  if (input.startsAt !== undefined) addAssignment("starts_at", input.startsAt);
  if (input.endsAt !== undefined) addAssignment("ends_at", input.endsAt);
  if (input.location !== undefined) addAssignment("location", input.location?.slice(0, 200) ?? null);
  if (input.note !== undefined) addAssignment("note", input.note?.slice(0, 500) ?? null);
  if (input.status !== undefined) addAssignment("status", input.status);

  try {
    const [updated] = await query<CareEvent>(
      `update care_events
       set ${assignments.join(", ")}
       where id = $1
       returning *`,
      values
    );

    if (!updated) return { ok: false, error: "UPDATE_FAILED" };
    return { ok: true, event: updated };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}
