import { expect, test } from "vitest";
import {
  defaults,
  normalizeOptions,
  resolveHidden,
  safeStorage,
} from "../src/core/config";
test("defaults preserve falsy values and reject duplicate names without mutating input", () => {
  const fields = Object.freeze([
    Object.freeze({ name: "enabled", defaultValue: false }),
    Object.freeze({ name: "count", defaultValue: 0 }),
  ]);
  expect(defaults(fields, {})).toEqual({ enabled: false, count: 0 });
  expect(() => defaults([{ name: "x" }, { name: "x" }], {})).toThrow("x");
  expect(defaults(fields, { count: 3 })).toEqual({ enabled: false, count: 3 });
});
test("options preserve boolean and numeric identity", () => {
  expect(
    normalizeOptions([
      { value: 0, label: "Zero" },
      { value: false, label: "No" },
    ]),
  ).toEqual([
    { value: 0, label: "Zero" },
    { value: false, label: "No" },
  ]);
});
test("storage tolerates corrupt or absent values", () => {
  localStorage.setItem("bad", "{");
  expect(safeStorage.get("bad")).toBeUndefined();
  safeStorage.set("ok", { a: 1 });
  expect(safeStorage.get("ok")).toEqual({ a: 1 });
  safeStorage.remove("ok");
  expect(safeStorage.get("ok")).toBeUndefined();
});
test("resolveHidden handles boolean and function values", () => {
  expect(resolveHidden(true)).toBe(true);
  expect(resolveHidden(false)).toBe(false);
  expect(resolveHidden(undefined)).toBe(false);
  expect(resolveHidden(() => true)).toBe(true);
  expect(resolveHidden(() => false)).toBe(false);
  expect(resolveHidden((x: number) => x > 5, 10)).toBe(true);
  expect(resolveHidden((x: number) => x > 5, 2)).toBe(false);
});
