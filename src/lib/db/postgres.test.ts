import { afterEach, describe, expect, it, vi } from "vitest";

const poolQueryMock = vi.fn();
const clientQueryMock = vi.fn();
const releaseMock = vi.fn();

vi.mock("./client", () => ({
  getDatabasePool: vi.fn(() => ({
    query: poolQueryMock,
    connect: vi.fn(async () => ({
      query: clientQueryMock,
      release: releaseMock,
    })),
  })),
}));

describe("postgres query helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns typed rows from a pool query", async () => {
    poolQueryMock.mockResolvedValueOnce({ rows: [{ ok: 1 }] });

    const { query } = await import("./postgres");
    const rows = await query<{ ok: number }>("select 1 as ok", []);

    expect(rows).toEqual([{ ok: 1 }]);
    expect(poolQueryMock).toHaveBeenCalledWith("select 1 as ok", []);
  });

  it("maps pool query failures to public-safe errors", async () => {
    poolQueryMock.mockRejectedValueOnce({
      code: "42P01",
      message: "relation cloud_backups missing",
    });

    const { query } = await import("./postgres");

    await expect(query("select * from cloud_backups")).rejects.toEqual({
      code: "query_failed",
      message: "資料庫暫時無法完成請求。",
    });
  });

  it("commits and releases successful transactions", async () => {
    const { withTransaction } = await import("./postgres");

    const result = await withTransaction(async (client) => {
      await client.query("select 1");
      return "ok";
    });

    expect(result).toBe("ok");
    expect(clientQueryMock.mock.calls.map(([sql]) => sql)).toEqual([
      "begin",
      "select 1",
      "commit",
    ]);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases failed transactions", async () => {
    const { withTransaction } = await import("./postgres");

    await expect(
      withTransaction(async () => {
        throw { code: "23505", message: "duplicate key with raw detail" };
      })
    ).rejects.toEqual({
      code: "constraint_violation",
      message: "資料庫暫時無法完成請求。",
    });

    expect(clientQueryMock.mock.calls.map(([sql]) => sql)).toEqual([
      "begin",
      "rollback",
    ]);
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
