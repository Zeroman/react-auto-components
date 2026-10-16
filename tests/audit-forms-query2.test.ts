import { test, expect } from "vitest";
import {
  buildQuery,
  matchesQuery,
  serializeRsql,
  type QueryNode,
} from "../src/core/query";

const groupChildren = (q: QueryNode) =>
  q.kind === "group" ? q.children : null;
const firstCondition = (q: QueryNode) => {
  const kids = groupChildren(q);
  return kids && kids[0].kind === "condition" ? kids[0] : null;
};

test("ordinary in lists keep null and empty-string selections", () => {
  for (const value of [[null], [""], [null, null]]) {
    const q = buildQuery({ tag: value }, [{ name: "tag" }]);
    const c = firstCondition(q);
    expect(c?.operator).toBe("in");
    expect(c?.value).toEqual(value);
  }
  expect(serializeRsql(buildQuery({ tag: [null] }, [{ name: "tag" }]))).toBe(
    "tag=in=(null)",
  );
});

test("empty-range omission applies only to between", () => {
  expect(
    groupChildren(
      buildQuery({ d: [null, null] }, [{ name: "d", type: "daterange" }]),
    ),
  ).toEqual([]);
  expect(
    groupChildren(
      buildQuery({ d: ["", ""] }, [
        { name: "d", search: { match: "between" } },
      ]),
    ),
  ).toEqual([]);
});

test("fully open between is a no-op for direct matching too", () => {
  const open = (value: unknown): QueryNode => ({
    kind: "condition",
    field: "d",
    operator: "between",
    value,
  });
  for (const value of [
    [null, null],
    ["", ""],
    [null, ""],
    ["", null],
  ]) {
    expect(matchesQuery({ d: null }, open(value))).toBe(true);
    expect(matchesQuery({ d: "2025-01-01" }, open(value))).toBe(true);
    expect(matchesQuery({}, open(value))).toBe(true);
    expect(serializeRsql(open(value))).toBe("");
  }
});

test("half-open direct nodes normalize empty strings to open bounds", () => {
  const node = (value: unknown): QueryNode => ({
    kind: "condition",
    field: "d",
    operator: "between",
    value,
  });
  expect(serializeRsql(node(["", "2025-12-31"]))).toBe('d=le="2025-12-31"');
  expect(serializeRsql(node(["2025-01-01", ""]))).toBe('d=ge="2025-01-01"');
  expect(matchesQuery({ d: "2024-01-01" }, node(["", "2025-12-31"]))).toBe(
    true,
  );
  expect(matchesQuery({ d: "2026-01-01" }, node(["", "2025-12-31"]))).toBe(
    false,
  );
  expect(matchesQuery({ d: "2025-06-01" }, node(["2025-01-01", ""]))).toBe(
    true,
  );
});

test("bounded direct between still requires a non-null row value", () => {
  expect(
    matchesQuery(
      { d: null },
      {
        kind: "condition",
        field: "d",
        operator: "between",
        value: ["2025-01-01", null],
      },
    ),
  ).toBe(false);
});

test("malformed between shapes still raise RAC-QUERY-BETWEEN", () => {
  for (const value of [null, "x", [1, 2, 3], []]) {
    expect(() =>
      serializeRsql({
        kind: "condition",
        field: "d",
        operator: "between",
        value,
      }),
    ).toThrowError(/RAC-QUERY-BETWEEN/);
  }
});
