// Same-origin guard for API routes (CSRF defense beyond SameSite cookie)
// Supports both POST (state-changing) and GET (PII read) routes.
//
// v55 變更（codex MEDIUM-2）:
//  - production 只接 caretaiwan.app / www.caretaiwan.app / caretaiwan.vercel.app
//  - preview / dev 走 env 白名單（NEXT_PUBLIC_VERCEL_ENV !== 'production' 時生效）
//  - 避免「任何 *.vercel.app」這條過寬規則（其他 attacker preview 也算自家）
import { NextResponse } from "next/server";

const PROD_HOSTS = new Set([
  "caretaiwan.app",
  "www.caretaiwan.app",
  "caretaiwan.vercel.app",
]);

const IS_PRODUCTION =
  (process.env.VERCEL_ENV ?? process.env.NODE_ENV) === "production";

// preview / dev 模式才允許的額外 host（從 env 取、可 comma-sep）
function previewExtraHosts(): Set<string> {
  const raw = process.env.PREVIEW_ALLOWED_HOSTS ?? "";
  const set = new Set<string>();
  for (const h of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    set.add(h.toLowerCase());
  }
  // Vercel auto-injects current deployment URL
  const vurl = process.env.VERCEL_URL;
  if (vurl) set.add(vurl.toLowerCase());
  return set;
}

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  // strip port if any
  const h = host.split(":")[0].toLowerCase();
  if (PROD_HOSTS.has(h)) return true;
  if (previewExtraHosts().has(h)) return true;
  if (IS_PRODUCTION) {
    // production 不再無條件接 *.vercel.app / localhost
    return false;
  }
  // dev / preview only
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (previewExtraHosts().has(h)) return true;
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
