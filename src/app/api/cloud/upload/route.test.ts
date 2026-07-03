import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { rateLimitAsync } from "@/lib/rate-limit";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const rateLimitAsyncMock = vi.mocked(rateLimitAsync);
const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function jsonRequest(body: unknown): Request {
  return new Request("https://care.example.test/api/cloud/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
    },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string, headers?: HeadersInit): Request {
  return new Request("https://care.example.test/api/cloud/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://care.example.test",
      ...headers,
    },
    body,
  });
}

describe("POST /api/cloud/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1", name: "家屬" } } as never);
    rateLimitAsyncMock.mockResolvedValue({ ok: true, remaining: 5, resetAt: Date.now() + 60_000 });
  });

  it("stores backups under the signed-in user and strips unexpected top-level keys", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    } as never);

    const res = await POST(
      jsonRequest({
        elderStore: { elders: [{ id: "elder-1" }] },
        records: [{ id: "record-1" }],
        line_user_id: "attacker",
        serviceRoleKey: "secret",
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        line_user_id: "family-1",
        display_name: "家屬",
        data: {
          elderStore: { elders: [{ id: "elder-1" }] },
          records: [{ id: "record-1" }],
        },
      }),
      { onConflict: "line_user_id" }
    );
  });

  it("rejects malformed JSON before writing a backup", async () => {
    const res = await POST(rawRequest("{not-json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "格式錯誤" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("rejects oversized requests using content-length before reading the body", async () => {
    const res = await POST(rawRequest("{}", { "content-length": String(1024 * 1024 + 1) }));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "備份檔過大" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("returns a generic server error when backup upsert fails", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: "raw database failure" } });
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    } as never);

    const res = await POST(jsonRequest({ records: [] }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });
});
