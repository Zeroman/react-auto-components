import { useAutoText } from "../../core/i18n";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Popover } from "../../internal/Popover";
import type { AutoColumn, TableSort } from "./types";
import type { QueryNode } from "../../core/query";
export function updateColumnFilter(
  query: QueryNode,
  field: string,
  values: unknown[],
): QueryNode {
  const children =
    query.kind === "group" && query.operator === "and"
      ? query.children
      : [query];
  return {
    kind: "group",
    operator: "and",
    children: [
      ...children.filter((c) => !(c.kind === "condition" && c.field === field)),
      ...(values.length
        ? [
            {
              kind: "condition" as const,
              field,
              operator: "in" as const,
              value: values,
            },
          ]
        : []),
    ],
  };
}
function ColumnFilter<T extends object>({
  column,
  rows,
  query,
  onChange,
}: {
  column: AutoColumn<T>;
  rows: readonly T[];
  query: QueryNode;
  onChange: (q: QueryNode) => void;
}) {
  const tr = useAutoText();
  const [search, setSearch] = useState("");
  const children =
    query.kind === "group" && query.operator === "and"
      ? query.children
      : [query];
  const condition = children.find(
    (c) => c.kind === "condition" && c.field === column.key,
  );
  const selected =
    condition?.kind === "condition"
      ? condition.operator === "in" && Array.isArray(condition.value)
        ? condition.value
        : [condition.value]
      : [];
  const options =
    column.options ??
    [...new Set(rows.map((r) => r[column.key]))].map((value) => ({
      value,
      label: String(value ?? tr("Empty")),
    }));
  return (
    <div className="auto-filter-options">
      <input
        aria-label={tr("Search filter options")}
        placeholder={tr("Search options")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button
        onClick={() => onChange(updateColumnFilter(query, column.key, []))}
      >
        {tr("Clear this column filter")}
      </button>
      {options
        .filter((o) =>
          o.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        )
        .map((o, i) => (
          <label className="auto-setting-row" key={i}>
            <input
              type="checkbox"
              checked={selected.some((v) => Object.is(v, o.value))}
              onChange={(e) =>
                onChange(
                  updateColumnFilter(
                    query,
                    column.key,
                    e.target.checked
                      ? [...selected, o.value]
                      : selected.filter((v) => !Object.is(v, o.value)),
                  ),
                )
              }
            />
            {o.label}
            <small>
              {rows.filter((r) => Object.is(r[column.key], o.value)).length}
            </small>
          </label>
        ))}
    </div>
  );
}
export function TableHeader<T extends object>({
  columns,
  rows,
  sort,
  filter,
  onSort,
  onFilter,
  onResize,
  style,
  hasActions,
  allSelected,
  indeterminate,
  onSelectAll,
}: {
  columns: readonly AutoColumn<T>[];
  rows: readonly T[];
  sort: TableSort[];
  filter: QueryNode;
  onSort: (sort: TableSort[]) => void;
  onFilter: (query: QueryNode) => void;
  onResize: (key: string, width: number) => void;
  style: (column: AutoColumn<T>) => CSSProperties;
  hasActions: boolean;
  allSelected: boolean;
  indeterminate?: boolean;
  onSelectAll: (value: boolean) => void;
}) {
  const tr = useAutoText();
  const checkRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (checkRef.current) {
      checkRef.current.indeterminate = !allSelected && !!indeterminate;
    }
  }, [allSelected, indeterminate]);
  const filterChildren =
    filter.kind === "group" && filter.operator === "and"
      ? filter.children
      : [filter];
  return (
    <thead>
      <tr>
        <th
          className="auto-table-cell-selection"
          style={{
            width: 44,
          }}
        >
          <input
            ref={checkRef}
            type="checkbox"
            aria-label={tr("Select current page")}
            checked={allSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
        </th>
        {columns.map((c) => {
          const isFiltered = filterChildren.some(
            (node) => node.kind === "condition" && node.field === c.key,
          );
          return (
            <th
              key={c.key}
              style={style(c)}
              aria-sort={
                sort.find((s) => s.id === c.key)
                  ? sort.find((s) => s.id === c.key)?.desc
                    ? "descending"
                    : "ascending"
                  : "none"
              }
            >
              <div
                className="auto-column-heading"
                style={{
                  justifyContent:
                    c.align === "right"
                      ? "flex-end"
                      : c.align === "center"
                        ? "center"
                        : "flex-start",
                }}
              >
                {c.header ?? (
                  <button
                    aria-label={tr("Sort {0}", [c.label ?? c.key])}
                    disabled={c.sortable === false}
                    onClick={(e) => {
                      const old = sort.find((s) => s.id === c.key);
                      const next = old
                        ? old.desc
                          ? undefined
                          : {
                              ...old,
                              desc: true,
                            }
                        : {
                            id: c.key,
                            desc: false,
                          };
                      onSort([
                        ...(e.shiftKey
                          ? sort.filter((s) => s.id !== c.key)
                          : []),
                        ...(next ? [next] : []),
                      ]);
                    }}
                  >
                    {c.label ?? c.key}{" "}
                    {sort.find((s) => s.id === c.key)
                      ? sort.find((s) => s.id === c.key)?.desc
                        ? "↓"
                        : "↑"
                      : ""}
                  </button>
                )}
                {c.filterable && (
                  <Popover
                    content={
                      <ColumnFilter
                        column={c}
                        rows={rows}
                        query={filter}
                        onChange={onFilter}
                      />
                    }
                  >
                    <button
                      className={isFiltered ? "auto-filter-active" : undefined}
                      aria-label={tr("Filter {0}", [c.label ?? c.key])}
                    >
                      ⌄
                    </button>
                  </Popover>
                )}
                <span
                  className="auto-resize"
                  role="separator"
                  tabIndex={0}
                  aria-orientation="vertical"
                  aria-label={tr("Resize column {0}", [c.label ?? c.key])}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      onResize(
                        c.key,
                        Math.max(
                          c.minWidth ?? 60,
                          Number(style(c).width) +
                            (e.key === "ArrowRight" ? 10 : -10),
                        ),
                      );
                    }
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const start = e.clientX,
                      base = Number(style(c).width),
                      el = e.currentTarget;
                    el.setPointerCapture(e.pointerId);
                    let size = base;
                    const move = (ev: PointerEvent) => {
                      size = Math.max(
                        c.minWidth ?? 60,
                        base + ev.clientX - start,
                      );
                      el.style.transform = `translateX(${size - base}px)`;
                    };
                    const end = () => {
                      el.style.transform = "";
                      onResize(c.key, size);
                      el.removeEventListener("pointermove", move);
                      el.removeEventListener("pointerup", end);
                      el.removeEventListener("pointercancel", end);
                    };
                    el.addEventListener("pointermove", move);
                    el.addEventListener("pointerup", end);
                    el.addEventListener("pointercancel", end);
                  }}
                />
              </div>
            </th>
          );
        })}
        {hasActions && (
          <th
            style={{
              width: Math.max(
                140,
                64 + (tr("Edit").length + tr("Delete").length) * 8,
              ),
            }}
          >
            {tr("Actions")}
          </th>
        )}
      </tr>
    </thead>
  );
}
