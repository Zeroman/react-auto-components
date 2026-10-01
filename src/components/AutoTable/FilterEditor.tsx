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
        {tr("条件关系")}{" "}
        <select
          aria-label={tr("条件关系")}
          value={group.operator}
          onChange={(e) =>
            onChange({
              ...group,
              operator: e.target.value as "and" | "or",
            })
          }
        >
          <option value="and">{tr("满足全部")}</option>
          <option value="or">{tr("满足任一")}</option>
        </select>
      </label>
      {group.children.map((node, index) =>
        node.kind === "group" ? (
          <div className="auto-setting-row" key={index}>
            <span>{tr("嵌套条件组（可在高级编辑中调整）")}</span>
            <button
              onClick={() =>
                onChange({
                  ...group,
                  children: group.children.filter((_, i) => i !== index),
                })
              }
            >
              {tr("移除")}
            </button>
          </div>
        ) : (
          <div className="auto-setting-row" key={index}>
            <select
              aria-label={tr("筛选字段 {0}", [index + 1])}
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
              aria-label={tr("筛选运算 {0}", [index + 1])}
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
                ["eq", tr("等于")],
                ["contains", tr("包含")],
                ["in", tr("属于")],
                ["between", tr("范围")],
                ["isNull", tr("为空")],
              ].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            {node.operator !== "isNull" && (
              <input
                aria-label={tr("筛选值 {0}", [index + 1])}
                placeholder={
                  node.operator === "between"
                    ? tr("最小值,最大值")
                    : node.operator === "in"
                      ? tr("值1,值2")
                      : tr("输入值")
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
              {tr("移除")}
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
        {tr("添加条件")}
      </button>
    </div>
  );
}
