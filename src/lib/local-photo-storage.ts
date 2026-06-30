import crypto from "crypto";
import path from "path";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";

const STORAGE_DIR = process.env.LOCAL_PHOTO_STORAGE_DIR;
const SIGNING_SECRET = process.env.LOCAL_PHOTO_SIGNING_SECRET ?? process.env.AUTH_SECRET;

const EXT_CONTENT_TYPE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function safePhotoPath(photoPath: string): string {
  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(photoPath)) {
    throw new Error("Invalid photo path");
  }
  return photoPath;
}

function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    ""
  ).replace(/\/$/, "");
}

function sign(payload: string): string {
  if (!SIGNING_SECRET) throw new Error("Missing local photo signing secret");
  return crypto.createHmac("sha256", SIGNING_SECRET).update(payload).digest("base64url");
}

export function isLocalPhotoStorageEnabled(): boolean {
  return Boolean(STORAGE_DIR && SIGNING_SECRET && publicBaseUrl());
}

export async function saveLocalPhoto(photoPath: string, bytes: Uint8Array): Promise<void> {
  if (!STORAGE_DIR) throw new Error("Local photo storage disabled");
  const safe = safePhotoPath(photoPath);
  await mkdir(STORAGE_DIR, { recursive: true });
  await writeFile(path.join(STORAGE_DIR, safe), bytes);
}

export async function deleteLocalPhoto(photoPathValue: string): Promise<void> {
  if (!STORAGE_DIR) return;
  try {
    await unlink(path.join(STORAGE_DIR, safePhotoPath(photoPathValue)));
  } catch {}
}

export function createLocalSignedPhotoUrl(photoPath: string, expiresInSeconds: number): string | null {
  if (!isLocalPhotoStorageEnabled()) return null;
  const safe = safePhotoPath(photoPath);
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ path: safe, exp })).toString("base64url");
  const sig = sign(payload);
  return `${publicBaseUrl()}/api/photo/signed/${payload}.${sig}`;
}

export async function readLocalSignedPhoto(token: string): Promise<{
  ok: true;
  bytes: Buffer;
  contentType: string;
} | {
  ok: false;
  status: number;
}> {
  if (!STORAGE_DIR || !SIGNING_SECRET) return { ok: false, status: 404 };
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { ok: false, status: 400 };
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, status: 403 };
  }

  let parsed: { path?: string; exp?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, status: 400 };
  }

  if (!parsed.path || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, status: 403 };
  }

  const safe = safePhotoPath(parsed.path);
  const ext = path.extname(safe).toLowerCase();
  const contentType = EXT_CONTENT_TYPE[ext] ?? "application/octet-stream";

  try {
    const bytes = await readFile(path.join(STORAGE_DIR, safe));
    return { ok: true, bytes, contentType };
  } catch {
    return { ok: false, status: 404 };
  }
}
