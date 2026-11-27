import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Declaration post-processing for dist/. Vite extracts CSS into style.css, and
// TypeScript preserves the extensionless relative specifiers from src/ because
// tsconfig.build.json resolves with "Bundler". Consumers on
// moduleResolution: node16/nodenext (the tsc --init default) need explicit
// ".js" extensions and "/index.js" for directory imports, so add them here.

function defaultDist() {
  return join(fileURLToPath(new URL("../", import.meta.url)), "dist");
}

function declarationFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return declarationFiles(full);
    return entry.name.endsWith(".d.ts") ? [full] : [];
  });
}

function isDirectory(target) {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Rewrite relative specifiers in one declaration file so they resolve under
 * node16/nodenext. Side-effect CSS imports are dropped: they carry no types and
 * the package exposes the consolidated ./style.css entry instead.
 */
export function addDeclarationExtensions(source, { dir, directoryOf = isDirectory } = {}) {
  const withoutCss = source.replace(
    /^[ \t]*import[ \t]+["'][^"']+\.css["'];?[ \t]*\r?\n/gm,
    "",
  );
  return withoutCss.replace(
    /(\bfrom[ \t]+|\bimport[ \t]*\([ \t]*|\bimport[ \t]+)(["'])(\.\.?\/[^"']+)\2/g,
    (match, prefix, quote, specifier) => {
      if (/\.(?:js|json)$/.test(specifier)) return match;
      const suffix = directoryOf(resolve(dir, specifier)) ? "/index.js" : ".js";
      return `${prefix}${quote}${specifier}${suffix}${quote}`;
    },
  );
}

export function finalizeDeclarations(dist = defaultDist()) {
  let changed = 0;
  for (const file of declarationFiles(dist)) {
    const source = readFileSync(file, "utf8");
    const next = addDeclarationExtensions(source, { dir: dirname(file) });
    if (next !== source) {
      writeFileSync(file, next);
      changed += 1;
    }
  }
  return changed;
}

const isMain = (() => {
  try {
    return (
      pathToFileURL(resolve(process.argv[1])).href === import.meta.url
    );
  } catch {
    return false;
  }
})();

if (isMain) {
  const changed = finalizeDeclarations();
  console.log(`declaration imports finalized in ${changed} files`);
}
