import crypto from "crypto";

export function extractBearerToken(authHeader: string): string {
  const match = authHeader.match(/^Bearer\s+(\S+)\s*$/i);
  return match?.[1] ?? "";
}

export function timingSafeSecretEqual(actual: string, expected: string): boolean {
  const actualHash = crypto.createHash("sha256").update(actual).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

export function lineUserRef(lineUserId: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`line-user-ref:${lineUserId}`)
    .digest("hex")
    .slice(0, 12);
}
