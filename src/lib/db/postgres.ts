import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool } from "./client";
import { toPublicDatabaseError } from "./errors";

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  try {
    const result = await getDatabasePool().query<T>(text, values);
    return result.rows;
  } catch (error) {
    throw toPublicDatabaseError(error);
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getDatabasePool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw toPublicDatabaseError(error);
  } finally {
    client.release();
  }
}
