import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { expect, test } from "vitest";

const root = process.cwd();
const config = JSON.parse(
  readFileSync(resolve(root, "locales.config.json"), "utf8"),
) as { source: string; active: string[]; paused: string[] };

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

test("locale policy config is coherent", () => {
  expect(config.source).toBe("en");
  expect(config.active).toContain("zh-CN");
  expect(config.active).toHaveLength(1);
  const overlap = config.active.filter((l) => config.paused.includes(l));
  expect(overlap, "locales must be either active or paused, not both").toEqual(
    [],
  );
});

test("paused-locale files are frozen against the committed snapshot", () => {
  const snapshot = JSON.parse(
    readFileSync(resolve(root, "locales.snapshot.json"), "utf8"),
  ) as Record<string, string>;
  const onDisk: Record<string, string> = {};
  for (const locale of config.paused) {
    for (const file of walk(resolve(root, "docs/i18n", locale))) {
      const key = relative(root, file);
      onDisk[key] = createHash("sha256")
        .update(readFileSync(file))
        .digest("hex");
    }
  }
  const diskKeys = Object.keys(onDisk).sort();
  const snapshotKeys = Object.keys(snapshot).sort();
  const problems: string[] = [];
  for (const key of snapshotKeys.filter((k) => !(k in onDisk)))
    problems.push(`deleted: ${key}`);
  for (const key of diskKeys.filter((k) => !(k in snapshot)))
    problems.push(`added: ${key}`);
  for (const key of diskKeys.filter(
    (k) => k in snapshot && snapshot[k] !== onDisk[k],
  ))
    problems.push(`modified: ${key}`);
  expect(
    problems,
    `Paused locales are frozen by policy (locales.config.json). Only ${config.source} and ${config.active.join(", ")} are maintained. To update a frozen file legitimately, move the locale to "active" in locales.config.json and run: node scripts/snapshot-paused-i18n.mjs\n`,
  ).toEqual([]);
});
