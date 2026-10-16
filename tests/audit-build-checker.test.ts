import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Regression for audit 3.3: check-public-source.mjs must detect inconsistent
// package references with dotted scopes (e.g. @zeroman.yang) for BOTH the
// library and the devtools package, must guard that test-project pins both to
// tarballs of the currently published versions, and must actually run as a CLI.
// NOTE: wrong package names and machine paths below are assembled from parts so
// the checker does not flag this very test file.

// Non-literal specifier: TS7016 would fire on a literal .mjs import without
// declarations, and an `as` cast alone does not satisfy the checker.
const { checkPublicSource } = (await import(
  "../scripts/check-public" + "-source.mjs"
)) as {
  checkPublicSource: (root: string | URL, paths: string[]) => string[];
};

const MAIN = "@test.scope/" + "react-auto-components";
const DEVTOOLS = MAIN + "-devtools";
// Matches MAIN's basename under a different scope, but assembled so the raw
// file text contains no contiguous "wrong" reference the checker would flag.
const WRONG_REFERENCE = ["@test.wrongscope", MAIN.split("/")[1]].join("/");
const MACHINE_PATH = ["", "Users", "dev/repo"].join("/");

const GOOD_MAIN_REF =
  "file:../artifacts/test.scope-react-auto-components-1.2.3-4d89dc577d22.tgz";
const GOOD_DEVTOOLS_REF =
  "file:../artifacts/test.scope-react-auto-components-devtools-1.2.3-3deaa7f0e992.tgz";

const cleanup: string[] = [];
afterEach(() => {
  for (const dir of cleanup.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function fixture({
  version = "1.2.3",
  devtoolsVersion = "1.2.3",
  devtoolsPeer = "1.2.3",
  mainRef = GOOD_MAIN_REF,
  devtoolsRef = GOOD_DEVTOOLS_REF,
  fileText = `Use ${MAIN} and ${DEVTOOLS} here.\n`,
}: {
  version?: string;
  devtoolsVersion?: string;
  devtoolsPeer?: string;
  mainRef?: string;
  devtoolsRef?: string;
  fileText?: string;
} = {}): string {
  const root = mkdtempSync(join(tmpdir(), "rac-check-public-"));
  cleanup.push(root);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: MAIN, version }),
  );
  mkdirSync(join(root, "packages", "devtools"), { recursive: true });
  writeFileSync(
    join(root, "packages", "devtools", "package.json"),
    JSON.stringify({
      name: DEVTOOLS,
      version: devtoolsVersion,
      peerDependencies: { [MAIN]: devtoolsPeer },
    }),
  );
  mkdirSync(join(root, "test-project"), { recursive: true });
  writeFileSync(
    join(root, "test-project", "package.json"),
    JSON.stringify({
      dependencies: { [MAIN]: mainRef },
      devDependencies: { [DEVTOOLS]: devtoolsRef },
    }),
  );
  writeFileSync(join(root, "README.md"), fileText);
  return root;
}

describe("checkPublicSource (audit 3.3)", () => {
  it("detects an inconsistent reference under a dotted scope", () => {
    const problems = checkPublicSource(
      fixture({ fileText: `See ${WRONG_REFERENCE} instead.\n` }),
      ["README.md"],
    );
    expect(problems).toContain("README.md: inconsistent package identity");
  });

  it("detects an inconsistent devtools reference", () => {
    const devtoolsBasename = DEVTOOLS.split("/")[1];
    const wrongDevtools = ["@other.devtools", devtoolsBasename].join("/");
    const problems = checkPublicSource(
      fixture({ fileText: `See ${wrongDevtools} instead.\n` }),
      ["README.md"],
    );
    expect(problems).toContain("README.md: inconsistent package identity");
  });

  it("accepts correct dotted-scope references", () => {
    const problems = checkPublicSource(fixture(), ["README.md"]);
    expect(problems).toEqual([]);
  });

  it("detects a machine-specific absolute path", () => {
    const problems = checkPublicSource(
      fixture({ fileText: `rooted at ${MACHINE_PATH}\n` }),
      ["README.md"],
    );
    expect(problems).toContain("README.md: machine-specific absolute path");
  });

  it("rejects a main-package tarball whose version differs from package.json", () => {
    const problems = checkPublicSource(fixture({ version: "1.3.0" }), []);
    expect(problems.some((p) => p.includes(MAIN))).toBe(true);
  });

  it("rejects a devtools tarball whose version differs from the devtools package", () => {
    const problems = checkPublicSource(
      fixture({
        devtoolsRef:
          "file:../artifacts/test.scope-react-auto-components-devtools-0.9.0-3deaa7f0e992.tgz",
      }),
      [],
    );
    expect(problems.some((p) => p.includes(DEVTOOLS))).toBe(true);
  });

  it("rejects a missing devtools tarball reference", () => {
    const problems = checkPublicSource(fixture({ devtoolsRef: "" }), []);
    expect(problems.some((p) => p.includes(DEVTOOLS))).toBe(true);
  });

  it("rejects out-of-sync library and devtools versions", () => {
    const problems = checkPublicSource(
      fixture({ devtoolsVersion: "1.2.4" }),
      [],
    );
    expect(problems.some((p) => p.includes("synchronized"))).toBe(true);
  });

  it("rejects a devtools peer dependency that does not pin the library version", () => {
    const problems = checkPublicSource(fixture({ devtoolsPeer: "^1.0.0" }), []);
    expect(problems.some((p) => p.includes("peer dependency"))).toBe(true);
  });
});

describe("check-public-source CLI (spawned, audit 3.3)", () => {
  // The CLI resolves the checked root as the script's parent directory, so the
  // fixture tree is copied next to a copy of the script inside one temp root.
  const scriptCopy = (root: string): string => {
    const fx = mkdtempSync(join(tmpdir(), "rac-check-public-cli-"));
    cleanup.push(fx);
    mkdirSync(join(fx, "scripts"));
    cpSync(
      resolve("scripts/check-public-source.mjs"),
      join(fx, "scripts", "check-public-source.mjs"),
    );
    cpSync(root, fx, { recursive: true });
    return fx;
  };

  const runCli = (repo: string) =>
    spawnSync(
      process.execPath,
      [join(repo, "scripts", "check-public-source.mjs")],
      { cwd: repo, encoding: "utf8" },
    );

  const initGit = (repo: string) => {
    for (const args of [
      ["init"],
      ["config", "user.email", "t@t"],
      ["config", "user.name", "t"],
    ])
      spawnSync("git", args, { cwd: repo });
  };

  it("passes on a clean fixture and prints the checked file count", () => {
    const repo = scriptCopy(fixture());
    initGit(repo);
    const result = runCli(repo);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    // package.json, packages/devtools/package.json, test-project/package.json, README.md
    // scripts/check-public-source.mjs + 3 manifests + README.md
    expect(result.stdout).toContain("Public source checks passed (5 files).");
  });

  it("fails with a nonzero exit on an invalid fixture", () => {
    const repo = scriptCopy(
      fixture({ fileText: `See ${WRONG_REFERENCE} instead.\n` }),
    );
    initGit(repo);
    const result = runCli(repo);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("inconsistent package identity");
  });
});
