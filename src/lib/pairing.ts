// 配對碼產生 + Supabase 操作（家屬↔看護透過 elder 配對）
// Post-flip 角色語意:
//   owner_line_user_id = 家屬(資料擁有者,推播接收方)
//   paired_line_user_id = 看護(配對加入者,記錄發送方)
import crypto from "crypto";
import { getSupabaseAdmin } from "./supabase-server";

// 6 位數英文+數字配對碼（去除易混淆的 0/O/1/I）
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    // crypto.randomInt 是密碼學安全亂數（CSPRNG），取代 Math.random()
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

// 配對碼有效時間：24 小時內必須完成配對
export const PAIRING_TTL_MS = 24 * 60 * 60 * 1000;

export type Pairing = {
  elder_id: string;
  pairing_code: string;
  paired_line_user_id: string | null;
  paired_at: string | null;
  owner_line_user_id: string;
  display_name: string | null;
  expires_at: string | null;
  created_at: string;
  // 家族 LINE 群組推播
  notify_group_id?: string | null;
  notify_group_bound_at?: string | null;
  notify_group_photo?: boolean | null;
  group_pairing_code?: string | null;
  group_pairing_expires_at?: string | null;
};

export function pairingExpiresAt(now = Date.now()): string {
  return new Date(now + PAIRING_TTL_MS).toISOString();
}

export function isPairingExpired(p: { expires_at?: string | null }, now = Date.now()): boolean {
  if (!p.expires_at) return false;
  return new Date(p.expires_at).getTime() < now;
}

export function isSelfPairing(
  ownerLineUserId: string,
  pairedLineUserId: string
): boolean {
  return ownerLineUserId === pairedLineUserId;
}

/** Get or create pairing for an elder owned by a family user (post-flip) */
export async function ensurePairing(
  elderId: string,
  ownerLineUserId: string,
  displayName: string | null
): Promise<{ ok: boolean; code?: string; pairing?: Pairing; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  // Existing? — 必須同時驗 owner，防止 A 帶 B 的 elderId 拿到 B 的配對碼
  const { data: existing } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId)
    .maybeSingle();

  if (existing) {
    // Already bound to a family member — return as-is (no re-bind)
    if (existing.paired_line_user_id) {
      return { ok: true, code: existing.pairing_code, pairing: existing };
    }
    // Not bound yet: refresh code if expired
    if (isPairingExpired(existing)) {
      const newCode = await generateUniqueCode(sb);
      const { data: refreshed, error: refreshErr } = await sb
        .from("elder_pairings")
        .update({
          pairing_code: newCode,
          expires_at: pairingExpiresAt(),
        })
        .eq("elder_id", elderId)
        .select()
        .single();
      if (refreshErr) return { ok: false, error: "DB_ERROR" };
      return { ok: true, code: newCode, pairing: refreshed };
    }
    return { ok: true, code: existing.pairing_code, pairing: existing };
  }

  // New pairing
  const code = await generateUniqueCode(sb);
  const { data, error } = await sb
    .from("elder_pairings")
    .insert({
      elder_id: elderId,
      pairing_code: code,
      owner_line_user_id: ownerLineUserId,
      display_name: displayName,
      expires_at: pairingExpiresAt(),
    })
    .select()
    .single();

  if (error) return { ok: false, error: "DB_ERROR" };
  return { ok: true, code, pairing: data };
}

async function generateUniqueCode(
  sb: ReturnType<typeof getSupabaseAdmin>
): Promise<string> {
  if (!sb) return generatePairingCode();
  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    const { data: collision } = await sb
      .from("elder_pairings")
      .select("elder_id")
      .eq("pairing_code", code)
      .maybeSingle();
    if (!collision) break;
    code = generatePairingCode();
  }
  return code;
}

/** Look up pairing by code (used when family sends code via LINE Bot) */
export async function findPairingByCode(code: string): Promise<Pairing | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("pairing_code", code.toUpperCase().trim())
    .maybeSingle();
  if (!data) return null;
  if (isPairingExpired(data)) return null;
  return data;
}

/**
 * Bind family LINE userId to a pairing.
 * Security: only succeeds if NOT already bound (防綁架) and NOT expired.
 */
export async function bindFamily(
  pairingCode: string,
  familyLineUserId: string
): Promise<{ ok: boolean; pairing?: Pairing; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const code = pairingCode.toUpperCase().trim();
  const existing = await findPairingByCode(code);
  if (!existing) return { ok: false, error: "ALREADY_PAIRED_OR_EXPIRED" };
  if (isSelfPairing(existing.owner_line_user_id, familyLineUserId)) {
    return { ok: false, error: "SELF_PAIRING_NOT_ALLOWED" };
  }
  if (existing.paired_line_user_id) {
    return { ok: false, error: "ALREADY_PAIRED_OR_EXPIRED" };
  }

  // Conditional update — Postgres-level guard so two concurrent requests can't both bind
  const { data, error } = await sb
    .from("elder_pairings")
    .update({
      paired_line_user_id: familyLineUserId,
      paired_at: new Date().toISOString(),
    })
    .eq("pairing_code", code)
    .neq("owner_line_user_id", familyLineUserId) // 家屬不能用同一 LINE 帳號把自己綁成看護
    .is("paired_line_user_id", null) // 防綁架：必須仍是未配對狀態
    .gt("expires_at", new Date().toISOString()) // 過期不能配對
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "ALREADY_PAIRED_OR_EXPIRED" };
  return { ok: true, pairing: data };
}

