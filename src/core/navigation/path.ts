/**
 * Utilities for normalizing and resolving navigation paths.
 * Paths are stable arrays of string identifiers with ':' delimiter for string serialization.
 */

export function parsePath(input?: string | readonly string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(String).filter((segment) => segment.length > 0);
  }
  const str = String(input).trim();
  if (!str) return [];
  return str.split(":").filter((segment) => segment.length > 0);
}

export function joinPath(segments: readonly string[]): string {
  return segments.join(":");
}

export function pathsEqual(
  a: readonly string[],
  b: readonly string[],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isSubpath(
  parent: readonly string[],
  child: readonly string[],
): boolean {
  if (child.length < parent.length) return false;
  for (let i = 0; i < parent.length; i++) {
    if (child[i] !== parent[i]) return false;
  }
  return true;
}

/**
 * Resolves a target path relative to a base path.
 * If target starts with `./` or `../` (or relative array element), resolves against basePath.
 * Otherwise treats target as an absolute path.
 */
export function resolveRelativePath(
  target: string | readonly string[],
  basePath: readonly string[],
): string[] {
  if (Array.isArray(target)) {
    if (!target.length) return [...basePath];
    const first = target[0];
    if (
      first === "." ||
      first === ".." ||
      first.startsWith("./") ||
      first.startsWith("../")
    ) {
      return resolveStringRelative(target.join("/"), basePath);
    }
    return parsePath(target);
  }

  const str = String(target).trim();
  if (
    str.startsWith("./") ||
    str.startsWith("../") ||
    str === "." ||
    str === ".."
  ) {
    return resolveStringRelative(str, basePath);
  }

  return parsePath(str);
}

function resolveStringRelative(
  str: string,
  basePath: readonly string[],
): string[] {
  const parts = str.split(/[/:/]/).filter((p) => p.length > 0);
  const result = [...basePath];

  for (const part of parts) {
    if (part === ".") {
      continue;
    } else if (part === "..") {
      if (result.length > 0) {
        result.pop();
      }
    } else {
      result.push(part);
    }
  }

  return result;
}
