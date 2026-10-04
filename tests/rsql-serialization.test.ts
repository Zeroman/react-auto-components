import { test, expect } from "vitest";
import { buildQuery, serializeRsql, type QueryNode } from "../src/core/query";

const condition = (
  field: string,
  operator: "eq" | "in" | "contains" | "between" | "isNull",
  value: unknown,
  ignoreCase?: boolean,
): QueryNode => ({ kind: "condition", field, operator, value, ignoreCase });
const group = (operator: "and" | "or", children: QueryNode[]): QueryNode => ({
  kind: "group",
  operator,
  children,
});

test("RSQL operator matrix", () => {
  expect(serializeRsql(condition("name", "eq", "Alice"))).toBe('name=="Alice"');
  expect(serializeRsql(condition("count", "eq", 0))).toBe("count==0");
  expect(serializeRsql(condition("active", "eq", false))).toBe("active==false");
  expect(serializeRsql(condition("x", "isNull", null))).toBe("x==null");
  expect(serializeRsql(condition("status", "in", ["In Progress", 1]))).toBe(
    'status=in=("In Progress",1)',
  );
  expect(serializeRsql(condition("amount", "between", [1, 3]))).toBe(
    "(amount=ge=1;amount=le=3)",
  );
  expect(serializeRsql(condition("name", "contains", "Ali"))).toBe(
    'name=like="Ali"',
  );
  expect(serializeRsql(condition("name", "contains", "Ali", true))).toBe(
    'name=ilike="Ali"',
  );
});

test("RSQL string quoting escapes backslash and double quote", () => {
  expect(serializeRsql(condition("name", "eq", 'a";b\\c'))).toBe(
    'name=="a\\";b\\\\c"',
  );
});

test("RSQL groups nest and unwrap single or empty children", () => {
  expect(
    serializeRsql(
      group("and", [condition("a", "eq", 1), condition("b", "eq", 2)]),
    ),
  ).toBe("(a==1;b==2)");
  expect(
    serializeRsql(
      group("or", [condition("a", "eq", 1), condition("b", "eq", 2)]),
    ),
  ).toBe("(a==1,b==2)");
  expect(
    serializeRsql(
      group("and", [
        group("or", [condition("a", "eq", 1), condition("b", "eq", 2)]),
        condition("c", "eq", 3),
      ]),
    ),
  ).toBe("((a==1,b==2);c==3)");
  expect(serializeRsql(group("and", [condition("a", "eq", 1)]))).toBe("a==1");
  expect(serializeRsql(group("and", []))).toBe("");
  expect(
    serializeRsql(group("and", [group("or", []), condition("b", "eq", 2)])),
  ).toBe("b==2");
});

test("buildQuery output serializes to RSQL end to end", () => {
  const q = buildQuery({ term: "al", region: ["Shanghai", "Hangzhou"] }, [
    {
      name: "term",
      search: {
        match: "contains",
        ignoreCase: true,
        searchFields: ["name", "owner"],
      },
    },
    { name: "region" },
  ]);
  expect(serializeRsql(q)).toBe(
    '((name=ilike="al",owner=ilike="al");region=in=("Shanghai","Hangzhou"))',
  );
});
