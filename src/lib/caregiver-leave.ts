import { getSupabaseAdmin } from "./supabase-server";

export const LEAVE_REASONS = ["personal", "health", "family", "documents", "other"] as const;
export const LEAVE_STATUSES = ["pending", "acknowledged", "cancelled"] as const;

export type LeaveReason = (typeof LEAVE_REASONS)[number];
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export type ParsedLeaveRequestInput = {
  elderId: string;
  reason: LeaveReason;
  note: string | null;
  startsAt: string;
  endsAt: string;
};

export type CaregiverLeaveRequest = {
  id: number;
  elder_id: string;
  caregiver_line_user_id: string;
  owner_line_user_id: string;
  reason: LeaveReason;
  note: string | null;
  starts_at: string;
  ends_at: string;
  status: LeaveStatus;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaregiverLeaveRequestResponse = Omit<
  CaregiverLeaveRequest,
  "caregiver_line_user_id" | "owner_line_user_id"
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

export function isLeaveReason(raw: unknown): raw is LeaveReason {
  return LEAVE_REASONS.includes(raw as LeaveReason);
}

export function isLeaveStatus(raw: unknown): raw is LeaveStatus {
  return LEAVE_STATUSES.includes(raw as LeaveStatus);
}

export function parseLeaveRequestInput(
  raw: Record<string, unknown>
): { ok: true; value: ParsedLeaveRequestInput } | { ok: false; error: string } {
  const elderId = cleanText(raw.elderId, 100);
  if (!elderId) return { ok: false, error: "ELDER_REQUIRED" };
  if (!isLeaveReason(raw.reason)) return { ok: false, error: "REASON_INVALID" };
  const startsAt = cleanIso(raw.startsAt);
  if (!startsAt) return { ok: false, error: "STARTS_AT_INVALID" };
  const endsAt = cleanIso(raw.endsAt);
  if (!endsAt) return { ok: false, error: "ENDS_AT_INVALID" };
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "TIME_RANGE_INVALID" };
  }

  return {
    ok: true,
    value: {
      elderId,
      reason: raw.reason,
      note: cleanText(raw.note, 500),
      startsAt,
      endsAt,
    },
  };
}

export function toLeaveRequestResponse(leave: CaregiverLeaveRequest): CaregiverLeaveRequestResponse {
  return {
    id: leave.id,
    elder_id: leave.elder_id,
    reason: leave.reason,
    note: leave.note,
    starts_at: leave.starts_at,
    ends_at: leave.ends_at,
    status: leave.status,
    acknowledged_at: leave.acknowledged_at,
    created_at: leave.created_at,
    updated_at: leave.updated_at,
  };
}

export async function findLeavePairingForCaregiver(
  elderId: string,
  caregiverLineUserId: string
): Promise<{ ok: true; ownerLineUserId: string } | { ok: false; error: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("elder_pairings")
    .select("owner_line_user_id, paired_line_user_id")
    .eq("elder_id", elderId)
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data || data.paired_line_user_id !== caregiverLineUserId) return { ok: false, error: "NOT_PAIRED" };
  return { ok: true, ownerLineUserId: data.owner_line_user_id };
}

export async function createLeaveRequest(
  input: ParsedLeaveRequestInput & {
    caregiverLineUserId: string;
    ownerLineUserId: string;
  }
): Promise<{ ok: boolean; leave?: CaregiverLeaveRequest; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("caregiver_leave_requests")
    .insert({
      elder_id: input.elderId,
      caregiver_line_user_id: input.caregiverLineUserId,
      owner_line_user_id: input.ownerLineUserId,
      reason: input.reason,
      note: input.note,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      status: "pending",
    })
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "INSERT_FAILED" };
  return { ok: true, leave: data };
}

export async function listLeaveRequestsForElder(
  elderId: string,
  actorLineUserId: string
): Promise<{ ok: boolean; leaves?: CaregiverLeaveRequest[]; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data: pairing, error: pairingError } = await sb
    .from("elder_pairings")
    .select("owner_line_user_id, paired_line_user_id")
    .eq("elder_id", elderId)
    .maybeSingle();

  if (pairingError) return { ok: false, error: "DB_ERROR" };
  if (!pairing) return { ok: false, error: "NOT_PAIRED" };
  if (pairing.owner_line_user_id !== actorLineUserId && pairing.paired_line_user_id !== actorLineUserId) {
    return { ok: false, error: "NOT_PAIRED" };
  }

  const { data, error } = await sb
    .from("caregiver_leave_requests")
    .select("*")
    .eq("elder_id", elderId)
    .order("starts_at", { ascending: false });

  if (error) return { ok: false, error: "DB_ERROR" };
  return { ok: true, leaves: data ?? [] };
}

export async function acknowledgeLeaveRequest(
  leaveId: number,
  ownerLineUserId: string
): Promise<{ ok: boolean; leave?: CaregiverLeaveRequest; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("caregiver_leave_requests")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leaveId)
    .eq("owner_line_user_id", ownerLineUserId)
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
  return { ok: true, leave: data };
}
