import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

const locales = ["de", "es", "fr", "ja", "ko", "pt-BR", "ru", "zh-CN", "zh-TW"];
const documents = [
  "README.md",
  "CHANGELOG.md",
  "errors.md",
  "auto-form.md",
  "auto-search.md",
  "auto-table.md",
  "auto-dialog.md",
  "auto-tabs.md",
  "auto-focus.md",
  "auto-menu.md",
  "auto-chat.md",
  "auto-navigation.md",
  "migration.md",
];
const roots: string[] = [];
const put = (root: string, path: string, text: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "rac-docs-"));
  roots.push(root);
  for (const doc of documents) {
    put(root, doc === "README.md" ? doc : `docs/${doc}`, "# Source\n");
    for (const locale of locales)
      put(root, `docs/i18n/${locale}/${doc}`, "# Translation\n");
  }
  return root;
}
function check(root: string) {
  return spawnSync(
    process.execPath,
    [resolve("scripts/check-docs-i18n.mjs"), root],
    { encoding: "utf8" },
  );
}
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

test("translated headings and fenced example structure do not cause drift", () => {
  const root = fixture();
  put(
    root,
    "docs/i18n/zh-CN/auto-table.md",
    "# 翻译\n\n````md\n## Example\n```\n| A | B |\n| --- | --- |\n| 1 | 2 |\n````\n~~~md\n### Example\n~~~\n",
  );
  const result = check(root);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("13 active translations checked");
  expect(result.stderr).toBe("");
});

test("missing and extra error codes fail, including codes in examples", () => {
  const root = fixture();
  put(root, "docs/auto-table.md", "# Source\n```text\nRAC-TABLE-SOURCE\n```\n");
  put(root, "docs/i18n/zh-CN/auto-table.md", "# 翻译\nRAC-TABLE-SORUCE\n");
  const result = check(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("docs/i18n/zh-CN/auto-table.md");
  expect(result.stderr).toContain("missing error codes: RAC-TABLE-SOURCE");
  expect(result.stderr).toContain("extra error codes: RAC-TABLE-SORUCE");
});

test("missing active translation fails but paused locales may be absent", () => {
  const root = fixture();
  rmSync(join(root, "docs/auto-chat.md"));
  rmSync(join(root, "docs/i18n/zh-CN"), { recursive: true });
  rmSync(join(root, "docs/i18n/de"), { recursive: true });
  const result = check(root);
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("docs/auto-chat.md: missing source");
  expect(result.stderr).toContain(
    "docs/i18n/zh-CN/README.md: missing translation",
  );
  expect(result.stderr).not.toContain("i18n/de");
});

test("heading hierarchy and individual table row counts warn without failing", () => {
  const root = fixture();
  const table = (rows: string[]) =>
    ["| A | B |", "| --- | --- |", ...rows].join("\n");
  put(
    root,
    "docs/auto-table.md",
    `# Source\n## Details\n${table(["| 1 | 2 |"])}\n\n${table(["| 3 | 4 |", "| 5 | 6 |"])}\n`,
  );
  put(
    root,
    "docs/i18n/zh-CN/auto-table.md",
    `# 翻译\n### 详情\n${table(["| 1 | 2 |", "| 3 | 4 |"])}\n\n${table(["| 5 | 6 |"])}\n`,
  );
  const result = check(root);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toContain(
    "docs/i18n/zh-CN/auto-table.md: heading levels",
  );
  expect(result.stderr).toContain("table body rows [2,1], source [1,2]");
});
