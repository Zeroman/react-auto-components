import { test, expect } from "vitest";
import { buildQuery, matchesQuery, serializeRsql } from "../src/core/query";
test("zero false and empty values", () => {
  const q = buildQuery({ count: 0, active: false, text: "" }, [
    { name: "count" },
    { name: "active" },
    { name: "text" },
  ]);
  expect(matchesQuery({ count: 0, active: false }, q)).toBe(true);
  expect(matchesQuery({ count: 1, active: false }, q)).toBe(false);
  expect(serializeRsql(q)).toContain("false");
});
test("linked fields OR, fields AND, case and inclusive ranges", () => {
  const q = buildQuery({ term: "AL", amount: [1, 3] }, [
    {
      name: "term",
      match: "contains",
      ignoreCase: true,
      searchFields: ["first", "last"],
    },
    { name: "amount", match: "between" },
  ]);
  expect(matchesQuery({ first: "Bob", last: "Allen", amount: 3 }, q)).toBe(
    true,
  );
  expect(matchesQuery({ first: "Allen", amount: 4 }, q)).toBe(false);
});
test("null and quoted RSQL", () => {
  expect(
    matchesQuery(
      { x: null },
      buildQuery({ x: null }, [{ name: "x", match: "isNull" }]),
    ),
  ).toBe(true);
  expect(
    serializeRsql({
      kind: "condition",
      field: "name",
      operator: "eq",
      value: 'a";b',
    }),
  ).toBe('name=="a\\";b"');
});

test("search sub-object configuration builds valid query node", () => {
  const q = buildQuery({ keyword: "test", range: [10, 20] }, [
    {
      name: "keyword",
      search: {
        match: "contains",
        ignoreCase: true,
        searchFields: ["title", "description"],
      },
    },
    {
      name: "range",
      search: {
        match: "between",
      },
    },
  ]);
  expect(
    matchesQuery({ title: "Testing title", description: "foo", range: 15 }, q),
  ).toBe(true);
  expect(
    matchesQuery({ title: "Other", description: "testing desc", range: 10 }, q),
  ).toBe(true);
  expect(
    matchesQuery({ title: "test", description: "foo", range: 25 }, q),
  ).toBe(false);
});