/** Get all pairings where this LINE user is the data owner (家屬端). */
export async function getPairingsByOwner(
  ownerLineUserId: string
): Promise<Pairing[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("owner_line_user_id", ownerLineUserId);
  return data ?? [];
}

/**
 * 家屬解除某個老人的看護配對(只清 paired 欄位,保留 pairing 紀錄)。
 * Security: 只有 owner 本人才能解綁(WHERE owner_line_user_id 必須匹配)。
 * 解綁後家屬可重新「產生配對碼」給新看護。
 */
export async function unbindCaregiver(
  elderId: string,
  ownerLineUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("elder_pairings")
    .update({
      paired_line_user_id: null,
      paired_at: null,
      // 同時刷新 pairing_code 和 expires_at,讓家屬重新「產生配對碼」時拿到新碼
      expires_at: new Date(Date.now() - 1).toISOString(), // 立刻過期,觸發 ensurePairing 換新
    })
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId) // 必須是 owner 本人
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
  return { ok: true };
}

/** Get all pairings where this LINE user is the joined party (看護端). */
export async function getPairingsByPaired(
  pairedLineUserId: string
): Promise<Pairing[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("paired_line_user_id", pairedLineUserId);
  return data ?? [];
}

// ============================================================
// 家族 LINE 群組推播 (group notify)
// ============================================================

const GROUP_PAIRING_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 家屬要綁群組時呼叫:產生一次性群組配對碼.
 * Security: 只有 owner 本人能對自己的卡產生.
 * 已綁群組的話會回現有狀態(不重新產碼),家屬要先解綁才能重綁.
 */
export async function ensureGroupPairingCode(
  elderId: string,
  ownerLineUserId: string
): Promise<{ ok: boolean; code?: string; alreadyBound?: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data: existing, error: fetchErr } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: "DB_ERROR" };
  if (!existing) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };

  // 已綁 → 直接回現狀(不換碼避免亂)
  if (existing.notify_group_id) {
    return { ok: true, alreadyBound: true };
  }

  // 未綁:產一個新的 6 字元碼(跟看護配對碼一樣的字母表,但獨立 namespace)
  const code = await generateUniqueGroupCode(sb);
  const expiresAt = new Date(Date.now() + GROUP_PAIRING_TTL_MS).toISOString();

  const { error: updErr } = await sb
    .from("elder_pairings")
    .update({
      group_pairing_code: code,
      group_pairing_expires_at: expiresAt,
    })
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId);

  if (updErr) return { ok: false, error: "DB_ERROR" };
  return { ok: true, code };
}

async function generateUniqueGroupCode(
  sb: ReturnType<typeof getSupabaseAdmin>
): Promise<string> {
  if (!sb) return generatePairingCode();
  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    // 同時檢查 pairing_code 跟 group_pairing_code 兩個 column 都不能撞
    const { data: collision1 } = await sb
      .from("elder_pairings")
      .select("elder_id")
      .eq("pairing_code", code)
      .maybeSingle();
    const { data: collision2 } = await sb
      .from("elder_pairings")
      .select("elder_id")
      .eq("group_pairing_code", code)
      .maybeSingle();
    if (!collision1 && !collision2) break;
    code = generatePairingCode();
  }
  return code;
}

/**
 * Bot 在群組裡收到配對碼時呼叫(從 webhook).
 * Conditional UPDATE:碼正確 + 未過期 + 該卡尚未綁群組 → 寫入 group_id.
 */
export async function bindNotifyGroup(
  code: string,
  groupId: string
): Promise<{ ok: boolean; pairing?: Pairing; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const upperCode = code.toUpperCase().trim();
  const { data, error } = await sb
    .from("elder_pairings")
    .update({
      notify_group_id: groupId,
      notify_group_bound_at: new Date().toISOString(),
      // 用過即作廢
      group_pairing_code: null,
      group_pairing_expires_at: null,
    })
    .eq("group_pairing_code", upperCode)
    .is("notify_group_id", null)
    .gt("group_pairing_expires_at", new Date().toISOString())
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "INVALID_OR_EXPIRED_OR_BOUND" };
  return { ok: true, pairing: data };
}

/**
 * 家屬解除群組推播(只有 owner 能做).
 */
export async function unbindNotifyGroup(
  elderId: string,
  ownerLineUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };
  const { data, error } = await sb
    .from("elder_pairings")
    .update({
      notify_group_id: null,
      notify_group_bound_at: null,
      group_pairing_code: null,
      group_pairing_expires_at: null,
    })
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId)
    .select()
    .maybeSingle();
  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
  return { ok: true };
}

/**
 * 家屬切換群組推播是否包含照片.
 */
export async function setGroupPhotoEnabled(
  elderId: string,
  ownerLineUserId: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };
  const { data, error } = await sb
    .from("elder_pairings")
    .update({ notify_group_photo: enabled })
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId)
    .select()
    .maybeSingle();
  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
  return { ok: true };
}

/** 家屬端讀取自己卡的 pairing(含群組狀態) */
export async function getPairingByElderAndOwner(
  elderId: string,
  ownerLineUserId: string
): Promise<Pairing | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data } = await sb
    .from("elder_pairings")
    .select("*")
    .eq("elder_id", elderId)
    .eq("owner_line_user_id", ownerLineUserId)
    .maybeSingle();
  return data ?? null;
}
