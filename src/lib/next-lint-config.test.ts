import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ESLint } from "eslint";

// Exercise the installed Next.js consumer, including its scoped glob override.
const requireFromConfig = createRequire(import.meta.resolve("eslint-config-next"));
const { getRootDirs } = requireFromConfig(
  "@next/eslint-plugin-next/dist/utils/get-root-dirs",
) as {
  getRootDirs(context: {
    cwd: string;
    settings: { next?: { rootDir: string | string[] } };
  }): string[];
};

describe("Next.js lint root directory discovery", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "caretaiwan-lint-"));
    mkdirSync(join(root, "apps", "caregiver"), { recursive: true });
    mkdirSync(join(root, "apps", "family"), { recursive: true });
    mkdirSync(join(root, "apps", "caregiver", "src", "pages"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "apps", "caregiver", "src", "pages", "visits.tsx"),
      "export default function Visits() { return null; }",
    );
    writeFileSync(join(root, "apps", "README.md"), "fixture");
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("keeps the current project when no root pattern is configured", () => {
    expect(getRootDirs({ cwd: root, settings: {} })).toEqual([root]);
  });

  it("expands directory patterns without treating files as projects", () => {
    expect(
      getRootDirs({
        cwd: root,
        settings: { next: { rootDir: join(root, "apps", "*") } },
      }).map((directory) => resolve(directory)).sort(),
    ).toEqual([join(root, "apps", "caregiver"), join(root, "apps", "family")]);
  });

  it("supports an array of project patterns", () => {
    expect(
      getRootDirs({
        cwd: root,
        settings: {
          next: {
            rootDir: [join(root, "apps", "care*"), join(root, "apps", "fam*")],
          },
        },
      }).map((directory) => resolve(directory)).sort(),
    ).toEqual([join(root, "apps", "caregiver"), join(root, "apps", "family")]);
  });

  it("normalizes Windows separators before expanding a pattern", () => {
    expect(
      getRootDirs({
        cwd: root,
        settings: {
          next: { rootDir: join(root, "apps", "*").replaceAll("/", "\\") },
        },
      }).map((directory) => resolve(directory)).sort(),
    ).toEqual([join(root, "apps", "caregiver"), join(root, "apps", "family")]);
  });

  it("still detects internal page links in a project found through a glob", async () => {
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: resolve("eslint.config.mjs"),
      overrideConfig: {
        settings: { next: { rootDir: join(root, "apps", "*") } },
      },
    });

    const [result] = await eslint.lintText(
      'export default function Page() { return <a href="/visits">Visits</a>; }',
      { filePath: join(root, "page.tsx") },
    );

    expect(result.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "@next/next/no-html-link-for-pages",
          severity: 2,
        }),
      ]),
    );
  });
});
