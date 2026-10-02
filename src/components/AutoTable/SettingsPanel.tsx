import { useAutoText } from "../../core/i18n";
import { devWarn } from "../../core/errors";
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
            {[tr("Columns"), tr("Sort"), tr("Filter"), tr("Export")][i]}
          </button>
        ))}
      </div>
      <div className="auto-actions auto-preset">
        <select
          aria-label={tr("Active preset")}
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
              {p.id === "default" ? tr("Default preset") : p.name}
            </option>
          ))}
        </select>
        <input
          aria-label={tr("Preset name")}
          placeholder={tr("Preset name")}
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
          {tr("Save as new preset")}
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
          {tr("Rename")}
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
          {tr("Delete preset")}
        </button>
      </div>
      {tab === "layout" && (
        <>
          <label>
            {tr("Density")}{" "}
            <select
              value={layout.density}
              onChange={(e) =>
                setLayout({
                  ...layout,
                  density: e.target.value as typeof layout.density,
                })
              }
            >
              <option value="inherit">{tr("Follow global")}</option>
              <option value="compact">{tr("Compact")}</option>
              <option value="normal">{tr("Normal")}</option>
              <option value="comfortable">{tr("Comfortable")}</option>
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
                  aria-label={tr("Column width {0}", [c.label ?? key])}
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
                  aria-label={tr("Pin {0}", [c.label ?? key])}
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
                  <option value="">{tr("Not pinned")}</option>
                  <option value="left">{tr("Pin left")}</option>
                  <option value="right">{tr("Pin right")}</option>
                </select>
                <button
                  aria-label={tr("Move {0} up", [c.label ?? key])}
                  disabled={!index}
                  onClick={() => move(index - 1)}
                >
                  ↑
                </button>
                <button
                  aria-label={tr("Move {0} down", [c.label ?? key])}
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
                aria-label={tr("Sort field {0}", [i + 1])}
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
                aria-label={tr("Sort direction {0}", [i + 1])}
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
                <option value="false">{tr("Ascending")}</option>
                <option value="true">{tr("Descending")}</option>
              </select>
              <button onClick={() => setSort(sort.filter((_, j) => j !== i))}>
                {tr("Remove")}
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
            {tr("Add sort")}
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
          <p className="auto-muted">{tr("Advanced filter (JSON)")}</p>
          <textarea
            aria-label={tr("Filter JSON")}
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
                      ) &&
                      (n.operator !== "in" || Array.isArray(n.value)) &&
                      (n.operator !== "between" ||
                        (Array.isArray(n.value) && n.value.length === 2)))
                  );
                }
                if (!valid(q)) {
                  devWarn(
                    "AutoTable",
                    "RAC-TABLE-FILTER",
                    "The filter JSON is not a query this table can apply.",
                    'Use { kind: "group", operator: "and" | "or", children } or { kind: "condition", field, operator, value }. field must be a column key. operator is eq, in, contains, between, or isNull. between value is [from, to].',
                  );
                  setError(tr("Invalid filter"));
                  return;
                }
                onChange({
                  ...value,
                  filter: replaceActive(value.filter, q),
                });
                setError("");
              } catch (e) {
                devWarn(
                  "AutoTable",
                  "RAC-TABLE-FILTER",
                  `Filter JSON failed to parse: ${e instanceof Error ? e.message : String(e)}.`,
                  'Paste a JSON query. Groups use kind "group"; conditions use kind "condition". The screen keeps the previous filter.',
                );
                setError(tr("Invalid filter"));
              }
            }}
          >
            {tr("Apply filter")}
          </button>
          {error && <p role="alert">{error}</p>}
        </>
      )}
      {tab === "export" && (
        <>
          <div className="auto-actions">
            <input
              aria-label={tr("Export file name")}
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
              aria-label={tr("Export format")}
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
              aria-label={tr("Export scope")}
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
              <option value="filtered">{tr("Filtered rows")}</option>
              <option value="page">{tr("Current page")}</option>
              <option value="selected">{tr("Selected rows")}</option>
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
