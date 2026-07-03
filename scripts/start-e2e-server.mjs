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

function findStandaloneServer(standaloneRoot) {
  const direct = path.join(standaloneRoot, "server.js");
  if (fs.existsSync(direct)) return direct;

  const stack = [standaloneRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") stack.push(fullPath);
        continue;
      }
      if (entry.name === "server.js") return fullPath;
    }
  }

  throw new Error(`Cannot find standalone server under ${standaloneRoot}`);
}

const standaloneRoot = path.join(root, ".next", "standalone");
const serverPath = findStandaloneServer(standaloneRoot);
const serverDir = path.dirname(serverPath);

copyIfExists(
  path.join(root, ".next", "static"),
  path.join(serverDir, ".next", "static")
);
copyIfExists(path.join(root, "public"), path.join(serverDir, "public"));

await import(serverPath);
