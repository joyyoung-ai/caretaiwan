import { getSupabaseAdmin } from "./supabase-server";

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

export async function findCareEventPairing(
  elderId: string,
  actorLineUserId: string
): Promise<{ ok: true; ownerLineUserId: string; role: "owner" | "caregiver" } | { ok: false; error: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("elder_pairings")
    .select("owner_line_user_id, paired_line_user_id")
    .eq("elder_id", elderId)
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_PAIRED" };
  if (data.owner_line_user_id === actorLineUserId) {
    return { ok: true, ownerLineUserId: data.owner_line_user_id, role: "owner" };
  }
  if (data.paired_line_user_id === actorLineUserId) {
    return { ok: true, ownerLineUserId: data.owner_line_user_id, role: "caregiver" };
  }
  return { ok: false, error: "NOT_PAIRED" };
}
