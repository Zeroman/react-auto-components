import { useAutoText } from "../../core/i18n";
import type { AutoColumn } from "./types";
import type { QueryNode } from "../../core/query";
export function FilterEditor<T extends object>({
  columns,
  value,
  onChange,
}: {
  columns: readonly AutoColumn<T>[];
  value: QueryNode;
  onChange: (value: QueryNode) => void;
}) {
  const tr = useAutoText();
  const group =
    value.kind === "group"
      ? value
      : {
          kind: "group" as const,
          operator: "and" as const,
          children: [value],
        };
  const change = (index: number, node: QueryNode) =>
    onChange({
      ...group,
      children: group.children.map((c, i) => (i === index ? node : c)),
    });
  return (
    <div>
      <label>
        {tr("Match")}{" "}
        <select
          aria-label={tr("Match")}
          value={group.operator}
          onChange={(e) =>
            onChange({
              ...group,
              operator: e.target.value as "and" | "or",
            })
          }
        >
          <option value="and">{tr("Match all")}</option>
          <option value="or">{tr("Match any")}</option>
        </select>
      </label>
      {group.children.map((node, index) =>
        node.kind === "group" ? (
          <div className="auto-setting-row" key={index}>
            <span>{tr("Nested group (edit it in advanced mode)")}</span>
            <button
              onClick={() =>
                onChange({
                  ...group,
                  children: group.children.filter((_, i) => i !== index),
                })
              }
            >
              {tr("Remove")}
            </button>
          </div>
        ) : (
          <div className="auto-setting-row" key={index}>
            <select
              aria-label={tr("Filter field {0}", [index + 1])}
              value={node.field}
              onChange={(e) =>
                change(index, {
                  ...node,
                  field: e.target.value,
                  value: "",
                })
              }
            >
              {columns.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label ?? c.key}
                </option>
              ))}
            </select>
            <select
              aria-label={tr("Filter operator {0}", [index + 1])}
              value={node.operator}
              onChange={(e) => {
                const operator = e.target.value as typeof node.operator;
                change(index, {
                  ...node,
                  operator,
                  value:
                    operator === "between"
                      ? ["", ""]
                      : operator === "in"
                        ? []
                        : "",
                });
              }}
            >
              {[
                ["eq", tr("Equals")],
                ["contains", tr("Contains")],
                ["in", tr("In")],
                ["between", tr("Between")],
                ["isNull", tr("Is empty")],
              ].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            {node.operator !== "isNull" && (
              <input
                aria-label={tr("Filter value {0}", [index + 1])}
                placeholder={
                  node.operator === "between"
                    ? tr("Min, max")
                    : node.operator === "in"
                      ? tr("Value 1, value 2")
                      : tr("Value")
                }
                value={
                  Array.isArray(node.value)
                    ? node.value.join(",")
                    : String(node.value ?? "")
                }
                onChange={(e) => {
                  const parse = (s: string) =>
                    columns.find((c) => c.key === node.field)?.type === "number"
                      ? Number(s)
                      : s;
                  change(index, {
                    ...node,
                    value:
                      node.operator === "between" || node.operator === "in"
                        ? e.target.value.split(",").map(parse)
                        : parse(e.target.value),
                  });
                }}
              />
            )}
            <button
              onClick={() =>
                onChange({
                  ...group,
                  children: group.children.filter((_, i) => i !== index),
                })
              }
            >
              {tr("Remove")}
            </button>
          </div>
        ),
      )}
      <button
        onClick={() => {
          if (columns[0])
            onChange({
              ...group,
              children: [
                ...group.children,
                {
                  kind: "condition",
                  field: columns[0].key,
                  operator: "contains",
                  value: "",
                },
              ],
            });
        }}
      >
        {tr("Add condition")}
      </button>
    </div>
  );
}
