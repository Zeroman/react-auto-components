import { AutoTip, type TipConfig } from "../AutoTip";
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
  tipComponent,
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
  onReorder,
  reorderable = true,
}: TipConfig & {
  columns: readonly AutoColumn<T>[];
  rows: readonly T[];
  sort: TableSort[];
  filter: QueryNode;
  onSort: (sort: TableSort[]) => void;
  onFilter: (query: QueryNode) => void;
  onResize: (key: string, width: number) => void;
  onReorder?: (
    fromKey: string,
    toKey: string,
    position: "before" | "after",
  ) => void;
  reorderable?: boolean;
  style: (column: AutoColumn<T>) => CSSProperties;
  hasActions: boolean;
  allSelected: boolean;
  indeterminate?: boolean;
  onSelectAll: (value: boolean) => void;
}) {
  const tr = useAutoText();
  const checkRef = useRef<HTMLInputElement>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">(
    "before",
  );
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
          const activeSort = sort.find((s) => s.id === c.key);
          const isFiltered = filterChildren.some(
            (node) => node.kind === "condition" && node.field === c.key,
          );
          const isDraggable = Boolean(reorderable && c.reorderable !== false);
          const isDragging = draggingKey === c.key;
          const isDropTarget = dragOverKey === c.key && draggingKey !== c.key;
          return (
            <th
              key={c.key}
              style={style(c)}
              className={
                [
                  isDraggable ? "auto-th-draggable" : undefined,
                  isDragging ? "auto-th-dragging" : undefined,
                  isDropTarget
                    ? dropPosition === "before"
                      ? "auto-drop-before"
                      : "auto-drop-after"
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              aria-sort={
                activeSort
                  ? activeSort.desc
                    ? "descending"
                    : "ascending"
                  : "none"
              }
              draggable={isDraggable ? true : undefined}
              onDragStart={
                isDraggable
                  ? (e) => {
                      e.dataTransfer.setData("text/plain", c.key);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingKey(c.key);
                    }
                  : undefined
              }
              onDragOver={
                isDraggable
                  ? (e) => {
                      if (!draggingKey || draggingKey === c.key) return;
                      const draggingCol = columns.find(
                        (col) => col.key === draggingKey,
                      );
                      if (
                        draggingCol &&
                        (draggingCol.pin ?? null) !== (c.pin ?? null)
                      ) {
                        return;
                      }
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos =
                        e.clientX < rect.left + rect.width / 2
                          ? "before"
                          : "after";
                      if (dragOverKey !== c.key || dropPosition !== pos) {
                        setDragOverKey(c.key);
                        setDropPosition(pos);
                      }
                    }
                  : undefined
              }
              onDragLeave={
                isDraggable
                  ? (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (dragOverKey === c.key) {
                          setDragOverKey(null);
                        }
                      }
                    }
                  : undefined
              }
              onDrop={
                isDraggable
                  ? (e) => {
                      e.preventDefault();
                      const fromKey =
                        e.dataTransfer.getData("text/plain") || draggingKey;
                      if (fromKey && fromKey !== c.key && onReorder) {
                        const draggingCol = columns.find(
                          (col) => col.key === fromKey,
                        );
                        if (
                          !draggingCol ||
                          (draggingCol.pin ?? null) === (c.pin ?? null)
                        ) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos =
                            e.clientX < rect.left + rect.width / 2
                              ? "before"
                              : "after";
                          onReorder(fromKey, c.key, pos);
                        }
                      }
                      setDraggingKey(null);
                      setDragOverKey(null);
                    }
                  : undefined
              }
              onDragEnd={
                isDraggable
                  ? () => {
                      setDraggingKey(null);
                      setDragOverKey(null);
                    }
                  : undefined
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
                {isDraggable && (
                  <span
                    className="auto-drag-grip"
                    aria-hidden="true"
                    title={tr("Drag to reorder")}
                  >
                    ⋮⋮
                  </span>
                )}
                {c.header ?? (
                  <button
                    className={activeSort ? "auto-sort-active" : undefined}
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
                    {c.label ?? c.key}
                    {activeSort && (
                      <span className="auto-sort-indicator" aria-hidden="true">
                        {activeSort.desc ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                )}
                {c.tip != null && c.tip !== false && c.tip !== "" && (
                  <AutoTip
                    content={c.tip}
                    tipComponent={c.tipComponent ?? tipComponent}
                  >
                    <button
                      type="button"
                      className="auto-tip-trigger"
                      aria-label={c.label ?? c.key}
                    >
                      <span aria-hidden="true">ⓘ</span>
                    </button>
                  </AutoTip>
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
