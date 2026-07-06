// 照片擁有權 metadata（v55, codex HIGH-2 修補）
// 配對使用者可請 server 對任意 storage path 簽 signed URL，
// 因此每張 record-photos 上傳時都要登記 metadata，
// push / expense-push 在簽 URL 前要查驗 actor + elder + purpose 三者吻合。
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

export type PhotoPurpose = "record" | "expense";

export async function insertPhotoMetadata(input: {
  path: string;
  uploaderLineUserId: string;
  elderId: string;
  purpose: PhotoPurpose;
}): Promise<{ ok: boolean }> {
  if (!isDatabaseEnabled()) return { ok: false };

  try {
    await query(
      `
        insert into record_photos (
          path,
          uploader_line_user_id,
          elder_id,
          purpose
        )
        values ($1, $2, $3, $4)
      `,
      [input.path, input.uploaderLineUserId, input.elderId, input.purpose]
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * 驗證 path 真的屬於此 actor、此 elder、此用途。
 * Legacy（v55 前上傳、沒 metadata 的）一律回 false；
 * 呼叫者應該 skip 照片，不要 fail 整個 push。
 */
export async function verifyPhotoOwnership(input: {
  path: string;
  actorLineUserId: string;
  elderId: string;
  purpose: PhotoPurpose;
}): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;

  try {
    const [data] = await query<{
      uploader_line_user_id: string;
      elder_id: string;
      purpose: PhotoPurpose;
    }>(
      `
        select uploader_line_user_id, elder_id, purpose
        from record_photos
        where path = $1
        limit 1
      `,
      [input.path]
    );
    if (!data) return false;
    return (
      data.uploader_line_user_id === input.actorLineUserId &&
      data.elder_id === input.elderId &&
      data.purpose === input.purpose
    );
  } catch {
    return false;
  }
}

export async function hasPhotoMetadata(input: {
  path: string;
  elderId: string;
  purpose: PhotoPurpose;
}): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;

  try {
    const rows = await query<{ path: string }>(
      `
        select path
        from record_photos
        where path = $1
          and elder_id = $2
          and purpose = $3
        limit 1
      `,
      [input.path, input.elderId, input.purpose]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}
