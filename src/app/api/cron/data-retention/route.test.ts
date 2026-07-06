import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
import { isLineBotEnabled } from "@/lib/line-bot";

vi.mock("@/lib/db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("@/lib/db/postgres", () => ({ query: vi.fn() }));

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

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);
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

describe("GET /api/cron/data-retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-secret");
    isDatabaseEnabledMock.mockReturnValue(true);
    isLineBotEnabledMock.mockReturnValue(false);
    queryMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redacts warn-stage response samples", async () => {
    queryMock.mockResolvedValueOnce(backupRows()).mockResolvedValueOnce([]);

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
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from cloud_backups"),
      expect.arrayContaining([expect.any(String), 100])
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from audit_logs"),
      expect.arrayContaining(["U1234567890abcdef1234567890abcdef", "DATA_RETENTION_WARNING"])
    );
  });

  it("redacts delete-stage dry-run response samples", async () => {
    queryMock.mockResolvedValueOnce(backupRows());

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

  it("deletes expired backups before pairings through direct Postgres", async () => {
    queryMock
      .mockResolvedValueOnce(backupRows())
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }]);

    const res = await GET(cronRequest("delete", false));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results[0]).toMatchObject({ deleted: true, pairingsDeleted: 3 });
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("delete from cloud_backups"),
      ["U1234567890abcdef1234567890abcdef"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("owner_line_user_id"),
      ["U1234567890abcdef1234567890abcdef"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("paired_line_user_id"),
      ["U1234567890abcdef1234567890abcdef"]
    );
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

  it("returns service unavailable when database services are disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await GET(cronRequestWithAuth("Bearer cron-secret"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "Database not enabled" });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
