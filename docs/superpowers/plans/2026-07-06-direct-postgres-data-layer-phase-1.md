# Direct Postgres Data Layer Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each runtime task and superpowers:verification-before-completion before committing. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a server-only direct Postgres adapter and migrate only the health route as a low-risk pilot. Do not migrate feature helpers in this phase.

**Architecture:** Add `src/lib/db/*` as the only place that imports the Postgres driver. Route handlers and feature helpers must call this adapter, never instantiate DB clients directly. Keep Supabase runtime support until all feature helpers are migrated in later phases.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, `pg`, `@types/pg`, current application-level ownership checks.

---

## File Structure

- Create `src/lib/db/client.ts`: server-only env parsing, singleton `pg.Pool`, `isDatabaseEnabled()`.
- Create `src/lib/db/postgres.ts`: `query<T>()`, `withTransaction<T>()`, query timeout and release handling.
- Create `src/lib/db/errors.ts`: coarse DB error classification and public-safe error messages.
- Create `src/lib/db/client.test.ts`: missing env, singleton pool and disabled-state tests.
- Create `src/lib/db/postgres.test.ts`: query success, query failure, transaction commit and rollback tests.
- Create `src/lib/db/errors.test.ts`: driver error mapping and redaction tests.
- Modify `src/app/api/health/route.ts`: use the DB adapter pilot when `DATABASE_URL` is configured.
- Modify `src/app/api/health/route.test.ts`: cover direct Postgres success, disabled config and redacted failure.
- Modify `.env.example`, `docker/.env.production.example`, `docs/operations/DEPLOY.md`, `docs/operations/RUNBOOK.md`, `docs/engineering/TESTING.md`, and `docs/releases/CHANGELOG.md`.

## Task 1: Add Postgres Dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install runtime and type packages**

Run:

```bash
npm install pg @types/pg
```

Expected:

- `package.json` includes `pg` under `dependencies`.
- `package.json` includes `@types/pg` under `devDependencies` or npm's chosen section.
- `package-lock.json` is updated.

- [ ] **Step 2: Check dependency placement**

Run:

```bash
node -e "const p=require('./package.json'); console.log(Boolean(p.dependencies.pg), Boolean((p.devDependencies||{})['@types/pg'] || (p.dependencies||{})['@types/pg']))"
```

Expected output:

```text
true true
```

## Task 2: Write Failing Adapter Tests

**Files:**
- Create: `src/lib/db/client.test.ts`
- Create: `src/lib/db/errors.test.ts`
- Create: `src/lib/db/postgres.test.ts`

- [ ] **Step 1: Add client tests**

Create `src/lib/db/client.test.ts`:

```typescript
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("pg", () => {
  const Pool = vi.fn(function MockPool(this: { options: unknown }, options: unknown) {
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
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/caretaiwan");
    vi.stubEnv("POSTGRES_SSL_MODE", "disable");

    const pg = await import("pg");
    const { getDatabasePool, isDatabaseEnabled } = await import("./client");

    expect(isDatabaseEnabled()).toBe(true);
    expect(getDatabasePool()).toBe(getDatabasePool());
    expect(pg.Pool).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Add error tests**

Create `src/lib/db/errors.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { classifyDatabaseError, toPublicDatabaseError } from "./errors";

