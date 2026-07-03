import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function supabaseHealth(error: { message: string } | null = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue({ error }),
      })),
    })),
  };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isCloudEnabledMock.mockReturnValue(true);
    getSupabaseAdminMock.mockReturnValue(supabaseHealth() as never);
  });

  it("returns ok after a lightweight Supabase read", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it("returns 503 when cloud services are disabled", async () => {
    isCloudEnabledMock.mockReturnValue(false);

    const res = await GET();

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, reason: "cloud_disabled" });
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the admin client is unavailable", async () => {
    getSupabaseAdminMock.mockReturnValue(null);

    const res = await GET();

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ ok: false, reason: "no_admin_client" });
  });

  it("returns a DB error when the keep-alive query fails", async () => {
    getSupabaseAdminMock.mockReturnValue(supabaseHealth({ message: "raw health query failure" }) as never);

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      reason: "db_error",
      message: "raw health query failure",
    });
  });

  it("returns an exception error when the keep-alive query throws", async () => {
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn(() => {
        throw new Error("raw keep-alive exception");
      }),
    } as never);

    const res = await GET();

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      reason: "exception",
      message: "raw keep-alive exception",
    });
  });
});
