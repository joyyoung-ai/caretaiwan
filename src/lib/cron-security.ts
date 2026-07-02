import crypto from "crypto";

export function extractBearerToken(authHeader: string): string {
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export function timingSafeSecretEqual(actual: string, expected: string): boolean {
  const actualHash = crypto.createHash("sha256").update(actual).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

export function lineUserRef(lineUserId: string): string {
  return crypto.createHash("sha256").update(lineUserId).digest("hex").slice(0, 12);
}
