import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const run = (cmd, args) => {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

console.log("=== Updating Demo and Screenshot ===");
run("pnpm", ["build"]);
run("pnpm", ["prepare:test-project"]);
run("pnpm", ["build:demo"]);
run("node", ["scripts/update-demo-screenshot.mjs"]);
console.log("\n=== Demo static files and screenshot updated successfully! ===");
