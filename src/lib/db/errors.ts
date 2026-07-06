export type DatabaseErrorCode =
  | "connection_failed"
  | "auth_failed"
  | "constraint_violation"
  | "query_failed"
  | "config_missing"
  | "unknown";

export type PublicDatabaseError = {
  code: DatabaseErrorCode;
  message: string;
};

export function classifyDatabaseError(error: unknown): DatabaseErrorCode {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") {
    return "connection_failed";
  }

  if (code === "28P01" || code === "28000") {
    return "auth_failed";
  }

  if (code === "23503" || code === "23505" || code === "23514") {
    return "constraint_violation";
  }

  if (code) {
    return "query_failed";
  }

  return "unknown";
}

export function toPublicDatabaseError(error: unknown): PublicDatabaseError {
  return {
    code: classifyDatabaseError(error),
    message: "資料庫暫時無法完成請求。",
  };
}
