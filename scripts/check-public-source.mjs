import { readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Scans tracked source/docs for package-identity drift and machine-specific
// paths, and verifies test-project pins tarballs of the currently published
// versions of both the library and the devtools package.
// Exported for tests; runs as a CLI when executed directly.
export function checkPublicSource(root, paths) {
  const rootUrl =
    root instanceof URL
      ? root
      : pathToFileURL(root.endsWith("/") ? root : `${root}/`);
  const readJson = (relative) =>
    JSON.parse(readFileSync(new URL(`./${relative}`, rootUrl), "utf8"));
  const packages = [
    readJson("package.json"),
    readJson("packages/devtools/package.json"),
  ];
  const names = new Set(packages.map(({ name }) => name));
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Scopes may contain dots (e.g. @zeroman.yang); the character class must
  // include them or every namespaced reference goes unchecked. Both package
  // basenames are identity-checked, not just the library's.
  const basenames = packages
    .map(({ name }) => name.split("/").at(-1))
    .sort((a, b) => b.length - a.length)
    .map(escape);
  const packageReference = new RegExp(
    `@[a-zA-Z0-9_.-]+/(?:${basenames.join("|")})(?=[/\\s'"\x60,;)}]|$)`,
    "g",
  );
  const problems = [];
  for (const path of paths) {
    if (!/\.(?:md|[cm]?[jt]sx?|json|ya?ml|html|css)$/.test(path)) continue;
    let text;
    try {
      text = readFileSync(new URL(`./${path}`, rootUrl), "utf8");
    } catch (error) {
      // Git still lists tracked files deleted in the working tree until staging.
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (
      [...text.matchAll(packageReference)].some(
        ([reference]) => !names.has(reference),
      )
    )
      problems.push(`${path}: inconsistent package identity`);
    if (/(?:\/Users\/|\/Volumes\/|\/home\/)[^\s"'<>]+/.test(text))
      problems.push(`${path}: machine-specific absolute path`);
  }
  const consumer = readJson("test-project/package.json");
  for (const { name, version } of packages) {
    const slug = name.replace(/^@/, "").replaceAll("/", "-");
    const reference =
      consumer.dependencies?.[name] ?? consumer.devDependencies?.[name];
    const expectedTarball = new RegExp(
      `^file:\\.\\./artifacts/${escape(slug)}-${escape(version)}-[0-9a-f]{12}\\.tgz$`,
    );
    if (!expectedTarball.test(reference ?? ""))
      problems.push(
        `test-project/package.json: ${name} tarball does not match version ${version} (run pnpm prepare:test-project)`,
      );
  }
  const [library, devtools] = packages;
  if (library.version !== devtools.version)
    problems.push(
      `version ${library.version} and devtools version ${devtools.version} must stay synchronized`,
    );
  const devtoolsPeerLibrary = devtools.peerDependencies?.[library.name];
  if (devtoolsPeerLibrary !== library.version)
    problems.push(
      `packages/devtools/package.json: peer dependency on ${library.name} must pin version ${library.version}`,
    );
  return problems;
}

// Node resolves import.meta.url through symlinks (e.g. macOS /var ->
// /private/var), so the invoked argv[1] must be realpathed before comparing.
// Compare as strings: a URL object never equals a string.
const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return (
      pathToFileURL(realpathSync(resolve(process.argv[1]))).href ===
      import.meta.url
    );
  } catch {
    return false;
  }
})();
if (isMain) {
  const root = fileURLToPath(new URL("../", import.meta.url));
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
  const problems = checkPublicSource(pathToFileURL(root), paths);
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else console.log(`Public source checks passed (${paths.length} files).`);
}
