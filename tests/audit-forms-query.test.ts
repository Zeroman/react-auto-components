import { test, expect } from "vitest";
import {
  buildQuery,
  matchesQuery,
  serializeRsql,
  type QueryNode,
} from "../src/core/query";

test("cleared date range is omitted from the query", () => {
  const q = buildQuery({ range: [null, null] }, [
    { name: "range", type: "daterange", search: { match: "between" } },
  ]);
  expect(q.kind === "group" ? q.children : null).toEqual([]);
  const halfEmpty = buildQuery({ range: ["", ""] }, [
    { name: "range", type: "daterange", search: { match: "between" } },
  ]);
  expect(halfEmpty.kind === "group" ? halfEmpty.children : null).toEqual([]);
});

test("date ranges infer between from field type", () => {
  const q = buildQuery({ created: ["2024-01-01", "2024-12-31"] }, [
    { name: "created", type: "daterange" },
  ]);
  expect(q.kind === "group" ? q.children : null).toEqual([
    {
      kind: "condition",
      field: "created",
      operator: "between",
      value: ["2024-01-01", "2024-12-31"],
      ignoreCase: undefined,
    },
  ]);
  // Non-array fields keep the plain in-array semantics.
  const picks = buildQuery({ tag: ["a", "b"] }, [{ name: "tag" }]);
  expect(
    picks.kind === "group" && picks.children[0].kind === "condition"
      ? picks.children[0].operator
      : null,
  ).toBe("in");
});

test("empty-string range bounds normalize to open bounds", () => {
  const q = buildQuery({ amount: ["", 5] }, [
    { name: "amount", search: { match: "between" } },
  ]);
  expect(matchesQuery({ amount: 3 }, q)).toBe(true);
  expect(matchesQuery({ amount: 6 }, q)).toBe(false);
});

test("half-open between matches by the present bound only", () => {
  const q = buildQuery({ d: ["2025-01-01", null] }, [
    { name: "d", type: "daterange", search: { match: "between" } },
  ]);
  expect(matchesQuery({ d: "2025-06-01" }, q)).toBe(true);
  expect(matchesQuery({ d: "2024-06-01" }, q)).toBe(false);
  const upper = buildQuery({ d: [null, "2025-01-01"] }, [
    { name: "d", type: "daterange", search: { match: "between" } },
  ]);
  expect(matchesQuery({ d: "2024-06-01" }, upper)).toBe(true);
  expect(matchesQuery({ d: "2025-06-01" }, upper)).toBe(false);
});

test("serializeRsql half-open between emits only the bound side", () => {
  expect(
    serializeRsql({
      kind: "condition",
      field: "d",
      operator: "between",
      value: ["2025-01-01", null],
    }),
  ).toBe('d=ge="2025-01-01"');
  expect(
    serializeRsql({
      kind: "condition",
      field: "d",
      operator: "between",
      value: [null, "2025-12-31"],
    }),
  ).toBe('d=le="2025-12-31"');
});

test("serializeRsql rejects malformed between with an actionable RacError", () => {
  const bad = (value: unknown) =>
    serializeRsql({
      kind: "condition",
      field: "d",
      operator: "between",
      value,
    });
  // A fully open [null, null] is a no-op (""), not an error.
  for (const value of [null, "x", [1, 2, 3]]) {
    try {
      bad(value);
      throw new Error(`expected RacError for ${JSON.stringify(value)}`);
    } catch (e) {
      expect((e as Error).name).toBe("RacError");
      expect((e as Error).message).toContain("Code: RAC-QUERY-BETWEEN");
      expect((e as Error).message).toContain("Fix:");
    }
  }
});
