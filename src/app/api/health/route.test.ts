import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";

vi.mock("@/lib/db/client", () => ({
  isDatabaseEnabled: vi.fn(),
}));

vi.mock("@/lib/db/postgres", () => ({
  query: vi.fn(),
}));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
    queryMock.mockResolvedValue([{ ok: 1 }]);
  });

  it("returns ok after a lightweight Postgres read", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.timestamp).toEqual(expect.any(String));
    expect(queryMock).toHaveBeenCalledWith("select 1 as ok");
  });

  it("returns 503 when database config is disabled", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    const res = await GET();

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      reason: "database_disabled",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns a redacted DB error when the health query fails", async () => {
    queryMock.mockRejectedValue({
      code: "query_failed",
      message:
        "relation cloud_backups missing on postgres://user:pass@db.example/app",
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      reason: "database_error",
    });
    expect(JSON.stringify(body)).not.toContain("db.example");
    expect(JSON.stringify(body)).not.toContain("cloud_backups");
  });
});
