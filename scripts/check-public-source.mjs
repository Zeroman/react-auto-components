import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const { name } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const basename = name.split("/").at(-1);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const packageReference = new RegExp(
  `@[a-zA-Z0-9_-]+/${escape(basename)}(?=[/\\s'"\x60,;)}]|$)`,
  "g",
);
const paths = [
  ...new Set(
    execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: root, encoding: "utf8" },
    )
      .split("\0")
      .filter(Boolean),
  ),
];
const problems = [];
for (const path of paths) {
  if (!/\.(?:md|[cm]?[jt]sx?|json|ya?ml|html|css)$/.test(path)) continue;
  let text;
  try {
    text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch (error) {
    // Git still lists tracked files deleted in the working tree until staging.
    if (error.code === "ENOENT") continue;
    throw error;
  }
  if (
    [...text.matchAll(packageReference)].some(
      ([reference]) => reference !== name,
    )
  )
    problems.push(`${path}: inconsistent package identity`);
  if (/(?:\/Users\/|\/Volumes\/|\/home\/)[^\s"'<>]+/.test(text))
    problems.push(`${path}: machine-specific absolute path`);
}
const consumer = JSON.parse(
  readFileSync(
    new URL("../test-project/package.json", import.meta.url),
    "utf8",
  ),
);
const archivePrefix = `file:../artifacts/${name.replace(/^@/, "").replaceAll("/", "-")}-`;
if (!consumer.dependencies[name]?.startsWith(archivePrefix))
  problems.push(
    "test-project/package.json: local package archive does not match package identity",
  );
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else console.log(`Public source checks passed (${paths.length} files).`);
