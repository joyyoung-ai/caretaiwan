import { afterEach, describe, expect, it, vi } from "vitest";

async function importRateLimit() {
  vi.resetModules();
  return import("./rate-limit");
}

describe("rate limiting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("falls back to in-memory limits when Upstash is not configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { rateLimitAsync } = await importRateLimit();

    await expect(rateLimitAsync("test:no-upstash", { max: 2, windowMs: 60_000 })).resolves.toMatchObject({
      ok: true,
      remaining: 1,
    });
    await expect(rateLimitAsync("test:no-upstash", { max: 2, windowMs: 60_000 })).resolves.toMatchObject({
      ok: true,
      remaining: 0,
    });
    await expect(rateLimitAsync("test:no-upstash", { max: 2, windowMs: 60_000 })).resolves.toMatchObject({
      ok: false,
      remaining: 0,
    });
  });

  it("resets the in-memory window after the configured duration", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { rateLimit } = await importRateLimit();

    expect(rateLimit("test:window", { max: 1, windowMs: 10_000 })).toMatchObject({
      ok: true,
      remaining: 0,
    });
    expect(rateLimit("test:window", { max: 1, windowMs: 10_000 })).toMatchObject({
      ok: false,
      remaining: 0,
    });

    vi.setSystemTime(11_001);

    expect(rateLimit("test:window", { max: 1, windowMs: 10_000 })).toMatchObject({
      ok: true,
      remaining: 0,
    });
  });

  it("falls back to in-memory limits when Upstash requests fail", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const { rateLimitAsync } = await importRateLimit();

    await expect(rateLimitAsync("test:upstash-error", { max: 1, windowMs: 60_000 })).resolves.toMatchObject({
      ok: true,
      remaining: 0,
    });
    await expect(rateLimitAsync("test:upstash-error", { max: 1, windowMs: 60_000 })).resolves.toMatchObject({
      ok: false,
      remaining: 0,
    });
  });
});
