import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { rateLimitAsync } from "@/lib/rate-limit";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/origin-check", () => ({
  checkSameOrigin: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("@/lib/db/postgres", () => ({ query: vi.fn() }));

vi.mock("@/lib/audit", () => ({
  getActorIp: vi.fn(() => "203.0.113.10"),
  logAudit: vi.fn(),
}));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const rateLimitAsyncMock = vi.mocked(rateLimitAsync);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

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
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1", name: "家屬" } } as never);
    rateLimitAsyncMock.mockResolvedValue({ ok: true, remaining: 5, resetAt: Date.now() + 60_000 });
    queryMock.mockResolvedValue([]);
  });

  it("stores backups under the signed-in user and strips unexpected top-level keys", async () => {
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
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into cloud_backups"),
      [
        "family-1",
        "家屬",
        JSON.stringify({
          elderStore: { elders: [{ id: "elder-1" }] },
          records: [{ id: "record-1" }],
        }),
        expect.any(String),
      ]
    );
  });

  it("rejects malformed JSON before writing a backup", async () => {
    const res = await POST(rawRequest("{not-json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "格式錯誤" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("rejects oversized requests using content-length before reading the body", async () => {
    const res = await POST(rawRequest("{}", { "content-length": String(1024 * 1024 + 1) }));

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: "備份檔過大" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns a generic server error when backup upsert fails", async () => {
    queryMock.mockRejectedValueOnce(new Error("raw database failure"));

    const res = await POST(jsonRequest({ records: [] }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "伺服器錯誤" });
  });

  it("returns 503 when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await POST(jsonRequest({ records: [] }));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "資料庫服務未啟用（管理員未設定）" });
    expect(authMock).not.toHaveBeenCalled();
  });

  it("requires a signed-in LINE user before writing backups", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(jsonRequest({ records: [] }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "未登入" });
    expect(rateLimitAsyncMock).not.toHaveBeenCalled();
    expect(queryMock).not.toHaveBeenCalled();
  });
});
