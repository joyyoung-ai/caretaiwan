import { describe, expect, it } from "vitest";
import {
  extractBearerToken,
  lineUserRef,
  timingSafeSecretEqual,
} from "./cron-security";

describe("cron security helpers", () => {
  it("extracts bearer tokens strictly", () => {
    expect(extractBearerToken("Bearer secret-token")).toBe("secret-token");
    expect(extractBearerToken("bearer   secret-token  ")).toBe("secret-token");
    expect(extractBearerToken("Bearer secret token")).toBe("");
    expect(extractBearerToken("Basic secret-token")).toBe("");
    expect(extractBearerToken("secret-token")).toBe("");
  });

  it("compares secrets without leaking length through early string equality", () => {
    expect(timingSafeSecretEqual("same-secret", "same-secret")).toBe(true);
    expect(timingSafeSecretEqual("same-secret", "other-secret")).toBe(false);
    expect(timingSafeSecretEqual("", "other-secret")).toBe(false);
  });

  it("returns a stable non-PII reference for LINE user IDs", () => {
    const rawLineUserId = "U1234567890abcdef1234567890abcdef";
    const ref = lineUserRef(rawLineUserId, "cron-secret-one");

    expect(ref).toMatch(/^[a-f0-9]{12}$/);
    expect(ref).toBe(lineUserRef(rawLineUserId, "cron-secret-one"));
    expect(ref).not.toBe(lineUserRef(rawLineUserId, "cron-secret-two"));
    expect(ref).not.toContain(rawLineUserId);
    expect(ref).not.toContain("U123456");
  });
});
