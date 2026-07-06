// 配對碼產生 + Supabase 操作（家屬↔看護透過 elder 配對）
// Post-flip 角色語意:
//   owner_line_user_id = 家屬(資料擁有者,推播接收方)
//   paired_line_user_id = 看護(配對加入者,記錄發送方)
import crypto from "crypto";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

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
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    // Existing? — 必須同時驗 owner，防止 A 帶 B 的 elderId 拿到 B 的配對碼
    const [existing] = await query<Pairing>(
      `select *
       from elder_pairings
       where elder_id = $1
         and owner_line_user_id = $2
       limit 1`,
      [elderId, ownerLineUserId]
    );

    if (existing) {
      // Already bound to a family member — return as-is (no re-bind)
      if (existing.paired_line_user_id) {
        return { ok: true, code: existing.pairing_code, pairing: existing };
      }
      // Not bound yet: refresh code if expired
      if (isPairingExpired(existing)) {
        const newCode = await generateUniqueCode();
        const [refreshed] = await query<Pairing>(
          `update elder_pairings
           set pairing_code = $3,
               expires_at = $4
           where elder_id = $1
             and owner_line_user_id = $2
           returning *`,
          [elderId, ownerLineUserId, newCode, pairingExpiresAt()]
        );
        if (!refreshed) return { ok: false, error: "DB_ERROR" };
        return { ok: true, code: newCode, pairing: refreshed };
      }
      return { ok: true, code: existing.pairing_code, pairing: existing };
    }

    // New pairing
    const code = await generateUniqueCode();
    const [pairing] = await query<Pairing>(
      `insert into elder_pairings (
         elder_id,
         pairing_code,
         owner_line_user_id,
         display_name,
         expires_at
       ) values ($1, $2, $3, $4, $5)
       returning *`,
      [elderId, code, ownerLineUserId, displayName, pairingExpiresAt()]
    );

    if (!pairing) return { ok: false, error: "DB_ERROR" };
    return { ok: true, code, pairing };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

async function generateUniqueCode(): Promise<string> {
  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    const [collision] = await query<{ elder_id: string }>(
      `select elder_id
       from elder_pairings
       where pairing_code = $1
       limit 1`,
      [code]
    );
    if (!collision) break;
    code = generatePairingCode();
  }
  return code;
}

/** Look up pairing by code (used when family sends code via LINE Bot) */
export async function findPairingByCode(code: string): Promise<Pairing | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    const [pairing] = await query<Pairing>(
      `select *
       from elder_pairings
       where pairing_code = $1
       limit 1`,
      [code.toUpperCase().trim()]
    );
    if (!pairing) return null;
    if (isPairingExpired(pairing)) return null;
    return pairing;
  } catch {
    return null;
  }
}

/**
 * Bind family LINE userId to a pairing.
 * Security: only succeeds if NOT already bound (防綁架) and NOT expired.
 */