describe("database error mapping", () => {
  it("maps common driver codes to coarse categories", () => {
    expect(classifyDatabaseError({ code: "23505" })).toBe("constraint_violation");
    expect(classifyDatabaseError({ code: "28P01" })).toBe("auth_failed");
    expect(classifyDatabaseError({ code: "ECONNREFUSED" })).toBe("connection_failed");
  });

  it("does not expose raw database details in public errors", () => {
    const publicError = toPublicDatabaseError({
      code: "42P01",
      message: "relation cloud_backups missing on postgres://user:pass@db.example/app",
      detail: "LINE user U123 and elder note should not leak",
    });

    expect(publicError).toEqual({
      code: "query_failed",
      message: "資料庫暫時無法完成請求。",
    });
    expect(JSON.stringify(publicError)).not.toContain("db.example");
    expect(JSON.stringify(publicError)).not.toContain("U123");
  });
});
```

- [ ] **Step 3: Add query / transaction tests**

Create `src/lib/db/postgres.test.ts` with a mocked pool client. The tests should assert:

- `query<T>()` calls the pool with SQL and params, then returns typed rows.
- `query<T>()` converts thrown driver errors with `toPublicDatabaseError()`.
- `withTransaction<T>()` sends `begin`, calls the callback, sends `commit`, and releases the client.
- `withTransaction<T>()` sends `rollback` and releases the client when the callback throws.

- [ ] **Step 4: Verify RED**

Run:

```bash
npm run test -- src/lib/db/client.test.ts src/lib/db/errors.test.ts src/lib/db/postgres.test.ts
```

Expected: FAIL because `src/lib/db/*` implementation files do not exist yet.

## Task 3: Implement Adapter Foundation

**Files:**
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/errors.ts`
- Create: `src/lib/db/postgres.ts`

- [ ] **Step 1: Implement client module**

Create `src/lib/db/client.ts`:

```typescript
import "server-only";
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
          ? { rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false" }
          : undefined,
      max: Number(process.env.POSTGRES_POOL_MAX ?? "5"),
      idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS ?? "30000"),
      connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS ?? "5000"),
    });
  }

  return pool;
}
```

- [ ] **Step 2: Implement error mapping**

Create `src/lib/db/errors.ts`:

```typescript
export type DatabaseErrorCode =
  | "connection_failed"
  | "auth_failed"
  | "constraint_violation"
  | "query_failed"
  | "config_missing"
  | "unknown";

export function classifyDatabaseError(error: unknown): DatabaseErrorCode {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") return "connection_failed";
  if (code === "28P01" || code === "28000") return "auth_failed";
  if (code === "23503" || code === "23505" || code === "23514") return "constraint_violation";
  if (code) return "query_failed";

  return "unknown";
}

export function toPublicDatabaseError(error: unknown): { code: DatabaseErrorCode; message: string } {
  return {
    code: classifyDatabaseError(error),
    message: "資料庫暫時無法完成請求。",
  };
}
```

- [ ] **Step 3: Implement query helpers**

Create `src/lib/db/postgres.ts`:

```typescript
import "server-only";
import type { PoolClient, QueryResultRow } from "pg";
import { getDatabasePool } from "./client";
import { toPublicDatabaseError } from "./errors";

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = []
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
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm run test -- src/lib/db/client.test.ts src/lib/db/errors.test.ts src/lib/db/postgres.test.ts
```

Expected: PASS.

## Task 4: Migrate Health Route Pilot

**Files:**
- Modify: `src/app/api/health/route.test.ts`
- Modify: `src/app/api/health/route.ts`

- [ ] **Step 1: Add failing route tests**

Update the health route tests to cover:

- `DATABASE_URL` missing returns a degraded or disabled DB dependency status without throwing.
- DB query success returns healthy DB dependency status.
- DB query failure returns unhealthy / degraded DB dependency status without raw driver details.

Mock `src/lib/db/client` and `src/lib/db/postgres`; do not require a real database.

- [ ] **Step 2: Implement route migration**

Update `src/app/api/health/route.ts` to use:

```typescript
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";
```

The route should call:

```typescript
await query<{ ok: number }>("select 1 as ok");
```

The public response must not include the DB host, username, raw SQL text, table names or driver error message.

- [ ] **Step 3: Verify route tests**

Run:

```bash
npm run test -- src/app/api/health/route.test.ts
```

Expected: PASS.

## Task 5: Update Env and Operations Docs

**Files:**
- Modify: `.env.example`
- Modify: `docker/.env.production.example`
- Modify: `docs/operations/DEPLOY.md`
- Modify: `docs/operations/RUNBOOK.md`
- Modify: `docs/engineering/TESTING.md`
- Modify: `docs/releases/CHANGELOG.md`

- [ ] **Step 1: Add env examples**

Add:

```dotenv
DATABASE_URL=postgres://caretaiwan:change-me@postgres:5432/caretaiwan
POSTGRES_SSL_MODE=disable
POSTGRES_POOL_MAX=5
POSTGRES_CONNECTION_TIMEOUT_MS=5000
POSTGRES_IDLE_TIMEOUT_MS=30000
```

Production should use real secrets outside git. If the DB is remote or TLS is required, set `POSTGRES_SSL_MODE=require`.

- [ ] **Step 2: Update docs**

Document:

- DB env is server-only.
- Health route only returns coarse status.
- Supabase env remains required until all helpers are migrated.
- Storage strategy is separate from relational DB migration.
- Rollback for phase 1 is to revert health route pilot while leaving adapter code unused.

- [ ] **Step 3: Verify docs**

Run:

```bash
npm run docs:check
```

Expected: `Markdown link check passed`.

## Task 6: Final Verification and Commit

- [ ] Run `npm run test -- src/lib/db/client.test.ts src/lib/db/errors.test.ts src/lib/db/postgres.test.ts src/app/api/health/route.test.ts`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Commit with message `feat: add direct postgres data layer foundation`.
- [ ] Push to `origin/main`.

Do not proceed to care calendar, caregiver leave, photo, cloud backup or cron migration in the same PR. Those are separate review units.
