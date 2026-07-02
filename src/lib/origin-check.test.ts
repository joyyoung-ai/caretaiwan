import { afterEach, describe, expect, it, vi } from "vitest";
import { checkSameOrigin, checkSameOriginGet, isAllowedHost } from "./origin-check";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("origin host allowlist", () => {
  it("allows the configured production app host", () => {
    const env = {
      NODE_ENV: "production",
      PUBLIC_APP_URL: "https://care.example.com",
    };

    expect(isAllowedHost("care.example.com", env)).toBe(true);
    expect(isAllowedHost("care.example.com:443", env)).toBe(true);
  });

  it("allows extra production hosts from PRODUCTION_ALLOWED_HOSTS", () => {
    const env = {
      NODE_ENV: "production",
      PUBLIC_APP_URL: "https://care.example.com",
      PRODUCTION_ALLOWED_HOSTS: "www.care.example.com,care.internal.example.com",
    };

    expect(isAllowedHost("www.care.example.com", env)).toBe(true);
    expect(isAllowedHost("care.internal.example.com", env)).toBe(true);
  });

  it("rejects localhost and preview hosts in production", () => {
    const env = {
      NODE_ENV: "production",
      PUBLIC_APP_URL: "https://care.example.com",
      PREVIEW_ALLOWED_HOSTS: "preview.example.com",
    };

    expect(isAllowedHost("localhost:3000", env)).toBe(false);
    expect(isAllowedHost("preview.example.com", env)).toBe(false);
    expect(isAllowedHost("evil.example.com", env)).toBe(false);
  });

  it("allows localhost and preview hosts outside production", () => {
    const env = {
      NODE_ENV: "development",
      PREVIEW_ALLOWED_HOSTS: "preview.example.com",
    };

    expect(isAllowedHost("localhost:3000", env)).toBe(true);
    expect(isAllowedHost("127.0.0.1:3000", env)).toBe(true);
    expect(isAllowedHost("preview.example.com", env)).toBe(true);
  });
});

describe("same-origin guards", () => {
  it("allows state-changing requests from the configured production app origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "https://care.example.com");

    const req = new Request("https://care.example.com/api/test", {
      headers: {
        host: "care.example.com",
        origin: "https://care.example.com",
      },
    });

    expect(checkSameOrigin(req)).toBeNull();
  });

  it("rejects cross-origin state-changing requests", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "https://care.example.com");

    const req = new Request("https://care.example.com/api/test", {
      headers: {
        host: "care.example.com",
        origin: "https://evil.example.com",
      },
    });

    expect(checkSameOrigin(req)?.status).toBe(403);
  });

  it("allows direct GET reads only when the request host itself is allowed", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_APP_URL", "https://care.example.com");

    const allowedReq = new Request("https://care.example.com/api/test", {
      headers: { host: "care.example.com" },
    });
    const rejectedReq = new Request("https://evil.example.com/api/test", {
      headers: { host: "evil.example.com" },
    });

    expect(checkSameOriginGet(allowedReq)).toBeNull();
    expect(checkSameOriginGet(rejectedReq)?.status).toBe(403);
  });
});
