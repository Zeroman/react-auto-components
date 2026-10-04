import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const { paused } = JSON.parse(
  readFileSync(resolve(root, "locales.config.json"), "utf8"),
);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

const snapshot = {};
for (const locale of paused) {
  const dir = resolve(root, "docs/i18n", locale);
  for (const file of walk(dir)) {
    const key = relative(root, file);
    snapshot[key] = createHash("sha256")
      .update(readFileSync(file))
      .digest("hex");
  }
}

const sorted = Object.fromEntries(
  Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(
  resolve(root, "locales.snapshot.json"),
  `${JSON.stringify(sorted, null, 2)}\n`,
);
console.log(`Snapshotted ${Object.keys(sorted).length} paused-locale files.`);
