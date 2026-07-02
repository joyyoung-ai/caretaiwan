// 稽核日誌：記錄誰、何時、做了什麼（不存內容）
// 用於資安事件回溯與合規查詢
import { getSupabaseAdmin } from "./supabase-server";

export type AuditAction =
  | "CLOUD_UPLOAD"
  | "CLOUD_DOWNLOAD"
  | "CLOUD_DELETE"
  | "PAIRING_CREATE"
  | "PAIRING_BIND"
  | "PAIRING_BIND_REJECT"
  | "PAIRING_UNBIND"
  | "GROUP_PAIRING_CREATE"
  | "GROUP_PAIRING_BIND"
  | "GROUP_PAIRING_BIND_REJECT"
  | "GROUP_PAIRING_UNBIND"
  | "PUSH_RECORD"
  | "PUSH_GROUP"
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_CONSENT"
  | "AUTH_CONSENT_REVOKE"
  | "RATE_LIMITED"
  | "FORBIDDEN_ORIGIN"
  | "PHOTO_UPLOAD"
  | "DATA_RETENTION_WARNING"
  | "DATA_AUTO_DELETE"
  | "DATA_RETENTION_RUN"
  | "EXPENSE_CREATE"
  | "EXPENSE_VERIFY"
  | "EXPENSE_LIST"
  | "PHOTO_OWNERSHIP_REJECT";

type LogInput = {
  action: AuditAction;
  actorLineUserId?: string | null;
  actorIp?: string | null;
  resourceType?: string;
  resourceId?: string;
  status?: "ok" | "fail" | "forbidden";
  metadata?: Record<string, unknown>;
};

// IP 去識別化：保留前 3 段／IPv6 前 4 段，最後一段歸零（GDPR 建議手法）
function anonymizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes(":")) {
    // IPv6
    const parts = ip.split(":");
    return parts.slice(0, 4).join(":") + "::0";
  }
  // IPv4
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

export function getActorIp(req: Request): string | null {
  // 過 CF 橘雲時真實 IP 在 cf-connecting-ip；灰雲時 fallback x-forwarded-for / x-real-ip
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Fire-and-forget audit log (does not throw, does not block) */
export function logAudit(input: LogInput): void {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  // Strip any keys that look like PII from metadata as defence in depth
  const cleanMeta = sanitizeMetadata(input.metadata);
  sb.from("audit_logs")
    .insert({
      actor_line_user_id: input.actorLineUserId ?? null,
      actor_ip: anonymizeIp(input.actorIp),
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      status: input.status ?? "ok",
      metadata: cleanMeta,
    })
    .then(({ error }) => {
      if (error) console.error("[audit]", error.message);
    });
}

const PII_KEYS = new Set([
  "name",
  "phone",
  "email",
  "history",
  "allergies",
  "note",
  "message",
  "text",
  "eldername",
  "displayname",
  "doctor",
  "hospital",
  "value",
  "itemname",
  "verifynote",
]);

export function sanitizeMetadata(
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (PII_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 100) {
      out[k] = v.slice(0, 100) + "...";
      continue;
    }
    out[k] = v;
  }
  return out;
}
