import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const directories = [root, `${root}packages/devtools`];
const manifests = directories.map((dir) =>
  JSON.parse(readFileSync(`${dir}/package.json`, "utf8")),
);
const version = manifests[0].version;
if (
  manifests[1].version !== version ||
  manifests[1].peerDependencies[manifests[0].name] !== version
)
  throw new Error(
    "Component, DevTools and component peer versions must match.",
  );
if (
  process.env.GITHUB_REF_NAME &&
  process.env.GITHUB_REF_NAME !== `v${version}`
)
  throw new Error("Release tag does not match both package versions.");
const run = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
// CI already verified source and packed consumers; create fresh publish artifacts.
run("pnpm", ["build"], root);
run("pnpm", ["build:devtools"], root);
for (let i = 0; i < directories.length; i++) {
  const { name } = manifests[i];
  const existing = spawnSync(
    "npm",
    [
      "view",
      `${name}@${version}`,
      "version",
      "--json",
      "--registry=https://registry.npmjs.org",
    ],
    { encoding: "utf8" },
  );
  if (existing.status === 0 && JSON.parse(existing.stdout) === version) {
    console.log(`${name}@${version} is already published; skipping.`);
    continue;
  }
  if (existing.status !== 0) {
    let missing = false;
    for (const stream of [existing.stdout, existing.stderr]) {
      try {
        missing ||= JSON.parse(stream).error?.code === "E404";
      } catch {
        /* npm versions differ in where structured errors are written */
      }
    }
    missing ||= /\bnpm (?:ERR!|error) code E404\b/.test(existing.stderr);
    // Empty output, auth failures and network errors are not permission to publish.
    if (!missing)
      throw new Error(
        `Cannot verify registry version for ${name}: ${existing.stderr}`,
      );
  }
  run(
    "npm",
    [
      "publish",
      "--access",
      "public",
      "--tag",
      version.includes("-") ? "next" : "latest",
      "--ignore-scripts",
      "--registry=https://registry.npmjs.org",
    ],
    directories[i],
  );
}
