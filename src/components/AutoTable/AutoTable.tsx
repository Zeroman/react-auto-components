import { useAutoText } from "../../core/i18n";
import {
  useTable,
  type ColumnDef,
  functionalUpdate,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Fragment,
  useImperativeHandle,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { emptyQuery, matchesQuery, type QueryNode } from "../../core/query";
import { errorMessage } from "../../core/config";
import { AutoSearchPanel } from "../AutoSearchPanel";
import { AutoDialog } from "../AutoDialog";
import { TableHeader } from "./TableHeader";
import { features } from "./features";
import { useTableData } from "./useTableData";
import { useTableSettings } from "./useTableSettings";
import {
  active,
  replaceActive,
  initialSettings,
  type TableSettings,
} from "./settings";
import { SettingsPanel } from "./SettingsPanel";
import {
  collectExport,
  toCsv,
  toJson,
  download,
  formatted,
  fetchExportRows,
} from "./export";
import type { ComponentSize, TableDensity } from "../../core/types";
import type { AutoTableProps, AutoColumn, TableQuery, RowScope } from "./types";
export function AutoTable<T extends object>(props: AutoTableProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  const {
    id,
    rowKey,
    title,
    height = 440,
    rowHeight = 40,
    pagination = true,
  } = props;
  const [localQuery, setLocalQuery] = useState<TableQuery>({
    pageIndex: 0,
    pageSize: props.pageSize ?? 10,
    sort: [],
    filter: emptyQuery,
  });
  const [selected, setSelected] = useState<Record<string, true>>({}),
    [expanded, setExpanded] = useState<true | Record<string, boolean>>(
      (props.expandAll ?? false) ? true : {},
    ),
    [current, setCurrent] = useState(""),
    [json, setJson] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [message]);
  const [edit, setEdit] = useState<{
      kind: "add" | "edit";
      row?: T;
    } | null>(null),
    [deleting, setDeleting] = useState<T[] | null>(null),
    [draft, setDraft] = useState<TableSettings | null>(null);
  const columns = useMemo(() => {
    const source =
      props.columns ??
      Object.keys(props.data?.[0] ?? {})
        .filter((k) => !k.startsWith("_auto_"))
        .map(
          (key) =>
            ({
              key,
              label: key,
            }) as AutoColumn<T>,
        );
    return source.filter((c) => services.canAccess(c));
  }, [props.columns, props.data, services]);
  const keys = columns.map((c) => c.key);
  const {
    settings,
    update: saveSettings,
    error: settingsError,
    retry,
  } = useTableSettings(id, keys, props.versions, {
    hidden: columns.filter((c) => c.hidden).map((c) => c.key),
    pin: Object.fromEntries(
      columns.filter((c) => c.pin).map((c) => [c.key, c.pin]),
    ),
  });
  const layout = active(settings.layout);
  const size = props.size ?? services.table?.size ?? services.size ?? "medium";
  const globalDensity =
    services.table?.density ??
    (services.density === "compact" ? "compact" : "normal");
  const density =
    props.density ??
    (layout.density === "inherit" ? globalDensity : layout.density);
  const query = props.query ?? {
    ...localQuery,
    sort: active(settings.sort),
    filter: active(settings.filter),
  };
  function changeQuery(patch: Partial<TableQuery>) {
    const next = {
      ...query,
      ...patch,
    };
    setLocalQuery(next);
    props.onQueryChange?.(next);
    if (props.query === undefined && (patch.sort || patch.filter))
      saveSettings({
        ...settings,
        sort: patch.sort
          ? replaceActive(settings.sort, patch.sort)
          : settings.sort,
        filter: patch.filter
          ? replaceActive(settings.filter, patch.filter)
          : settings.filter,
      });
  }
  const source = useTableData(props.data, props.dataSource, query);
  const filtered = useMemo(
    () =>
      props.dataSource
        ? Array.from(source.rows)
        : source.rows.filter((row) => matchesQuery(row, query.filter)),
    [source.rows, props.dataSource, query.filter],
  );
  const ordered = useMemo(() => {
    const list = [...new Set([...layout.order, ...keys])].flatMap((key) => {
      const c = columns.find((c) => c.key === key);
      return c && !layout.hidden.includes(key) ? [c] : [];
    });
    return [
      ...list.filter((c) => layout.pin[c.key] === "left"),
      ...list.filter((c) => !layout.pin[c.key]),
      ...list.filter((c) => layout.pin[c.key] === "right"),
    ];
  }, [columns, layout]);
  const definitions = useMemo<ColumnDef<typeof features, T>[]>(
    () =>
      columns.map((c) => ({
        id: c.key,
        accessorFn: (row: T) => row[c.key],
        header: c.label ?? c.key,
        enableSorting: c.sortable ?? true,
        ...(c.sort
          ? {
              sortFn: (
                a: {
                  original: T;
                },
                b: {
                  original: T;
                },
              ) => c.sort!(a.original, b.original),
            }
          : {}),
      })),
    [columns],
  );
  const getId = (row: T) =>
    typeof rowKey === "function" ? rowKey(row) : String(row[rowKey]);
  const selectionCache = useRef(new Map<string, T>());
  const sourceIndex = new Map<string, T>();
  function indexRows(items: readonly T[]) {
    for (const row of items) {
      sourceIndex.set(getId(row), row);
      const children = props.getChildren?.(row);
      if (children) indexRows(children);
    }
  }
  indexRows(source.rows);
  function selectionValues(next: Record<string, true>) {
    return Object.keys(next).flatMap((key) => {
      const row =
        sourceIndex.get(key) ??
        (props.dataSource ? selectionCache.current.get(key) : undefined);
      return row ? [row] : [];
    });
  }
  function changeSelection(next: Record<string, true>) {
    const values = selectionValues(next);
    selectionCache.current = new Map(values.map((row) => [getId(row), row]));
    setSelected(next);
    props.onSelectionChange?.(values);
  }
  const table = useTable({
    features,
    data: filtered,
    columns: definitions,
    getRowId: getId,
    getSubRows: props.getChildren,
    getRowCanExpand: (row) =>
      !!props.renderExpanded || !!props.getChildren?.(row.original)?.length,
    manualSorting: !!props.dataSource,
    manualPagination: !!props.dataSource || !pagination,
    rowCount: source.total,
    state: {
      sorting: query.sort,
      pagination: {
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
      },
      rowSelection: selected,
      expanded,
    },
    onSortingChange: (updater) =>
      changeQuery({
        sort: functionalUpdate(updater, query.sort),
        pageIndex: 0,
      }),
    onPaginationChange: (updater) =>
      changeQuery(
        functionalUpdate(updater, {
          pageIndex: query.pageIndex,
          pageSize: query.pageSize,
        }),
      ),
    onRowSelectionChange: (updater) => {
      const next = functionalUpdate(updater, selected);
      changeSelection(next);
    },
    onExpandedChange: setExpanded,
    autoResetPageIndex: false,
  });
  const rows = table.getRowModel().rows;
  const scroll = useRef<HTMLDivElement>(null);
  const effectiveVirtual =
    props.virtual !== false && !ordered.some((c) => c.merge);
  const rowHeightMap: Record<ComponentSize, Record<TableDensity, number>> = {
    small: {
      compact: 26,
      normal: 32,
      comfortable: 40,
    },
    medium: {
      compact: 30,
      normal: 40,
      comfortable: 52,
    },
    large: {
      compact: 36,
      normal: 48,
      comfortable: 60,
    },
  };
  const itemHeight =
    props.rowHeight !== undefined && density === "normal"
      ? props.rowHeight
      : (rowHeightMap[size]?.[density] ?? props.rowHeight ?? 40);
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroll.current,
    getItemKey: (i) => rows[i].id,
    estimateSize: () => itemHeight,
    overscan: 5,
    enabled: effectiveVirtual,
    initialRect: {
      height: typeof height === "number" ? height : 0,
      width: 1000,
    },
  });
  const selectedRows = selectionValues(selected);
  const scopeRows = (scope: RowScope) =>
    scope === "selected"
      ? selectedRows
      : scope === "page"
        ? rows.map((r) => r.original)
        : table
            .getPrePaginatedRowModel()
            .rows.filter((r) => r.depth === 0)
            .map((r) => r.original);
  const [exporting, setExporting] = useState(false);
  const exportController = useRef<AbortController | null>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  async function doExport(
    format: "csv" | "json" | "xlsx",
    scope: RowScope = active(settings.export).scope,
  ) {
    if (exportController.current) return;
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true);
    try {
      const config = active(settings.export);
      const exportRows =
        props.dataSource && scope === "filtered"
          ? await fetchExportRows(props.dataSource, query, controller.signal)
          : scopeRows(scope);
      const data = collectExport(exportRows, columns, config.columns);
      const name = config.fileName || title || tr("数据导出");
      if (format === "xlsx") {
        if (!props.exportXlsx) throw new Error(tr("请配置 XLSX 导出适配器"));
        const buffer = await props.exportXlsx(data, {
          fileName: name,
        });
        download(
          buffer as BlobPart,
          `${name}.xlsx`,
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
      } else
        download(
          format === "csv" ? toCsv(data) : toJson(data),
          `${name}.${format}`,
          format === "csv" ? "text/csv;charset=utf-8" : "application/json",
        );
      setMessage(tr("导出完成"));
    } catch (e) {
      if (!controller.signal.aborted) setMessage(tr(errorMessage(e)));
    } finally {
      exportController.current = null;
      if (!controller.signal.aborted) setExporting(false);
    }
  }
  useImperativeHandle(props.ref, () => ({
    refresh: source.refresh,
    reset() {
      saveSettings(initialSettings(keys));
      changeSelection({});
      const next = {
        ...query,
        pageIndex: 0,
        sort: [],
        filter: emptyQuery,
      };
      setLocalQuery(next);
      props.onQueryChange?.(next);
    },
    scrollToRow(id) {
      const index = rows.findIndex((r) => r.id === id);
      if (index >= 0) {
        if (effectiveVirtual) virtual.scrollToIndex(index);
        else
          scroll.current
            ?.querySelector(`[data-row-id="${CSS.escape(id)}"]`)
            ?.scrollIntoView({
              block: "nearest",
            });
      }
    },
    getSelectedRows: () => selectedRows,
    export: doExport,
  }));
  const width = (c: AutoColumn<T>) => layout.widths[c.key] ?? c.width ?? 150;
  function cellStyle(c: AutoColumn<T>): CSSProperties {
    const pin = layout.pin[c.key];
    const peers = ordered.filter((x) => layout.pin[x.key] === pin);
    const i = peers.indexOf(c);
    return {
      width: width(c),
      minWidth: width(c),
      maxWidth: width(c),
      textAlign: c.align ?? "left",
      ...(pin
        ? {
            position: "sticky",
            zIndex: 2,
            [pin]:
              peers
                .slice(
                  pin === "left" ? 0 : i + 1,
                  pin === "left" ? i : undefined,
                )
                .reduce((sum, x) => sum + width(x), 0) +
              (pin === "left" ? 44 : 0),
            background: "var(--auto-bg)",
          }
        : {}),
    };
  }
  const renderRows = effectiveVirtual
    ? virtual.getVirtualItems().map((v) => ({
        row: rows[v.index],
        index: v.index,
        virtual: v,
      }))
    : rows.map((row, index) => ({
        row,
        index,
        virtual: undefined,
      }));
  const visibleSignature = renderRows.map(({ row }) => row.id).join("|");
  useEffect(() => {
    if (!effectiveVirtual || !props.renderExpanded || !scroll.current) return;
    const container = scroll.current;
    const elements = Array.from(
      container.querySelectorAll<HTMLTableRowElement>("tr[data-row-id]"),
    );
    const measure = () => {
      for (const element of elements) {
        const expandedRow = element.nextElementSibling as HTMLElement | null;
        const extra =
          expandedRow &&
          expandedRow.dataset.expandedRowId === element.dataset.rowId
            ? expandedRow.getBoundingClientRect().height
            : 0;
        virtual.resizeItem(
          Number(element.dataset.index),
          element.getBoundingClientRect().height + extra,
        );
      }
    };
    const observer = new ResizeObserver(measure);
    for (const element of elements) {
      observer.observe(element);
      if (
        (element.nextElementSibling as HTMLElement | null)?.dataset
          .expandedRowId
      )
        observer.observe(element.nextElementSibling!);
    }
    measure();
    return () => observer.disconnect();
  }, [
    effectiveVirtual,
    props.renderExpanded,
    visibleSignature,
    expanded,
    itemHeight,
  ]);
  const total = props.dataSource
    ? source.total
    : table.getPrePaginatedRowModel().rows.length;
  const pages = Math.max(1, Math.ceil(total / query.pageSize));
  useEffect(() => {
    if (!pagination || !source.resolved || source.loading || source.error)
      return;
    const pageIndex = Math.max(0, Math.min(query.pageIndex, pages - 1));
    if (pageIndex !== query.pageIndex)
      changeQuery({
        pageIndex,
      });
  }, [
    pagination,
    source.resolved,
    source.loading,
    source.error,
    pages,
    query.pageIndex,
  ]);
  const colCount =
    ordered.length + 1 + (props.onEdit || props.onDelete ? 1 : 0);
  return (
    <section
      className="auto-root auto-table"
      data-height={height === "auto" ? "auto" : "fixed"}
      data-virtual={effectiveVirtual}
      data-size={size}
      data-density={density}
      aria-label={title ?? id}
    >
      {props.searchFields && (
        <AutoSearchPanel
          size={size}
          {...props.searchLayout}
          fields={props.searchFields}
          onSearch={(filter) =>
            changeQuery({
              filter,
              pageIndex: 0,
            })
          }
        />
      )}
      <div className="auto-toolbar">
        <div className="auto-actions">
          {title && <strong>{title}</strong>}
          <span className="auto-muted">
            {tr("{0} 条记录", [total.toLocaleString()])}
          </span>
          {selectedRows.length > 0 && (
            <span className="auto-badge">
              {tr("已选 {0} 项", [selectedRows.length])}
            </span>
          )}
          {props.toolbar}
        </div>
        <div className="auto-actions">
          {props.onAdd && (
            <button
              className="auto-primary"
              onClick={() =>
                setEdit({
                  kind: "add",
                })
              }
            >
              {tr("新增")}
            </button>
          )}
          {props.onDelete && selectedRows.length > 0 && (
            <button onClick={() => setDeleting(selectedRows)}>
              {tr("删除所选")}
            </button>
          )}
          <button onClick={source.refresh} disabled={source.loading}>
            {tr("刷新")}
          </button>
          <button onClick={() => setDraft(structuredClone(settings))}>
            {tr("设置")}
          </button>
          <button
            disabled={exporting}
            onClick={() => void doExport(active(settings.export).format)}
          >
            {exporting ? tr("导出中…") : tr("导出")}
          </button>
          <button onClick={() => setJson(!json)} aria-pressed={json}>
            JSON
          </button>
        </div>
      </div>
      {query.sort.length > 0 && (
        <div className="auto-actions auto-sort-tags">
          {query.sort.map((s) => (
            <button
              key={s.id}
              onClick={() =>
                changeQuery({
                  sort: query.sort.filter((x) => x.id !== s.id),
                  pageIndex: 0,
                })
              }
            >
              {columns.find((c) => c.key === s.id)?.label ?? s.id}{" "}
              {s.desc ? "↓" : "↑"} ×
            </button>
          ))}
        </div>
      )}
      {source.error && (
        <div role="alert" className="auto-error">
          {source.error} <button onClick={source.refresh}>{tr("重试")}</button>
        </div>
      )}
      {settingsError && (
        <div role="alert" className="auto-error">
          {tr("配置保存失败：")}
          {settingsError}
          <button onClick={retry}>{tr("重试保存")}</button>
        </div>
      )}
      {message && (
        <div role="status" className="auto-notice">
          {message}
          <button aria-label={tr("关闭消息")} onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {json ? (
        <div className="auto-json">
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(JSON.stringify(scopeRows("page"), null, 2))
                .then(() => setMessage(tr("已复制")))
                .catch((e) => setMessage(tr(errorMessage(e))))
            }
          >
            {tr("复制 JSON")}
          </button>
          <pre>{JSON.stringify(scopeRows("page"), null, 2)}</pre>
        </div>
      ) : (
        <div
          ref={scroll}
          className="auto-table-scroll"
          style={{
            height: height === "auto" ? undefined : height,
            overflow: "auto",
          }}
          aria-busy={source.loading}
        >
          <table
            style={{
              minWidth: ordered.reduce((n, c) => n + width(c), 44),
              width: "100%",
              tableLayout: "fixed",
            }}
          >
            <TableHeader
              columns={ordered}
              rows={source.rows}
              sort={query.sort}
              filter={query.filter}
              style={cellStyle}
              hasActions={!!(props.onEdit || props.onDelete)}
              allSelected={rows.length > 0 && rows.every((r) => selected[r.id])}
              indeterminate={
                rows.length > 0 &&
                rows.some((r) => selected[r.id]) &&
                !rows.every((r) => selected[r.id])
              }
              onSelectAll={(checked) => {
                const next = {
                  ...selected,
                };
                rows.forEach((r) => {
                  if (checked) next[r.id] = true;
                  else delete next[r.id];
                });
                changeSelection(next);
              }}
              onSort={(sort) =>
                changeQuery({
                  sort,
                  pageIndex: 0,
                })
              }
              onFilter={(filter) =>
                changeQuery({
                  filter,
                  pageIndex: 0,
                })
              }
              onResize={(key, width) =>
                saveSettings({
                  ...settings,
                  layout: replaceActive(settings.layout, {
                    ...layout,
                    widths: {
                      ...layout.widths,
                      [key]: width,
                    },
                  }),
                })
              }
            />

            <tbody>
              {effectiveVirtual &&
                renderRows[0]?.virtual &&
                renderRows[0].virtual.start > 0 && (
                  <tr aria-hidden="true">
                    <td
                      colSpan={colCount}
                      style={{
                        height: renderRows[0].virtual.start,
                        padding: 0,
                        border: 0,
                      }}
                    />
                  </tr>
                )}
              {renderRows.map(({ row, index, virtual: v }) => {
                const rowNode = (
                  <tr
                    data-row-id={row.id}
                    data-index={index}
                    key={row.id}
                    ref={
                      effectiveVirtual && !props.renderExpanded
                        ? virtual.measureElement
                        : undefined
                    }
                    className={`${current === row.id ? "auto-current" : ""} ${props.rowClassName?.(row.original) ?? ""}`}
                    style={{
                      height: itemHeight,
                      ...props.rowStyle?.(row.original),
                    }}
                    onClick={() => setCurrent(row.id)}
                  >
                    <td className="auto-table-cell-selection">
                      <input
                        type="checkbox"
                        aria-label={tr("选择行 {0}", [row.id])}
                        checked={!!selected[row.id]}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </td>
                    {ordered.map((c, ci) => {
                      let span = 1;
                      if (c.merge) {
                        const val = row.original[c.key];
                        if (
                          index > 0 &&
                          !(
                            props.renderExpanded &&
                            rows[index - 1].getIsExpanded()
                          ) &&
                          Object.is(rows[index - 1].original[c.key], val)
                        )
                          return null;
                        while (
                          index + span < rows.length &&
                          !(
                            props.renderExpanded &&
                            rows[index + span - 1].getIsExpanded()
                          ) &&
                          Object.is(rows[index + span].original[c.key], val)
                        )
                          span++;
                      }
                      const value = row.original[c.key];
                      return (
                        <td
                          key={c.key}
                          rowSpan={span}
                          style={cellStyle(c)}
                          tabIndex={0}
                          onDoubleClick={() => {
                            if (c.copyable)
                              void navigator.clipboard
                                .writeText(String(formatted(c, row.original)))
                                .then(() => setMessage(tr("已复制")))
                                .catch((e) => setMessage(tr(errorMessage(e))));
                          }}
                        >
                          <div className="auto-cell">
                            {ci === 0 && row.getCanExpand() && (
                              <button
                                className="auto-expand"
                                style={{
                                  marginLeft: row.depth * 16,
                                }}
                                aria-label={tr("展开行 {0}", [row.id])}
                                aria-expanded={row.getIsExpanded()}
                                onClick={row.getToggleExpandedHandler()}
                              >
                                {row.getIsExpanded() ? "−" : "+"}
                              </button>
                            )}
                            {props.rowLoading?.(row.original) ? (
                              <span className="auto-skeleton">
                                {tr("加载中…")}
                              </span>
                            ) : c.render ? (
                              c.render(value, row.original, index)
                            ) : c.type === "progress" ? (
                              <progress value={Number(value ?? 0)} max={100} />
                            ) : (
                              formatted(c, row.original)
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <>
                      {(props.onEdit || props.onDelete) && (
                        <td>
                          <div className="auto-actions auto-row-actions">
                            {props.onEdit && (
                              <button
                                aria-label={tr("编辑行 {0}", [row.id])}
                                onClick={() =>
                                  setEdit({
                                    kind: "edit",
                                    row: row.original,
                                  })
                                }
                              >
                                {tr("编辑")}
                              </button>
                            )}
                            {props.onDelete && (
                              <button
                                aria-label={tr("删除行 {0}", [row.id])}
                                onClick={() => setDeleting([row.original])}
                              >
                                {tr("删除")}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </>
                  </tr>
                );
                return (
                  <Fragment key={row.id}>
                    {props.rowActions?.length ? (
                      <ContextMenu.Root>
                        <ContextMenu.Trigger asChild>
                          {rowNode}
                        </ContextMenu.Trigger>
                        <ContextMenu.Portal>
                          <ContextMenu.Content className="auto-popover auto-context-menu">
                            {props.rowActions
                              .filter((a) => !a.hidden?.(row.original))
                              .map((a) => (
                                <ContextMenu.Item
                                  key={a.id}
                                  disabled={a.disabled?.(row.original)}
                                  onSelect={() =>
                                    void Promise.resolve()
                                      .then(() => a.onClick(row.original))
                                      .catch((e) =>
                                        setMessage(tr(errorMessage(e))),
                                      )
                                  }
                                >
                                  {a.label}
                                </ContextMenu.Item>
                              ))}
                          </ContextMenu.Content>
                        </ContextMenu.Portal>
                      </ContextMenu.Root>
                    ) : (
                      rowNode
                    )}
                    {row.getIsExpanded() && props.renderExpanded && (
                      <tr data-expanded-row-id={row.id}>
                        <td colSpan={colCount}>
                          {props.renderExpanded(row.original)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {effectiveVirtual && renderRows.length > 0 && (
                <tr aria-hidden="true">
                  <td
                    colSpan={colCount}
                    style={{
                      height: Math.max(
                        0,
                        virtual.getTotalSize() -
                          (renderRows.at(-1)?.virtual?.end ?? 0),
                      ),
                      padding: 0,
                      border: 0,
                    }}
                  />
                </tr>
              )}
              {!rows.length && (
                <tr>
                  <td colSpan={colCount} className="auto-empty">
                    {props.empty ??
                      (source.loading ? tr("正在加载…") : tr("暂无数据"))}
                  </td>
                </tr>
              )}
            </tbody>
            {ordered.some((c) => c.summary) && (
              <tfoot>
                <tr>
                  <td className="auto-table-cell-selection">{tr("合计")}</td>
                  {ordered.map((c) => (
                    <td key={c.key} style={cellStyle(c)}>
                      {c.summary &&
                      props.dataSource &&
                      (props.summaryScope ?? "filtered") === "filtered"
                        ? (props.summaryValues?.[c.key] ?? "—")
                        : typeof c.summary === "function"
                          ? c.summary(
                              scopeRows(props.summaryScope ?? "filtered"),
                            )
                          : c.summary
                            ? scopeRows(
                                props.summaryScope ?? "filtered",
                              ).reduce(
                                (sum, row) => sum + (Number(row[c.key]) || 0),
                                0,
                              )
                            : ""}
                    </td>
                  ))}
                  {(props.onEdit || props.onDelete) && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
      {pagination && (
        <footer className="auto-pagination">
          <span>{tr("第 {0} / {1} 页", [query.pageIndex + 1, pages])}</span>
          <div className="auto-actions">
            <select
              aria-label={tr("每页条数")}
              value={query.pageSize}
              onChange={(e) =>
                changeQuery({
                  pageIndex: 0,
                  pageSize: Number(e.target.value),
                })
              }
            >
              {[...new Set([props.pageSize ?? 10, 10, 20, 50, 100])]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {tr("{0} 条 / 页", [n])}
                  </option>
                ))}
            </select>
            <button
              aria-label={tr("上一页")}
              disabled={query.pageIndex === 0}
              onClick={() =>
                changeQuery({
                  pageIndex: query.pageIndex - 1,
                })
              }
            >
              ←
            </button>
            <button
              aria-label={tr("下一页")}
              disabled={query.pageIndex + 1 >= pages}
              onClick={() =>
                changeQuery({
                  pageIndex: query.pageIndex + 1,
                })
              }
            >
              →
            </button>
          </div>
        </footer>
      )}
      <AutoDialog
        open={!!draft}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        title={tr("表格设置")}
        width={760}
        content={
          draft && (
            <SettingsPanel
              value={draft}
              columns={columns}
              onChange={setDraft}
            />
          )
        }
        onSubmit={() => {
          if (draft) {
            saveSettings(draft);
            const next = {
              ...query,
              pageIndex: 0,
              sort: active(draft.sort),
              filter: active(draft.filter),
            };
            setLocalQuery(next);
            props.onQueryChange?.(next);
          }
        }}
      />
      <AutoDialog<T>
        open={!!edit}
        onOpenChange={(open) => {
          if (!open) setEdit(null);
        }}
        title={edit?.kind === "add" ? tr("新增记录") : tr("编辑记录")}
        fields={
          props.formFields ??
          columns.map((c) => ({
            name: c.key,
            label: c.label,
            type: c.type === "number" ? "integer" : "input",
          }))
        }
        defaultValue={edit?.row}
        draftKey={`${id}:${edit?.kind}:${edit?.row ? getId(edit.row) : "new"}`}
        showReset
        onSubmit={async (values) => {
          if (edit?.kind === "add") await props.onAdd?.(values);
          else if (edit?.row) await props.onEdit?.(edit.row, values);
          source.refresh();
        }}
      />
      <AutoDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title={tr("确认删除")}
        content={
          <p>{tr("确定删除这 {0} 条记录？", [deleting?.length ?? 0])}</p>
        }
        confirmLabel={tr("确认删除")}
        onSubmit={async () => {
          if (deleting) await props.onDelete?.(deleting);
          setSelected({});
          source.refresh();
        }}
      />
    </section>
  );
}
