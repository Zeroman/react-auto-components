import { expect, test } from "vitest";
import { defaults, normalizeOptions, safeStorage } from "../src/core/config";
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
      { value: 0, label: "零" },
      { value: false, label: "否" },
    ]),
  ).toEqual([
    { value: 0, label: "零" },
    { value: false, label: "否" },
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
