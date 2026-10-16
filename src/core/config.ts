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
const isPlainObject = (v: object): boolean => {
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};
/**
 * Clone mutable data (plain objects, arrays, Dates, Maps and Sets) so form state never
 * aliases caller-owned values. Cycles are preserved. Files/Blobs, functions,
 * and class instances keep their identity on purpose: uploads must stay
 * reference-stable and opaque prototypes are not safely cloneable.
 */
export function cloneValue<T>(value: T, seen = new Map<object, unknown>()): T {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value) as T;
  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    seen.set(value, copy);
    return copy as T;
  }
  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [key, entry] of value)
      copy.set(cloneValue(key, seen), cloneValue(entry, seen));
    return copy as T;
  }
  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const entry of value) copy.add(cloneValue(entry, seen));
    return copy as T;
  }
  if (value instanceof RegExp) {
    const copy = new RegExp(value.source, value.flags);
    copy.lastIndex = value.lastIndex;
    return copy as T;
  }
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  const copy = Array.isArray(value)
    ? new Array(value.length)
    : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  // Define own data properties: assigning __proto__ would change the prototype.
  // Object.entries also preserves sparse-array indices instead of shifting them.
  for (const [key, entry] of Object.entries(value))
    Object.defineProperty(copy, key, {
      value: cloneValue(entry, seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  return copy as T;
}
export function defaults<T extends object>(
  fields: readonly { name?: string; defaultValue?: unknown }[],
  initial: Partial<T> = {},
): T {
  const entries = new Map<string, unknown>();
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
      entries.set(f.name, cloneValue(f.defaultValue));
  }
  // Explicit `undefined` in `initial` must not erase a field default.
  for (const [k, v] of Object.entries(initial))
    if (v !== undefined) entries.set(k, cloneValue(v));
  return Object.fromEntries(entries) as T;
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
  const pairs = new WeakMap<object, WeakSet<object>>();
  function compare(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true;
    if (
      !left ||
      !right ||
      typeof left !== "object" ||
      typeof right !== "object"
    )
      return false;
    if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right))
      return false;
    if (left instanceof Date && right instanceof Date)
      return Object.is(left.getTime(), right.getTime());
    if (left instanceof Blob || right instanceof Blob) return false;
    if (left instanceof RegExp && right instanceof RegExp)
      return (
        left.source === right.source &&
        left.flags === right.flags &&
        left.lastIndex === right.lastIndex
      );
    if (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length !== right.length
    )
      return false;
    if (pairs.get(left)?.has(right)) return true;
    const matches = pairs.get(left) ?? new WeakSet<object>();
    matches.add(right);
    pairs.set(left, matches);
    if (left instanceof Map && right instanceof Map)
      return (
        left.size === right.size &&
        [...left].every(
          ([key, value]) => right.has(key) && compare(value, right.get(key)),
        )
      );
    if (left instanceof Set && right instanceof Set)
      return (
        left.size === right.size && [...left].every((value) => right.has(value))
      );
    if (!Array.isArray(left) && !isPlainObject(left)) return false;
    const keys = Object.keys(left);
    return (
      keys.length === Object.keys(right).length &&
      keys.every(
        (key) =>
          Object.hasOwn(right, key) &&
          compare(
            (left as Record<string, unknown>)[key],
            (right as Record<string, unknown>)[key],
          ),
      )
    );
  }
  return compare(a, b);
}
