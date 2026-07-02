// Same-origin guard for API routes (CSRF defense beyond SameSite cookie)
// Supports both POST (state-changing) and GET (PII read) routes.
//
import { NextResponse } from "next/server";

type OriginEnv = Partial<
  Record<
    | "NODE_ENV"
    | "VERCEL_ENV"
    | "VERCEL_URL"
    | "PREVIEW_ALLOWED_HOSTS"
    | "PUBLIC_APP_URL"
    | "PRODUCTION_ALLOWED_HOSTS",
    string
  >
>;

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const trimmed = host.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    return trimmed.split(":")[0] || null;
  }
}

function hostsFromCsv(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  for (const host of (raw ?? "").split(",").map((s) => normalizeHost(s))) {
    if (host) set.add(host);
  }
  return set;
}

function isProductionEnv(env: OriginEnv = process.env): boolean {
  return (env.VERCEL_ENV ?? env.NODE_ENV) === "production";
}

function productionHosts(env: OriginEnv = process.env): Set<string> {
  const set = new Set<string>();
  const publicAppHost = normalizeHost(env.PUBLIC_APP_URL);
  if (publicAppHost) set.add(publicAppHost);
  for (const host of hostsFromCsv(env.PRODUCTION_ALLOWED_HOSTS)) {
    set.add(host);
  }
  return set;
}

function previewExtraHosts(env: OriginEnv = process.env): Set<string> {
  const set = hostsFromCsv(env.PREVIEW_ALLOWED_HOSTS);
  // Vercel auto-injects current deployment URL
  const vercelHost = normalizeHost(env.VERCEL_URL);
  if (vercelHost) set.add(vercelHost);
  return set;
}

export function isAllowedHost(host: string | null, env: OriginEnv = process.env): boolean {
  const h = normalizeHost(host);
  if (!h) return false;

  if (productionHosts(env).has(h)) return true;
  if (isProductionEnv(env)) {
    // production 不接 localhost、任意 *.vercel.app 或 preview allowlist。
    // 正式網域請用 PUBLIC_APP_URL 或 PRODUCTION_ALLOWED_HOSTS 設定。
    return false;
  }

  // dev / preview only
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (previewExtraHosts(env).has(h)) return true;
  return false;
}

/**
 * POST/PUT/DELETE 等 state-changing 請求用的 strict check。
 * 缺 Origin = 拒絕 (curl / server-to-server / 不安全的 webview)。
 *
 * v55: 額外要求 Origin 的 host 必須跟 Host header 屬於同一 allowlist set
 * （防 host header smuggling：Host=caretaiwan.app + Origin=evil.com 之類）
 */
export function checkSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!isAllowedHost(host)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 優先用 Origin
  if (origin) {
    try {
      const u = new URL(origin);
      if (isAllowedHost(u.host)) return null;
    } catch {}
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // LINE in-app webview 部分版本不送 Origin,fallback 用 Referer
  if (referer) {
    try {
      const u = new URL(referer);
      if (isAllowedHost(u.host)) return null;
    } catch {}
  }

  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

/**
 * GET 讀取 PII 的請求用的較寬鬆 check。
 * 缺 Origin 但有 Referer 也接受,因為:
 *  - 一般瀏覽器直接 navigation 沒 Origin 但有 Referer
 *  - 攻擊者透過 iframe / form 都會有 Origin 或 Referer
 * 但 cross-origin 一定拒絕。
 */
export function checkSameOriginGet(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!isAllowedHost(host)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 如果有 Origin (代表 fetch / XHR / iframe 發起),必須同源
  if (origin) {
    try {
      const u = new URL(origin);
      if (isAllowedHost(u.host)) return null;
    } catch {}
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 沒 Origin (直接瀏覽器 navigation / PWA fetch) -> 用 Referer
  // PWA 內 same-origin fetch 通常有 Referer
  if (referer) {
    try {
      const u = new URL(referer);
      if (isAllowedHost(u.host)) return null;
    } catch {}
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 完全沒 Origin / Referer 的請求(curl / 直接打 URL)
  // GET 我們允許(否則 LINE webview 部分情境會失敗)
  return null;
}
