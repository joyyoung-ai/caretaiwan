import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

process.env.AUTH_SECRET ??= "e2e-local-secret-do-not-use-in-production";
process.env.NEXTAUTH_SECRET ??= process.env.AUTH_SECRET;
process.env.HOSTNAME ??= "127.0.0.1";
process.env.PORT ??= "3100";

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
}

copyIfExists(
  path.join(root, ".next", "static"),
  path.join(root, ".next", "standalone", ".next", "static")
);
copyIfExists(path.join(root, "public"), path.join(root, ".next", "standalone", "public"));

await import(path.join(root, ".next", "standalone", "server.js"));
