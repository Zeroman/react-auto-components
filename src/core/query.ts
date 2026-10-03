import { RacError, devWarn, valueKind } from "./errors";
import type { SearchConfig, MatchOperator } from "./types";

/**
 * Filter tree shared by search panels and tables.
 * A `"between"` condition's `value` must be a two-item array. `"in"` must be an array.
 * `isQueryNode` rejects other shapes before they are evaluated.
 */
export type QueryNode =
  | {
      kind: "condition";
      field: string;
      operator: "eq" | "in" | "contains" | "between" | "isNull";
      value: unknown;
      ignoreCase?: boolean;
    }
  | { kind: "group"; operator: "and" | "or"; children: readonly QueryNode[] };
export const emptyQuery: QueryNode = {
  kind: "group",
  operator: "and",
  children: [],
};
/**
 * The search slice of a field. `buildQuery` reads only these props.
 * `match: "between"` expects the form value to be `[from, to]`. A scalar warns in dev and does not match rows.
 */
export interface SearchField {
  name?: string;
  search?: SearchConfig;
  match?: MatchOperator;
  ignoreCase?: boolean;
  includeNull?: boolean;
  searchFields?: readonly string[];
}
export function buildQuery(
  values: object,
  fields: readonly SearchField[],
): QueryNode {
  const children: QueryNode[] = [];
  for (const f of fields) {
    if (!f.name) continue;
    const v = (values as Record<string, unknown>)[f.name];
    const s = f.search;
    const match = s?.match ?? f.match;
    const ignoreCase = s?.ignoreCase ?? f.ignoreCase;
    const includeNull = s?.includeNull ?? f.includeNull;
    const searchFields = s?.searchFields ?? f.searchFields;
    if (
      match !== "isNull" &&
      (v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && !v.length))
    )
      continue;
    const operator = match ?? (Array.isArray(v) ? "in" : "eq");
    if (operator === "between" && !(Array.isArray(v) && v.length === 2)) {
      devWarn(
        "AutoSearch",
        "RAC-FIELD-BETWEEN",
        `field "${f.name}" match="between" received ${valueKind(v)}, not a two-item array.`,
        "Store [from, to] on this field. A scalar is ignored by matchesQuery and still serializes badly.",
      );
    }
    const conditions: QueryNode[] = (searchFields ?? [f.name]).map(
      (field) => {
        const node: QueryNode = {
          kind: "condition",
          field,
          operator,
          value: v,
          ignoreCase,
        };
        return includeNull
          ? {
              kind: "group",
              operator: "or",
              children: [
                node,
                { kind: "condition", field, operator: "isNull", value: null },
              ],
            }
          : node;
      },
    );
    children.push(
      conditions.length === 1
        ? conditions[0]
        : { kind: "group", operator: "or", children: conditions },
    );
  }
  return { kind: "group", operator: "and", children };
}
export function matchesQuery(row: object, q: QueryNode): boolean {
  if (q.kind === "group")
    return q.operator === "and"
      ? q.children.every((c) => matchesQuery(row, c))
      : q.children.some((c) => matchesQuery(row, c));
  const raw = (row as Record<string, unknown>)[q.field];
  const normalize = (v: unknown) =>
    q.ignoreCase && typeof v === "string" ? v.toLocaleLowerCase() : v;
  const a = normalize(raw),
    b = normalize(q.value);
  switch (q.operator) {
    case "isNull":
      return raw == null;
    case "eq":
      return Object.is(a, b);
    case "contains":
      return a != null && String(a).includes(String(b));
    case "in":
      return (
        Array.isArray(q.value) &&
        q.value.some((v) => Object.is(a, normalize(v)))
      );
    case "between":
      return (
        Array.isArray(q.value) &&
        raw != null &&
        (q.value[0] == null || raw >= q.value[0]) &&
        (q.value[1] == null || raw <= q.value[1])
      );
  }
}
export function serializeRsql(q: QueryNode): string {
  if (q.kind === "group") {
    const parts = q.children.map(serializeRsql).filter(Boolean);
    return parts.length > 1
      ? `(${parts.join(q.operator === "and" ? ";" : ",")})`
      : (parts[0] ?? "");
  }
  if (!/^[\w.]+$/.test(q.field))
    throw new RacError(
      "serializeRsql",
      "RAC-QUERY-FIELD",
      `field "${q.field}" is not a safe RSQL identifier.`,
      "Use only letters, digits, underscore, and dots (regular expression /^[\\w.]+$/). Rename the column or map it before serializing.",
    );
  const quote = (v: unknown) =>
    typeof v === "string"
      ? `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
      : String(v);
  if (q.operator === "isNull") return `${q.field}==null`;
  if (q.operator === "in")
    return `${q.field}=in=(${(Array.isArray(q.value) ? q.value : []).map(quote).join(",")})`;
  if (q.operator === "between") {
    const [a, b] = q.value as unknown[];
    return `(${q.field}=ge=${quote(a)};${q.field}=le=${quote(b)})`;
  }
  return `${q.field}${q.operator === "contains" ? (q.ignoreCase ? "=ilike=" : "=like=") : "=="}${quote(q.value)}`;
}

/** Validate persisted/untrusted query shapes before evaluating them. */
export function isQueryNode(
  value: unknown,
  keys?: readonly string[],
  depth = 0,
): value is QueryNode {
  if (!value || typeof value !== "object" || depth > 32) return false;
  const n = value as Record<string, unknown>;
  if (n.kind === "group")
    return (
      (n.operator === "and" || n.operator === "or") &&
      Array.isArray(n.children) &&
      n.children.length <= 1000 &&
      n.children.every((c) => isQueryNode(c, keys, depth + 1))
    );
  if (
    n.kind !== "condition" ||
    typeof n.field !== "string" ||
    (keys && !keys.includes(n.field))
  )
    return false;
  if (
    !["eq", "in", "contains", "between", "isNull"].includes(String(n.operator))
  )
    return false;
  if (n.operator === "in") return Array.isArray(n.value);
  if (n.operator === "between")
    return Array.isArray(n.value) && n.value.length === 2;
  return true;
}
