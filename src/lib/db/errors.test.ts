import { describe, expect, it } from "vitest";
import { classifyDatabaseError, toPublicDatabaseError } from "./errors";

describe("database error mapping", () => {
  it("maps common driver codes to coarse categories", () => {
    expect(classifyDatabaseError({ code: "23505" })).toBe(
      "constraint_violation"
    );
    expect(classifyDatabaseError({ code: "28P01" })).toBe("auth_failed");
    expect(classifyDatabaseError({ code: "ECONNREFUSED" })).toBe(
      "connection_failed"
    );
  });

  it("does not expose raw database details in public errors", () => {
    const publicError = toPublicDatabaseError({
      code: "42P01",
      message:
        "relation cloud_backups missing on postgres://user:pass@db.example/app",
      detail: "LINE user U123 and elder note should not leak",
    });

    expect(publicError).toEqual({
      code: "query_failed",
      message: "資料庫暫時無法完成請求。",
    });
    expect(JSON.stringify(publicError)).not.toContain("db.example");
    expect(JSON.stringify(publicError)).not.toContain("U123");
  });
});
