import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const run = (args, cwd = root) => {
  const result = spawnSync("pnpm", args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
mkdirSync(`${root}artifacts`, { recursive: true });
run(["pack", "--pack-destination", "artifacts"]);
const { name: packageName, version } = JSON.parse(
  readFileSync(`${root}package.json`, "utf8"),
);
const archiveBase = `${packageName.replace(/^@/, "").replaceAll("/", "-")}-${version}`;
const archive = `${root}artifacts/${archiveBase}.tgz`;
const hash = createHash("sha256")
  .update(readFileSync(archive))
  .digest("hex")
  .slice(0, 12);
const name = `${archiveBase}-${hash}.tgz`;
copyFileSync(archive, `${root}artifacts/${name}`);
const manifest = `${root}test-project/package.json`;
const consumer = JSON.parse(readFileSync(manifest, "utf8"));
const next = `file:../artifacts/${name}`;
const changed = consumer.dependencies[packageName] !== next;
consumer.dependencies[packageName] = next;
writeFileSync(manifest, `${JSON.stringify(consumer, null, 2)}\n`);
run(["install", "--no-frozen-lockfile"], `${root}test-project`);

if (changed) {
  // Purge the dep-optimizer cache: it references the removed tarball
  // directory, and the next server start (or on-demand optimize) must rebuild
  // from the new one. No config-file touches: forcing running vite servers to
  // restart mid-session deadlocks the optimizer ("bundling dependencies..."
  // hangs forever) whenever a browser tab stays connected. The source-aliased
  // root demo (`pnpm dev`) never needs this; restart `pnpm --dir test-project
  // dev` manually when verifying a fresh pack.
  rmSync(`${root}test-project/node_modules/.vite`, {
    recursive: true,
    force: true,
  });
}
