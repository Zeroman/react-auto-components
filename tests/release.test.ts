import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";

/**
 * Tests the embedded Python version updater inside run.sh's
 * _release_apply_version. The Python text is extracted verbatim and run
 * against a temporary fixture directory — run.sh dispatch, git and the real
 * release path are never touched.
 */

const OLD = "0.5.2";
const NEW = "0.5.3";
const TODAY = "2026-10-15";

/** Extracts the heredoc body of the embedded Python updater from run.sh. */
function updaterScript(): string {
  const source = readFileSync(resolve("run.sh"), "utf8");
  const fn = source.indexOf("_release_apply_version");
  expect(fn, "_release_apply_version in run.sh").toBeGreaterThan(-1);
  const heredoc = source.indexOf("<< 'PY'", fn);
  expect(heredoc, "python heredoc").toBeGreaterThan(-1);
  const begin = source.indexOf("\n", heredoc) + 1;
  const end = source.indexOf("\nPY\n", begin);
  expect(end, "heredoc terminator").toBeGreaterThan(begin);
  return source.slice(begin, end + 1);
}

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const put = (root: string, path: string, text: string) => {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

function fixture(): string {
  const root = join(tmpdir(), `rac-release-${Date.now()}-${roots.length}`);
  roots.push(root);
  const changelog = "# Changelog\n\n## Unreleased\n\n- Fixed a bug.\n";
  // The version token must not be followed by an ASCII dot; the updater's
  // regex rejects `0.5.2.` style mentions.
  const readme = `# RAC\n\nCurrent version: ${OLD}\n`;
  put(root, "package.json", `${JSON.stringify(
    {
      name: "@zeroman.yang/react-auto-components",
      version: OLD,
    },
    null,
    2,
  )}\n`);
  put(
    root,
    "packages/devtools/package.json",
    `${JSON.stringify(
      {
        name: "@zeroman.yang/react-auto-components-devtools",
        version: OLD,
        peerDependencies: {
          "@zeroman.yang/react-auto-components": OLD,
        },
      },
      null,
      2,
    )}\n`,
  );
  put(
    root,
    "locales.config.json",
    `${JSON.stringify({ active: ["zh-CN"], paused: ["de"] })}\n`,
  );
  put(root, "docs/CHANGELOG.md", changelog);
  put(root, "docs/i18n/zh-CN/CHANGELOG.md", changelog);
  // Paused locales are frozen: present on disk, never listed as active.
  put(root, "docs/i18n/de/CHANGELOG.md", changelog);
  put(root, "README.md", readme);
  put(root, "docs/i18n/zh-CN/README.md", readme);
  put(root, "docs/i18n/de/README.md", readme);
  return root;
}

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function run(
  root: string,
  mode: "check" | "write",
  version = NEW,
): RunResult {
  const script = join(root, "updater.py");
  writeFileSync(script, updaterScript());
  const result = spawnSync(
    "python3",
    [script, mode, version, TODAY],
    { cwd: root, encoding: "utf8" },
  );
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Pre-seeds a version drift so the preflight guard has something to reject. */
function driftDevtools(root: string, version: string) {
  const path = join(root, "packages/devtools/package.json");
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  parsed.version = version;
  parsed.peerDependencies["@zeroman.yang/react-auto-components"] = version;
  writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
}

/** Byte snapshot of every release-relevant file, for no-partial-write checks. */
function snapshot(root: string): Map<string, string> {
  const files: string[] = [
    "package.json",
    "packages/devtools/package.json",
    "README.md",
    "docs/CHANGELOG.md",
  ];
  for (const locale of readdirSync(join(root, "docs/i18n"))) {
    files.push(`docs/i18n/${locale}/README.md`, `docs/i18n/${locale}/CHANGELOG.md`);
  }
  return new Map(files.map((path) => [path, readFileSync(join(root, path), "utf8")]));
}

test("write mode bumps component, DevTools and peer together and moves notes", () => {
  const root = fixture();
  const result = run(root, "write");
  expect(result.status, result.stderr).toBe(0);

  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const devtools = JSON.parse(
    readFileSync(join(root, "packages/devtools/package.json"), "utf8"),
  );
  expect(pkg.version).toBe(NEW);
  expect(devtools.version).toBe(NEW);
  expect(devtools.peerDependencies["@zeroman.yang/react-auto-components"]).toBe(
    NEW,
  );

  // English source and every active locale get the dated section with the
  // notes; the Unreleased heading stays above it.
  for (const path of ["docs/CHANGELOG.md", "docs/i18n/zh-CN/CHANGELOG.md"]) {
    const text = readFileSync(join(root, path), "utf8");
    expect(text).toContain("## Unreleased\n\n## 0.5.3 - 2026-10-15\n");
    expect(text).toContain("- Fixed a bug.");
  }

  // Active READMEs move to the new version; paused locale files keep their
  // exact bytes.
  expect(readFileSync(join(root, "README.md"), "utf8")).toContain(NEW);
  expect(readFileSync(join(root, "README.md"), "utf8")).not.toContain(OLD);
  expect(readFileSync(join(root, "docs/i18n/zh-CN/README.md"), "utf8")).toContain(
    NEW,
  );
  const pausedChangelog = readFileSync(
    join(root, "docs/i18n/de/CHANGELOG.md"),
    "utf8",
  );
  expect(pausedChangelog).toContain("## Unreleased");
  expect(pausedChangelog).not.toContain(NEW);
  expect(readFileSync(join(root, "docs/i18n/de/README.md"), "utf8")).toContain(
    OLD,
  );
});

test("check mode validates without writing anything", () => {
  const root = fixture();
  const before = snapshot(root);
  const result = run(root, "check");
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("release notes found");
  expect(snapshot(root)).toEqual(before);
});

test("version mismatch fails before any file is touched", () => {
  const root = fixture();
  driftDevtools(root, "0.5.1");
  const before = snapshot(root);
  const result = run(root, "write");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("must match before releasing");
  expect(snapshot(root)).toEqual(before);
});

test("re-releasing the current version only validates notes and READMEs", () => {
  // Mirrors the repository state after the metadata pre-bump: everything at
  // 0.5.3, READMEs already updated, notes under Unreleased awaiting the date.
  const root = fixture();
  driftDevtools(root, NEW);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.version = NEW;
  writeFileSync(join(root, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  for (const path of ["README.md", "docs/i18n/zh-CN/README.md"])
    put(root, path, `# RAC\n\nCurrent version: ${NEW}\n`);

  const check = run(root, "check", NEW);
  expect(check.status, check.stderr).toBe(0);

  const before = snapshot(root);
  const write = run(root, "write", NEW);
  expect(write.status, write.stderr).toBe(0);
  expect(write.stdout).toContain("updated 2 changelogs and 0 READMEs");
  expect(readFileSync(join(root, "docs/CHANGELOG.md"), "utf8")).toContain(
    "## 0.5.3 - 2026-10-15",
  );
  // Versions were already correct; only the changelog headings moved.
  expect(snapshot(root)).toEqual(
    new Map([...before].map(([path, text]) => [
      path,
      path.endsWith("CHANGELOG.md") && path !== "docs/i18n/de/CHANGELOG.md"
        ? text.replace("## Unreleased\n", "## Unreleased\n\n## 0.5.3 - 2026-10-15\n")
        : text,
    ])),
  );
});

test("an empty Unreleased section fails without partial writes", () => {
  const root = fixture();
  put(root, "docs/CHANGELOG.md", "# Changelog\n\n## Unreleased\n");
  const before = snapshot(root);
  const result = run(root, "write");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("unreleased section has no notes");
  expect(snapshot(root)).toEqual(before);
});

test("an already-dated latest section fails without partial writes", () => {
  const root = fixture();
  put(root, "docs/CHANGELOG.md", "# Changelog\n\n## 0.5.2 - 2026-01-01\n\n- Old.\n");
  const before = snapshot(root);
  const result = run(root, "write");
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("unreleased heading");
  expect(snapshot(root)).toEqual(before);
});