export async function bindFamily(
  pairingCode: string,
  familyLineUserId: string
): Promise<{ ok: boolean; pairing?: Pairing; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

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
  try {
    const [pairing] = await query<Pairing>(
      `update elder_pairings
       set paired_line_user_id = $2,
           paired_at = $3
       where pairing_code = $1
         and owner_line_user_id <> $2
         and paired_line_user_id is null
         and expires_at > $4
       returning *`,
      [code, familyLineUserId, new Date().toISOString(), new Date().toISOString()]
    );

    if (!pairing) return { ok: false, error: "ALREADY_PAIRED_OR_EXPIRED" };
    return { ok: true, pairing };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/** Get all pairings where this LINE user is the data owner (家屬端). */
export async function getPairingsByOwner(
  ownerLineUserId: string
): Promise<Pairing[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    return await query<Pairing>(
      `select *
       from elder_pairings
       where owner_line_user_id = $1`,
      [ownerLineUserId]
    );
  } catch {
    return [];
  }
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
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const [pairing] = await query<Pairing>(
      `update elder_pairings
       set paired_line_user_id = null,
           paired_at = null,
           expires_at = $3
       where elder_id = $1
         and owner_line_user_id = $2
       returning *`,
      [elderId, ownerLineUserId, new Date(Date.now() - 1).toISOString()]
    );

    if (!pairing) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/** Get all pairings where this LINE user is the joined party (看護端). */
export async function getPairingsByPaired(
  pairedLineUserId: string
): Promise<Pairing[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    return await query<Pairing>(
      `select *
       from elder_pairings
       where paired_line_user_id = $1`,
      [pairedLineUserId]
    );
  } catch {
    return [];
  }
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
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const [existing] = await query<Pairing>(
      `select *
       from elder_pairings
       where elder_id = $1
         and owner_line_user_id = $2
       limit 1`,
      [elderId, ownerLineUserId]
    );
    if (!existing) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };

    // 已綁 → 直接回現狀(不換碼避免亂)
    if (existing.notify_group_id) {
      return { ok: true, alreadyBound: true };
    }

    // 未綁:產一個新的 6 字元碼(跟看護配對碼一樣的字母表,但獨立 namespace)
    const code = await generateUniqueGroupCode();
    const expiresAt = new Date(Date.now() + GROUP_PAIRING_TTL_MS).toISOString();

    await query<Pairing>(
      `update elder_pairings
       set group_pairing_code = $3,
           group_pairing_expires_at = $4
       where elder_id = $1
         and owner_line_user_id = $2
       returning *`,
      [elderId, ownerLineUserId, code, expiresAt]
    );

    return { ok: true, code };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

async function generateUniqueGroupCode(): Promise<string> {
  let code = generatePairingCode();
  for (let i = 0; i < 5; i++) {
    // 同時檢查 pairing_code 跟 group_pairing_code 兩個 column 都不能撞
    const [collision1] = await query<{ elder_id: string }>(
      `select elder_id
       from elder_pairings
       where pairing_code = $1
       limit 1`,
      [code]
    );
    const [collision2] = await query<{ elder_id: string }>(
      `select elder_id
       from elder_pairings
       where group_pairing_code = $1
       limit 1`,
      [code]
    );
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
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };
  const upperCode = code.toUpperCase().trim();
  try {
    const [pairing] = await query<Pairing>(
      `update elder_pairings
       set notify_group_id = $2,
           notify_group_bound_at = $3,
           group_pairing_code = null,
           group_pairing_expires_at = null
       where group_pairing_code = $1
         and notify_group_id is null
         and group_pairing_expires_at > $4
       returning *`,
      [upperCode, groupId, new Date().toISOString(), new Date().toISOString()]
    );

    if (!pairing) return { ok: false, error: "INVALID_OR_EXPIRED_OR_BOUND" };
    return { ok: true, pairing };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/**
 * 家屬解除群組推播(只有 owner 能做).
 */
export async function unbindNotifyGroup(
  elderId: string,
  ownerLineUserId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };
  try {
    const [pairing] = await query<Pairing>(
      `update elder_pairings
       set notify_group_id = null,
           notify_group_bound_at = null,
           group_pairing_code = null,
           group_pairing_expires_at = null
       where elder_id = $1
         and owner_line_user_id = $2
       returning *`,
      [elderId, ownerLineUserId]
    );
    if (!pairing) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/**
 * 家屬切換群組推播是否包含照片.
 */
export async function setGroupPhotoEnabled(
  elderId: string,
  ownerLineUserId: string,
  enabled: boolean
): Promise<{ ok: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };
  try {
    const [pairing] = await query<Pairing>(
      `update elder_pairings
       set notify_group_photo = $3
       where elder_id = $1
         and owner_line_user_id = $2
       returning *`,
      [elderId, ownerLineUserId, enabled]
    );
    if (!pairing) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
    return { ok: true };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/** 家屬端讀取自己卡的 pairing(含群組狀態) */
export async function getPairingByElderAndOwner(
  elderId: string,
  ownerLineUserId: string
): Promise<Pairing | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    const [pairing] = await query<Pairing>(
      `select *
       from elder_pairings
       where elder_id = $1
         and owner_line_user_id = $2
       limit 1`,
      [elderId, ownerLineUserId]
    );
    return pairing ?? null;
  } catch {
    return null;
  }
}
