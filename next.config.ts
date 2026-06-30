import type { NextConfig } from "next";

// v56 變更（codex MEDIUM-3）：
//   - CSP 從 frame-ancestors-only 擴成完整 default-src / script-src / style-src / img-src / etc.
//   - 採「Without Nonces」approach（Next 16 docs 推薦的兩條路之一）：
//       Pro: 保留 static rendering、不增加 server cost、SW cache 一致
//       Trade-off: script-src 含 'unsafe-inline'（layout.tsx FOUC inline script + Next.js hydration 需要）
//   - 主要 XSS 防禦透過 default-src 'self' + object-src 'none' + base-uri 'self' + form-action 'self'
//   - 真正 inline-script-XSS 風險低（無 dangerouslySetInnerHTML 用 user 輸入；React 自動 escape）
//
// 想升級到 nonce-based CSP 時要：
//   - 改用 proxy.ts 生 nonce
//   - 全頁 export const dynamic = 'force-dynamic' 或 await connection()
//   - 不再用 SW 全 cache HTML
//   參考 node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md

const isDev = process.env.NODE_ENV === "development";

// CSP — single source of truth
const csp = [
  "default-src 'self'",
  // script-src: 'unsafe-inline' 給 layout.tsx FOUC script + Next.js hydration scripts
  //              dev 還要 'unsafe-eval' 給 React fast refresh
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // style-src: Tailwind / Next.js 會 inject inline style
  "style-src 'self' 'unsafe-inline'",
  // img-src: 自家 + blob URL（client photo preview） + data URL（icon） + Supabase signed URL
  "img-src 'self' blob: data: https://*.supabase.co",
  "font-src 'self'",
  // connect-src: 自家 API + Supabase（Storage signed URL fetch） + Sentry telemetry
  "connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io",
  // 完全禁止 plugin / Flash / Java applet
  "object-src 'none'",
  // 防 <base href> 被注入劫持 relative URL
  "base-uri 'self'",
  // 表單只能 POST 回自家（防 phishing form 偷送 cred 出去）
  "form-action 'self'",
  // 已存在的 clickjacking 防禦
  "frame-ancestors 'none'",
  // 強制升 https
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
