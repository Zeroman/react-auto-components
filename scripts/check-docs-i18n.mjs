import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Locale policy comes from locales.config.json: active locales are checked
// strictly; paused locales are frozen (hash-locked by tests/i18n-policy.test.ts)
// and may be missing or stale without failing this check.
const repo = fileURLToPath(new URL("../", import.meta.url));
const { active, paused } = JSON.parse(
  readFileSync(resolve(repo, "locales.config.json"), "utf8"),
);
const documents = [
  "README.md",
  "CHANGELOG.md",
  "errors.md",
  "auto-form.md",
  "auto-search.md",
  "auto-table.md",
  "auto-dialog.md",
  "auto-tabs.md",
  "auto-menu.md",
  "auto-chat.md",
  "auto-navigation.md",
  "migration.md",
];
const root = process.argv[2] ?? repo;
const errors = [];
const warnings = [];

function read(path, kind) {
  try {
    return readFileSync(resolve(root, path), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    errors.push(`${path}: missing ${kind}`);
    return null;
  }
}

function structure(text) {
  const lines = [];
  let fence;
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = undefined;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    lines.push(line);
  }
  const headings = lines.flatMap((line) => {
    const match = line.match(/^ {0,3}(#{1,6})\s+/);
    return match ? [match[1].length] : [];
  });
  // Repository docs use pipe-delimited GFM tables. Count body rows per table,
  // not a document-wide total (which could hide one table losing a row).
  const tables = [];
  for (let i = 1; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i - 1])) continue;
    if (!/^\s*\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|\s*$/.test(lines[i]))
      continue;
    let rows = 0;
    while (i + 1 < lines.length && /^\s*\|/.test(lines[i + 1])) {
      rows++;
      i++;
    }
    tables.push(rows);
  }
  return { headings, tables };
}

const codes = (text) =>
  new Set(text.match(/\bRAC-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g) ?? []);
const difference = (a, b) => [...a].filter((value) => !b.has(value)).sort();

// Deleting an active translation or a whole active locale must not hide drift.
for (const document of documents) {
  const sourcePath = document === "README.md" ? document : `docs/${document}`;
  const source = read(sourcePath, "source");
  for (const locale of active) {
    const path = `docs/i18n/${locale}/${document}`;
    const translation = read(path, "translation");
    if (source === null || translation === null) continue;
    for (const [label, values] of [
      ["missing", difference(codes(source), codes(translation))],
      ["extra", difference(codes(translation), codes(source))],
    ]) {
      if (values.length)
        errors.push(`${path}: ${label} error codes: ${values.join(", ")}`);
    }
    const expected = structure(source),
      actual = structure(translation);
    for (const [key, label] of [
      ["headings", "heading levels"],
      ["tables", "table body rows"],
    ]) {
      if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
        warnings.push(
          `${path}: ${label} ${JSON.stringify(actual[key])}, source ${JSON.stringify(expected[key])}`,
        );
      }
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
const activeFiles = documents.length * active.length;
console.log(
  `Docs i18n: ${activeFiles} active translations checked (${active.join(", ")}), ${paused.length} locales paused (frozen), ${errors.length} errors, ${warnings.length} structural warnings (non-blocking).`,
);
process.exitCode = errors.length ? 1 : 0;
