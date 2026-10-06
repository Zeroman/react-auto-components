import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  utimesSync,
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
  // The tarball swap removed the previous package directory from
  // node_modules/.pnpm. A running Vite server that restarts now would reconcile
  // its dep-optimizer cache (node_modules/.vite) against those deleted paths
  // and hang in "bundling dependencies..." forever — pages stop loading until a
  // manual restart. Purge the stale cache first so the restart cold-optimizes
  // exactly like a manual `pnpm dev`, then bump the config mtimes to trigger
  // that single restart in every running demo server.
  rmSync(`${root}test-project/node_modules/.vite`, {
    recursive: true,
    force: true,
  });
  const updatedAt = new Date();
  for (const file of ["test-project/vite.config.ts", "vite.demo.config.ts"]) {
    utimesSync(`${root}${file}`, updatedAt, updatedAt);
  }
}
