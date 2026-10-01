import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  utimesSync,
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
consumer.dependencies[packageName] = `file:../artifacts/${name}`;
writeFileSync(manifest, `${JSON.stringify(consumer, null, 2)}\n`);
run(["install", "--no-frozen-lockfile"], `${root}test-project`);

// Re-resolve the installed tarball in already running Vite demo servers.
const updatedAt = new Date();
for (const file of ["test-project/vite.config.ts", "vite.demo.config.ts"]) {
  utimesSync(`${root}${file}`, updatedAt, updatedAt);
}
