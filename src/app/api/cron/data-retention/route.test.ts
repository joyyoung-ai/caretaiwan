import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getSupabaseAdmin, isCloudEnabled } from "@/lib/supabase-server";
import { isLineBotEnabled } from "@/lib/line-bot";

vi.mock("@/lib/supabase-server", () => ({
  getSupabaseAdmin: vi.fn(),
  isCloudEnabled: vi.fn(),
}));

vi.mock("@/lib/line-bot", () => ({
  isLineBotEnabled: vi.fn(),
  pushMessage: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/data-retention-cron", async () => {
  return await import("../../../../lib/data-retention-cron");
});

vi.mock("@/lib/cron-security", async () => {
  return await import("../../../../lib/cron-security");
});

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const isLineBotEnabledMock = vi.mocked(isLineBotEnabled);

function cronRequest(stage: "warn" | "delete", dryRun = true): Request {
  return new Request(
    `https://care.example.test/api/cron/data-retention?stage=${stage}&dryRun=${String(dryRun)}`,
    {
      headers: { Authorization: "Bearer cron-secret" },
    }
  );
}

function cronRequestWithAuth(authHeader?: string): Request {
  return new Request("https://care.example.test/api/cron/data-retention?stage=warn", {
    headers: authHeader ? { Authorization: authHeader } : {},
  });
}

function backupRows() {
  return [
    {
      line_user_id: "U1234567890abcdef1234567890abcdef",
      display_name: "王小明",
      updated_at: "2025-01-01T00:00:00.000Z",
    },
  ];
}

function supabaseForRetentionCandidates() {
  return {
    from: vi.fn((table: string) => {
      if (table === "cloud_backups") {
        return {
          select: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: backupRows(), error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

describe("GET /api/cron/data-retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-secret");
    isCloudEnabledMock.mockReturnValue(true);
    isLineBotEnabledMock.mockReturnValue(false);
    getSupabaseAdminMock.mockReturnValue(supabaseForRetentionCandidates() as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redacts warn-stage response samples", async () => {
    const res = await GET(cronRequest("warn"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      stage: "warn",
      dryRun: true,
      processed: 1,
      candidates: 1,
    });
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      warned: false,
      reason: "DRY_RUN",
    });
    expect(body.results[0].lineUserRef).toMatch(/^[a-f0-9]{12}$/);
    expect(JSON.stringify(body)).not.toContain("U1234567890abcdef1234567890abcdef");
    expect(JSON.stringify(body)).not.toContain("王小明");
  });

  it("redacts delete-stage dry-run response samples", async () => {
    const res = await GET(cronRequest("delete"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      stage: "delete",
      dryRun: true,
      processed: 1,
      candidates: 1,
    });
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      deleted: false,
      reason: "DRY_RUN",
    });
    expect(body.results[0].lineUserRef).toMatch(/^[a-f0-9]{12}$/);
    expect(JSON.stringify(body)).not.toContain("U1234567890abcdef1234567890abcdef");
    expect(JSON.stringify(body)).not.toContain("王小明");
  });

  it("rejects missing or invalid bearer tokens", async () => {
    const missing = await GET(cronRequestWithAuth());
    const invalid = await GET(cronRequestWithAuth("Bearer wrong-secret"));

    expect(missing.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(invalid.status).toBe(401);
    await expect(invalid.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns service unavailable when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const res = await GET(cronRequestWithAuth("Bearer cron-secret"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "CRON_SECRET not configured" });
  });
});
