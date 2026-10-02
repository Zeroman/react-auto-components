import { test, expect } from "vitest";
import { updateColumnFilter } from "../src/components/AutoTable/TableHeader";
import { emptyQuery, matchesQuery } from "../src/core/query";
test("column filters combine and clearing one preserves the other", () => {
  const q = updateColumnFilter(
    updateColumnFilter(emptyQuery, "name", ["A", "B"]),
    "active",
    [false],
  );
  expect(matchesQuery({ name: "A", active: false }, q)).toBe(true);
  expect(matchesQuery({ name: "A", active: true }, q)).toBe(false);
  const next = updateColumnFilter(q, "name", []);
  expect(matchesQuery({ name: "C", active: false }, next)).toBe(true);
});
