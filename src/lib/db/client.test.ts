import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
  const Pool = vi.fn(function MockPool(
    this: { options: unknown },
    options: unknown
  ) {
    this.options = options;
  });

  return { Pool };
});

describe("database client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("reports disabled when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const { isDatabaseEnabled } = await import("./client");

    expect(isDatabaseEnabled()).toBe(false);
  });

  it("creates one pool for repeated calls", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://user:pass@localhost:5432/caretaiwan"
    );
    vi.stubEnv("POSTGRES_SSL_MODE", "disable");

    const pg = await import("pg");
    const { getDatabasePool, isDatabaseEnabled } = await import("./client");

    expect(isDatabaseEnabled()).toBe(true);
    expect(getDatabasePool()).toBe(getDatabasePool());
    expect(pg.Pool).toHaveBeenCalledTimes(1);
  });
});
