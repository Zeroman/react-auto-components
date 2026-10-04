import { RacError } from "./errors";
import type { AnyField, Field, Option, StorageAdapter } from "./types";
export function resolve<V, T>(
  value: V | ((values: T) => V) | undefined,
  values: T,
  fallback: V,
): V {
  return typeof value === "function"
    ? (value as (v: T) => V)(values)
    : (value ?? fallback);
}
export function resolveHidden(hidden?: boolean | (() => boolean)): boolean;
export function resolveHidden<T>(
  hidden?: boolean | ((context: T) => boolean),
  context?: T,
): boolean;
export function resolveHidden<T>(
  hidden?: boolean | ((context: T) => boolean),
  context?: T,
): boolean {
  return typeof hidden === "function"
    ? (hidden as (c?: T) => boolean)(context)
    : !!hidden;
}
export function defaults<T extends object>(
  fields: readonly { name?: string; defaultValue?: unknown }[],
  initial: Partial<T> = {},
): T {
  const out: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const f of fields) {
    if (!f.name) continue;
    if (seen.has(f.name))
      throw new RacError(
        "AutoForm",
        "RAC-FIELD-DUPLICATE",
        `fields contains a duplicate name "${f.name}".`,
        "Give every named field a unique name. Title, tip, append, and button fields have no name and are skipped.",
      );
    seen.add(f.name);
    if (f.defaultValue !== undefined)
      out[f.name] = structuredClone(f.defaultValue);
  }
  return { ...out, ...initial } as T;
}
export function normalizeOptions(
  options: readonly Option[],
): readonly Option[] {
  return options.map((o) => ({ ...o }));
}
export const safeStorage: StorageAdapter = {
  get(key) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  },
  set(key, value) {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage is optional; keep working in memory. */
    }
  },
  remove(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* Storage is optional. */
    }
  },
};
/**
 * Skip the {@link Field} discriminant. `select` without `options` then compiles.
 * Dev mode still warns. Prefer a typed `Field<T>` literal.
 */
export function unsafeField<T extends object>(field: AnyField<T>): Field<T> {
  return field as Field<T>;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  return (
    ak.length === bk.length &&
    ak.every(
      (k) =>
        Object.hasOwn(b, k) &&
        equal(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k],
        ),
    )
  );
}
