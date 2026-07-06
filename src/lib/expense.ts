// 記帳本資料層 - 看護記、家屬查、可核帳
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

export type ExpenseCategory = "med" | "supply" | "food" | "medical" | "other";
export type ExpenseVerifyStatus = "pending" | "confirmed" | "disputed";

export type ExpenseLog = {
  id: number;
  elder_id: string;
  actor_line_user_id: string;
  owner_line_user_id: string;
  item_name: string;
  amount: number;
  category: ExpenseCategory;
  note: string | null;
  photo_path: string | null;
  verify_status: ExpenseVerifyStatus;
  verify_note: string | null;
  verified_at: string | null;
  created_at: string;
};

// 安全範圍:防止 NaN / 太大金額 / 負數 / 太小於 0.01
export function sanitizeAmount(raw: unknown): number | null {
  if (typeof raw === "number" && !isNaN(raw)) {
    if (raw < 0 || raw > 9999999) return null; // 上限 999.9 萬
    return Math.round(raw * 100) / 100; // 截 2 位小數
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (isNaN(n)) return null;
    return sanitizeAmount(n);
  }
  return null;
}

export function isValidCategory(c: unknown): c is ExpenseCategory {
  return c === "med" || c === "supply" || c === "food" || c === "medical" || c === "other";
}

const EXPENSE_COLUMNS = `
  id,
  elder_id,
  actor_line_user_id,
  owner_line_user_id,
  item_name,
  amount::double precision as amount,
  category,
  note,
  photo_path,
  verify_status,
  verify_note,
  verified_at,
  created_at
`;

/**
 * 看護建立記帳
 */
export async function createExpense(input: {
  elderId: string;
  actorLineUserId: string;
  ownerLineUserId: string;
  itemName: string;
  amount: number;
  category: ExpenseCategory;
  note?: string;
  photoPath?: string;
}): Promise<{ ok: boolean; expense?: ExpenseLog; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const rows = await query<ExpenseLog>(
      `
        insert into expense_logs (
          elder_id,
          actor_line_user_id,
          owner_line_user_id,
          item_name,
          amount,
          category,
          note,
          photo_path
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning ${EXPENSE_COLUMNS}
      `,
      [
        input.elderId,
        input.actorLineUserId,
        input.ownerLineUserId,
        input.itemName.slice(0, 100),
        input.amount,
        input.category,
        input.note?.slice(0, 500) ?? null,
        input.photoPath ?? null,
      ]
    );

    if (!rows[0]) return { ok: false, error: "INSERT_FAILED" };
    return { ok: true, expense: rows[0] };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/**
 * 列出某張卡的記帳。
 * Security: caller 必須是這張卡的**當前 pairing**角色才看得到
 *           (owner 或 paired,不能用「曾經是 actor」-> 防止舊看護解綁後仍看到舊雇主帳)
 * 用兩次 query (不用 .or() 字串拼接 -> 防 PostgREST filter injection)
 */
export async function listExpensesForCard(
  elderId: string,
  callerLineUserId: string,
  limit = 50
): Promise<{ ok: boolean; expenses?: ExpenseLog[]; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    // 先驗證 caller 是當前 pairing 的 owner 或 paired_line_user_id
    const [pairing] = await query<{
      owner_line_user_id: string;
      paired_line_user_id: string | null;
    }>(
      `
        select owner_line_user_id, paired_line_user_id
        from elder_pairings
        where elder_id = $1
        limit 1
      `,
      [elderId]
    );

    if (!pairing) return { ok: true, expenses: [] };
    const isOwner = pairing.owner_line_user_id === callerLineUserId;
    const isPaired = pairing.paired_line_user_id === callerLineUserId;
    if (!isOwner && !isPaired) {
      // 非當前 pairing 角色一律拒絕(就算 DB 有舊紀錄也看不到)
      return { ok: true, expenses: [] };
    }

    const boundedLimit = Math.max(1, Math.min(Math.floor(limit), 100));
    const expenses = await query<ExpenseLog>(
      `
        select ${EXPENSE_COLUMNS}
        from expense_logs
        where elder_id = $1
        order by created_at desc
        limit $2
      `,
      [elderId, boundedLimit]
    );

    return { ok: true, expenses };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

/**
 * 家屬核帳:確認 or 標記有問題
 * Security: 只有 owner 可核
 */
export async function verifyExpense(
  expenseId: number,
  ownerLineUserId: string,
  status: "confirmed" | "disputed",
  note?: string
): Promise<{ ok: boolean; expense?: ExpenseLog; error?: string }> {
  if (!isDatabaseEnabled()) return { ok: false, error: "SERVICE_DISABLED" };

  try {
    const rows = await query<ExpenseLog>(
      `
        update expense_logs
        set verify_status = $1,
            verify_note = $2,
            verified_at = $3
        where id = $5
          and owner_line_user_id = $4
        returning ${EXPENSE_COLUMNS}
      `,
      [status, note?.slice(0, 500) ?? null, new Date().toISOString(), ownerLineUserId, expenseId]
    );

    if (!rows[0]) return { ok: false, error: "NOT_FOUND_OR_NOT_OWNER" };
    return { ok: true, expense: rows[0] };
  } catch {
    return { ok: false, error: "DB_ERROR" };
  }
}

// 分類顯示用(server side push 訊息也會用)
export const CATEGORY_META: Record<ExpenseCategory, { icon: string; labelZh: string }> = {
  med: { icon: "💊", labelZh: "藥品" },
  supply: { icon: "🧻", labelZh: "用品" },
  food: { icon: "🍎", labelZh: "食品" },
  medical: { icon: "🏥", labelZh: "醫療" },
  other: { icon: "📦", labelZh: "其他" },
};
