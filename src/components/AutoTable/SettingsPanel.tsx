import { useAutoText } from "../../core/i18n";
import { useState } from "react";
import { FilterEditor } from "./FilterEditor";
import {
  active,
  replaceActive,
  type TableSettings,
  type Presets,
} from "./settings";
import type { AutoColumn, TableSort } from "./types";
import type { QueryNode } from "../../core/query";
export function SettingsPanel<T extends object>({
  value,
  columns,
  onChange,
}: {
  value: TableSettings;
  columns: readonly AutoColumn<T>[];
  onChange: (v: TableSettings) => void;
}) {
  const tr = useAutoText();
  const [tab, setTab] = useState<keyof TableSettings>("layout");
  const [name, setName] = useState("");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const group = value[tab] as Presets<unknown>;
  function changeGroup(g: Presets<unknown>) {
    onChange({
      ...value,
      [tab]: g,
    });
  }
  const layout = active(value.layout),
    sort = active(value.sort),
    exp = active(value.export);
  const setLayout = (next: typeof layout) =>
    onChange({
      ...value,
      layout: replaceActive(value.layout, next),
    });
  const setSort = (next: TableSort[]) =>
    onChange({
      ...value,
      sort: replaceActive(value.sort, next),
    });
  return (
    <div className="auto-settings">
      <div className="auto-actions">
        {(["layout", "sort", "filter", "export"] as const).map((k, i) => (
          <button
            key={k}
            type="button"
            aria-pressed={tab === k}
            onClick={() => {
              setTab(k);
              setRaw("");
              setError("");
            }}
          >
            {[tr("列布局"), tr("排序"), tr("筛选"), tr("导出")][i]}
          </button>
        ))}
      </div>
      <div className="auto-actions auto-preset">
        <select
          aria-label={tr("当前方案")}
          value={group.activeId}
          onChange={(e) =>
            changeGroup({
              ...group,
              activeId: e.target.value,
            })
          }
        >
          {group.presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id === "default" ? tr("默认方案") : p.name}
            </option>
          ))}
        </select>
        <input
          aria-label={tr("方案名称")}
          placeholder={tr("方案名称")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            const id = crypto.randomUUID();
            changeGroup({
              ...group,
              activeId: id,
              presets: [
                ...group.presets,
                {
                  id,
                  name: name.trim(),
                  value: structuredClone(active(group)),
                },
              ],
            });
            setName("");
          }}
        >
          {tr("另存方案")}
        </button>
        <button
          disabled={!name.trim()}
          onClick={() => {
            changeGroup({
              ...group,
              presets: group.presets.map((p) =>
                p.id === group.activeId
                  ? {
                      ...p,
                      name: name.trim(),
                    }
                  : p,
              ),
            });
            setName("");
          }}
        >
          {tr("重命名")}
        </button>
        <button
          disabled={group.presets.length === 1}
          onClick={() => {
            const presets = group.presets.filter(
              (p) => p.id !== group.activeId,
            );
            changeGroup({
              ...group,
              presets,
              activeId: presets[0].id,
            });
          }}
        >
          {tr("删除方案")}
        </button>
      </div>
      {tab === "layout" && (
        <>
          <label>
            {tr("密度")}{" "}
            <select
              value={layout.density}
              onChange={(e) =>
                setLayout({
                  ...layout,
                  density: e.target.value as typeof layout.density,
                })
              }
            >
              <option value="inherit">{tr("跟随全局")}</option>
              <option value="compact">{tr("紧凑")}</option>
              <option value="normal">{tr("标准")}</option>
              <option value="comfortable">{tr("宽松")}</option>
            </select>
          </label>
          {layout.order.map((key, index) => {
            const c = columns.find((c) => c.key === key);
            if (!c) return null;
            const move = (to: number) => {
              const order = [...layout.order];
              order.splice(index, 1);
              order.splice(to, 0, key);
              setLayout({
                ...layout,
                order,
              });
            };
            return (
              <div
                className="auto-setting-row"
                key={key}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = layout.order.indexOf(
                    e.dataTransfer.getData("text/plain"),
                  );
                  if (from < 0) return;
                  const order = [...layout.order];
                  const [item] = order.splice(from, 1);
                  order.splice(index, 0, item);
                  setLayout({
                    ...layout,
                    order,
                  });
                }}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={!layout.hidden.includes(key)}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        hidden: e.target.checked
                          ? layout.hidden.filter((k) => k !== key)
                          : [...layout.hidden, key],
                      })
                    }
                  />
                  {c.label ?? key}
                </label>
                <input
                  aria-label={tr("{0}列宽", [c.label ?? key])}
                  type="number"
                  min={40}
                  value={layout.widths[key] ?? c.width ?? 150}
                  onChange={(e) =>
                    setLayout({
                      ...layout,
                      widths: {
                        ...layout.widths,
                        [key]: Math.max(40, Number(e.target.value)),
                      },
                    })
                  }
                />
                <select
                  aria-label={tr("{0}固定", [c.label ?? key])}
                  value={layout.pin[key] ?? ""}
                  onChange={(e) =>
                    setLayout({
                      ...layout,
                      pin: {
                        ...layout.pin,
                        [key]: (e.target.value as "left" | "right") || null,
                      },
                    })
                  }
                >
                  <option value="">{tr("不固定")}</option>
                  <option value="left">{tr("左固定")}</option>
                  <option value="right">{tr("右固定")}</option>
                </select>
                <button
                  aria-label={tr("上移 {0}", [c.label ?? key])}
                  disabled={!index}
                  onClick={() => move(index - 1)}
                >
                  ↑
                </button>
                <button
                  aria-label={tr("下移 {0}", [c.label ?? key])}
                  disabled={index === layout.order.length - 1}
                  onClick={() => move(index + 1)}
                >
                  ↓
                </button>
              </div>
            );
          })}
        </>
      )}
      {tab === "sort" && (
        <>
          {sort.map((s, i) => (
            <div key={i} className="auto-setting-row">
              <select
                aria-label={tr("排序字段 {0}", [i + 1])}
                value={s.id}
                onChange={(e) =>
                  setSort(
                    sort.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            id: e.target.value,
                          }
                        : x,
                    ),
                  )
                }
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label ?? c.key}
                  </option>
                ))}
              </select>
              <select
                aria-label={tr("排序方向 {0}", [i + 1])}
                value={String(s.desc)}
                onChange={(e) =>
                  setSort(
                    sort.map((x, j) =>
                      j === i
                        ? {
                            ...x,
                            desc: e.target.value === "true",
                          }
                        : x,
                    ),
                  )
                }
              >
                <option value="false">{tr("升序")}</option>
                <option value="true">{tr("降序")}</option>
              </select>
              <button onClick={() => setSort(sort.filter((_, j) => j !== i))}>
                {tr("移除")}
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const c = columns.find((c) => !sort.some((s) => s.id === c.key));
              if (c)
                setSort([
                  ...sort,
                  {
                    id: c.key,
                    desc: false,
                  },
                ]);
            }}
          >
            {tr("添加排序")}
          </button>
        </>
      )}
      {tab === "filter" && (
        <>
          <FilterEditor
            columns={columns}
            value={active(value.filter)}
            onChange={(q) => {
              setRaw("");
              onChange({
                ...value,
                filter: replaceActive(value.filter, q),
              });
            }}
          />
          <p className="auto-muted">{tr("高级条件编辑（JSON）")}</p>
          <textarea
            aria-label={tr("筛选条件 JSON")}
            rows={9}
            value={raw || JSON.stringify(active(value.filter), null, 2)}
            onChange={(e) => setRaw(e.target.value)}
            style={{
              width: "100%",
            }}
          />
          <button
            onClick={() => {
              try {
                const q = JSON.parse(
                  raw || JSON.stringify(active(value.filter)),
                ) as QueryNode;
                function valid(n: QueryNode): boolean {
                  return (
                    (n?.kind === "group" &&
                      ["and", "or"].includes(n.operator) &&
                      Array.isArray(n.children) &&
                      n.children.every(valid)) ||
                    (n?.kind === "condition" &&
                      columns.some((c) => c.key === n.field) &&
                      ["eq", "in", "contains", "between", "isNull"].includes(
                        n.operator,
                      ))
                  );
                }
                if (!valid(q)) throw new Error(tr("条件格式无效"));
                onChange({
                  ...value,
                  filter: replaceActive(value.filter, q),
                });
                setError("");
              } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
              }
            }}
          >
            {tr("应用条件")}
          </button>
          {error && <p role="alert">{error}</p>}
        </>
      )}
      {tab === "export" && (
        <>
          <div className="auto-actions">
            <input
              aria-label={tr("导出文件名")}
              value={exp.fileName}
              onChange={(e) =>
                onChange({
                  ...value,
                  export: replaceActive(value.export, {
                    ...exp,
                    fileName: e.target.value,
                  }),
                })
              }
            />
            <select
              aria-label={tr("导出格式")}
              value={exp.format}
              onChange={(e) =>
                onChange({
                  ...value,
                  export: replaceActive(value.export, {
                    ...exp,
                    format: e.target.value as typeof exp.format,
                  }),
                })
              }
            >
              {["csv", "json", "xlsx"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select
              aria-label={tr("导出范围")}
              value={exp.scope}
              onChange={(e) =>
                onChange({
                  ...value,
                  export: replaceActive(value.export, {
                    ...exp,
                    scope: e.target.value as typeof exp.scope,
                  }),
                })
              }
            >
              <option value="filtered">{tr("已筛选数据")}</option>
              <option value="page">{tr("当前页")}</option>
              <option value="selected">{tr("已选数据")}</option>
            </select>
          </div>
          {columns
            .filter((c) => c.export !== false)
            .map((c) => (
              <label className="auto-setting-row" key={c.key}>
                <input
                  type="checkbox"
                  checked={exp.columns.includes(c.key)}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      export: replaceActive(value.export, {
                        ...exp,
                        columns: e.target.checked
                          ? [...exp.columns, c.key]
                          : exp.columns.filter((k) => k !== c.key),
                      }),
                    })
                  }
                />
                {c.label ?? c.key}
              </label>
            ))}
        </>
      )}
    </div>
  );
}
