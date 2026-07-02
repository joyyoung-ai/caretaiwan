import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, resolve } from "node:path";

const root = process.cwd();
const roots = [
  "README.md",
  "README.zh-TW.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "docs",
  ".github",
];

const markdownFiles = [];

function collect(path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return;

  const stats = statSync(fullPath);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(fullPath)) {
      collect(join(path, entry));
    }
    return;
  }

  if (path.endsWith(".md")) {
    markdownFiles.push(fullPath);
  }
}

for (const path of roots) {
  collect(path);
}

const externalSchemes = /^(https?:|mailto:|tel:|sms:|line:)/i;
const errors = [];

for (const file of markdownFiles) {
  const text = readFileSync(file, "utf8");
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of text.matchAll(linkPattern)) {
    if (match[0].startsWith("!")) continue;

    let target = match[1].trim();
    target = target.replace(/^<(.+)>$/, "$1");
    target = target.split(/\s+/)[0];

    if (!target || target.startsWith("#") || externalSchemes.test(target)) {
      continue;
    }

    const fileTarget = target.split("#")[0];
    if (!fileTarget) continue;

    const resolved = normalize(resolve(dirname(file), decodeURIComponent(fileTarget)));
    if (!resolved.startsWith(root) || !existsSync(resolved)) {
      errors.push(`${file.replace(`${root}/`, "")}: missing ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error("Markdown link check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Markdown link check passed (${markdownFiles.length} files).`);
