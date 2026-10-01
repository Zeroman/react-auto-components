import { test, expect } from "vitest";
import { updateColumnFilter } from "../src/components/AutoTable/TableHeader";
import { emptyQuery, matchesQuery } from "../src/core/query";
test("column filters combine and clearing one preserves the other", () => {
  const q = updateColumnFilter(
    updateColumnFilter(emptyQuery, "name", ["甲", "乙"]),
    "active",
    [false],
  );
  expect(matchesQuery({ name: "甲", active: false }, q)).toBe(true);
  expect(matchesQuery({ name: "甲", active: true }, q)).toBe(false);
  const next = updateColumnFilter(q, "name", []);
  expect(matchesQuery({ name: "丙", active: false }, next)).toBe(true);
});
