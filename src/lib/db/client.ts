import { Pool } from "pg";

let pool: Pool | null = null;

export function isDatabaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabasePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.POSTGRES_SSL_MODE === "require"
          ? {
              rejectUnauthorized:
                process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false",
            }
          : undefined,
      max: Number(process.env.POSTGRES_POOL_MAX ?? "5"),
      idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? "30000"),
      connectionTimeoutMillis: Number(
        process.env.POSTGRES_CONNECTION_TIMEOUT_MS ?? "5000"
      ),
    });
  }

  return pool;
}
