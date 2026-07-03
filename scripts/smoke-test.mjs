import { existsSync } from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";

const BUILD_ID = ".next/BUILD_ID";
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;

if (!existsSync(BUILD_ID)) {
  console.error("Missing .next build output. Run `npm run build` before `npm run test:smoke`.");
  process.exit(1);
}

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = "node_modules/next/dist/bin/next";
const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...process.env,
    NODE_ENV: "production",
    AUTH_SECRET: process.env.AUTH_SECRET ?? "smoke-test-auth-secret-smoke-test-auth-secret",
  },
});

let output = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
child.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer(`${baseUrl}/`);
  await checkPage("/", "CareTaiwan");
  await checkPage("/about", "CareTaiwan");
  await checkPage("/privacy", "隱私");
  await checkPage("/terms", "服務");
  await checkSession();
  await checkSecurityHeaders("/about");
  console.log("Smoke test passed.");
} finally {
  child.kill("SIGTERM");
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selected = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!selected) reject(new Error("Could not allocate a local port"));
        else resolve(selected);
      });
    });
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + START_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited early with code ${child.exitCode}\n${output}`);
    }
    try {
      const res = await fetchWithTimeout(url);
      if (res.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for next start: ${lastError?.message ?? "unknown"}\n${output}`);
}

async function checkPage(path, expectedText) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`);
  if (res.status !== 200) {
    throw new Error(`${path} returned ${res.status}`);
  }
  const html = await res.text();
  if (!html.includes(expectedText)) {
    throw new Error(`${path} did not include expected text: ${expectedText}`);
  }
}

async function checkSession() {
  const res = await fetchWithTimeout(`${baseUrl}/api/session`);
  if (res.status !== 200) {
    throw new Error(`/api/session returned ${res.status}`);
  }
  const bodyText = await res.text();
  const body = JSON.parse(bodyText);
  if (body.loggedIn !== false) {
    throw new Error(`/api/session should report loggedIn=false without cookies`);
  }
  if (bodyText.includes("lineUserId")) {
    throw new Error(`/api/session response leaked lineUserId`);
  }
}

async function checkSecurityHeaders(path) {
  const res = await fetchWithTimeout(`${baseUrl}${path}`);
  expectHeader(res, "x-frame-options", "DENY");
  expectHeader(res, "x-content-type-options", "nosniff");
  const csp = res.headers.get("content-security-policy") ?? "";
  if (!csp.includes("frame-ancestors 'none'")) {
    throw new Error(`${path} CSP missing frame-ancestors 'none'`);
  }
}

function expectHeader(res, key, expected) {
  const actual = res.headers.get(key);
  if (actual !== expected) {
    throw new Error(`Expected ${key}: ${expected}, got ${actual ?? "null"}`);
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
