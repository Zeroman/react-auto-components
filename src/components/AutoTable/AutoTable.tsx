import { useAutoText } from "../../core/i18n";
import {
  useTable,
  type ColumnDef,
  functionalUpdate,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  useImperativeHandle,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useAutoConfig } from "../../core/AutoConfigProvider";
import { emptyQuery, matchesQuery, type QueryNode } from "../../core/query";
import { errorMessage } from "../../core/config";
import { devWarn } from "../../core/errors";
import {
  useFieldWarnings,
  useLibraryStyles,
  warnRowKeys,
  warnTableId,
} from "../../core/dev";
import { AutoSearch } from "../AutoSearch";
import { DefaultTip } from "../AutoTip";
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
import {
  missingSource,
  resolveColumn,
  resolveDataSource,
  resolveRowAction,
} from "./registry";
import { racTestId } from "../../core/testid";
import { formatted } from "./export";
import { useTableExport } from "./useTableExport";
import { TableRow } from "./TableRow";
import { TablePagination } from "./TablePagination";
import { TableDialogs } from "./TableDialogs";
import { ExportIcon, JsonIcon, RefreshIcon, SettingsIcon } from "./icons";
import {
  RowContextMenu,
  showToolbarAction,
  stickyColumnStyles,
} from "./layout";
import type { ComponentSize, TableDensity } from "../../core/types";
import type {
  AutoTableProps,
  AutoColumn,
  DataSource,
  TableQuery,
  RowScope,
  RowAction,
  TableToolbarActions,
} from "./types";

/** Default row height (px) per size × density; overridable via props.rowHeight. */
const ROW_HEIGHTS: Record<ComponentSize, Record<TableDensity, number>> = {
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

export function AutoTable<T extends object>(props: AutoTableProps<T>) {
  const tr = useAutoText();
  const services = useAutoConfig();
  const hasLocalData = "data" in props && !!props.data;
  const dataSource = "dataSource" in props ? props.dataSource : undefined;
  const sourceName = "source" in props ? props.source : undefined;
  const registeredSource = (
    sourceName ? services.sources[sourceName] : undefined
  ) as DataSource<T> | undefined;
  const remoteSource = useMemo(
    () =>
      resolveDataSource(
        { local: hasLocalData, dataSource, source: sourceName },
        sourceName && registeredSource
          ? { [sourceName]: registeredSource }
          : {},
      ),
    [hasLocalData, dataSource, sourceName, registeredSource],
  );
  useEffect(() => {
    if (hasLocalData || dataSource || !sourceName || registeredSource) return;
    const missing = missingSource(sourceName);
    devWarn("AutoTable", "RAC-TABLE-SOURCE", missing.problem, missing.fix);
  }, [hasLocalData, dataSource, sourceName, registeredSource]);
  useLibraryStyles();
  useFieldWarnings("AutoTable", props.searchFields);
  useFieldWarnings("AutoTable", props.formFields);
  const {
    id,
    rowKey,
    title,
    sortTagsLayout = "inline",
    toolbarActions,
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
    [contextRow, setContextRow] = useState<T | null>(null),
    [message, setMessage] = useState("");
  const sourceIdentity = sourceName ?? dataSource;
  const prevSourceRef = useRef(sourceIdentity);
  const sourceChanged = sourceIdentity !== prevSourceRef.current;
  if (sourceChanged) {
    prevSourceRef.current = sourceIdentity;
    if (localQuery.pageIndex !== 0) {
      setLocalQuery((q) => ({ ...q, pageIndex: 0 }));
    }
    if (Object.keys(selected).length > 0) {
      setSelected({});
    }
  }
  const lastResetIdentityRef = useRef(sourceIdentity);
  useEffect(() => {
    // Effects also run on mount; the caller's initial controlled query is
    // legitimate there (e.g. a deep link to page 3). Reset only on a real
    // source identity change, never on mount.
    if (lastResetIdentityRef.current === sourceIdentity) return;
    lastResetIdentityRef.current = sourceIdentity;
    if (props.query !== undefined && props.query.pageIndex !== 0) {
      props.onQueryChange?.({ ...props.query, pageIndex: 0 });
    }
  }, [sourceIdentity]);
  const rendersWithNewFn = useRef(0);
  const warnedUnstableRef = useRef(false);
  const prevFn = useRef(dataSource);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!sourceName && typeof dataSource === "function") {
      if (prevFn.current && prevFn.current !== dataSource) {
        rendersWithNewFn.current += 1;
        if (rendersWithNewFn.current >= 2 && !warnedUnstableRef.current) {
          warnedUnstableRef.current = true;
          console.warn(
            `[AutoTable] The "dataSource" prop changed reference across consecutive renders. ` +
              `If this is an inline function, it triggers an in-place fetch on every render. ` +
              `Fix: wrap dataSource in useCallback or pass a stable function reference.`,
          );
        }
      }
      prevFn.current = dataSource;
    }
  });
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
    return source
      .filter((c) => services.canAccess(c))
      .map((column) => resolveColumn(column, services.columns));
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
  const tipComponent =
    props.tipComponent ??
    services.table?.tipComponent ??
    services.tipComponent ??
    DefaultTip;
  const size = props.size ?? services.table?.size ?? services.size ?? "medium";
  const globalDensity =
    services.table?.density ??
    (services.density === "compact" ? "compact" : "normal");
  const density =
    props.density ??
    (layout.density === "inherit" ? globalDensity : layout.density);
  const baseQuery = props.query ?? localQuery;
  const query = useMemo(() => {
    const raw = {
      ...baseQuery,
      sort: active(settings.sort),
      filter: active(settings.filter),
    };
    if (sourceChanged && raw.pageIndex !== 0) {
      return { ...raw, pageIndex: 0 };
    }
    return raw;
  }, [baseQuery, settings.sort, settings.filter, sourceChanged]);
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
  const source = useTableData(props.data, remoteSource, query);
  const filtered = useMemo(
    () =>
      remoteSource
        ? Array.from(source.rows)
        : source.rows.filter((row) => matchesQuery(row, query.filter)),
    [source.rows, remoteSource, query.filter],
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
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    warnTableId(id, services.namespace);
    warnRowKeys(source.rows, rowKey);
  }, [id, services.namespace, source.rows, rowKey]);
  const selectionCache = useRef(new Map<string, T>());
  const sourceIndex = useMemo(() => {
    const identify = (row: T) =>
      typeof rowKey === "function" ? rowKey(row) : String(row[rowKey]);
    const index = new Map<string, T>();
    const visit = (items: readonly T[]) => {
      for (const row of items) {
        index.set(identify(row), row);
        const children = props.getChildren?.(row);
        if (children?.length) visit(children);
      }
    };
    visit(source.rows);
    return index;
  }, [source.rows, rowKey, props.getChildren]);
  function selectionValues(next: Record<string, true>) {
    return Object.keys(next).flatMap((key) => {
      const row =
        sourceIndex.get(key) ??
        (remoteSource ? selectionCache.current.get(key) : undefined);
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
    manualSorting: !!remoteSource,
    manualPagination: !!remoteSource || !pagination,
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
  const itemHeight =
    props.rowHeight !== undefined && density === "normal"
      ? props.rowHeight
      : (ROW_HEIGHTS[size]?.[density] ?? props.rowHeight ?? 40);
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
  function summaryContent(column: AutoColumn<T>) {
    if (!column.summary) return "";
    if (remoteSource && (props.summaryScope ?? "filtered") === "filtered")
      return props.summaryValues?.[column.key] ?? "—";
    const summaryRows = scopeRows(props.summaryScope ?? "filtered");
    if (typeof column.summary === "function")
      return column.summary(summaryRows);
    const total = summaryRows.reduce(
      (sum, row) => sum + (Number(row[column.key]) || 0),
      0,
    );
    return column.format && summaryRows[0]
      ? column.format(total as T[typeof column.key], summaryRows[0])
      : total;
  }
  const { exporting, doExport } = useTableExport({
    remoteSource,
    query,
    scopeRows,
    columns,
    settings,
    title: typeof title === "string" ? title : id,
    exportXlsx: props.exportXlsx,
    setMessage,
  });
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
  const columnStyle = useMemo(
    () => stickyColumnStyles(ordered, layout.pin, layout.widths),
    [ordered, layout.pin, layout.widths],
  );
  const cellStyle = (column: AutoColumn<T>) => columnStyle.get(column.key)!;
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
  const visibleSignature =
    effectiveVirtual && props.renderExpanded
      ? virtual
          .getVirtualItems()
          .map((v) => v.key)
          .join("|")
      : "";
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
  const total = remoteSource
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
  const sortTags = query.sort.length > 1 && (
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
  );
  function openRowMenu(event: ReactMouseEvent<HTMLTableElement>) {
    const rowElement = (event.target as HTMLElement | null)?.closest?.(
      "tr[data-row-id]",
    );
    const id = rowElement?.getAttribute("data-row-id");
    const row = id ? sourceIndex.get(id) : undefined;
    if (!row) {
      event.preventDefault();
      return;
    }
    const hasVisibleAction = props.rowActions?.some(
      (action) => !action.hidden?.(row),
    );
    if (!hasVisibleAction) {
      event.preventDefault();
      return;
    }
    setContextRow(row);
  }
  const toolsMode =
    (typeof toolbarActions === "object" && toolbarActions?.mode) || "icon";
  function renderTool(icon: ReactNode, label: string) {
    if (toolsMode === "text") return label;
    if (toolsMode === "both")
      return (
        <>
          <span className="auto-icon" aria-hidden="true">
            {icon}
          </span>
          <span>{label}</span>
        </>
      );
    return (
      <>
        <span className="auto-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="auto-sr-only">{label}</span>
      </>
    );
  }
  return (
    <section
      className="auto-root auto-table"
      data-height={height === "auto" ? "auto" : "fixed"}
      data-virtual={effectiveVirtual}
      data-size={size}
      data-density={density}
      aria-label={typeof title === "string" ? title : id}
      data-testid={racTestId("table", id)}
    >
      {!props.searchInline && props.searchFields && (
        <AutoSearch
          size={size}
          {...props.searchLayout}
          tipComponent={props.searchLayout?.tipComponent ?? tipComponent}
          fields={props.searchFields}
          onSearch={(filter) =>
            changeQuery({
              filter,
              pageIndex: 0,
            })
          }
        />
      )}
      <div
        className="auto-toolbar"
        data-search-inline={props.searchInline ? "" : undefined}
      >
        {props.searchInline && props.searchFields && (
          <AutoSearch
            size={size}
            {...props.searchLayout}
            tipComponent={props.searchLayout?.tipComponent ?? tipComponent}
            fields={props.searchFields}
            onSearch={(filter) =>
              changeQuery({
                filter,
                pageIndex: 0,
              })
            }
          />
        )}
        <div className="auto-toolbar-left auto-actions">
          {title && <strong>{title}</strong>}
          <span className="auto-muted">
            {tr("{0} records", [total.toLocaleString()])}
          </span>
          {props.headerExtra}
          {sortTagsLayout === "inline" && sortTags}
        </div>
        <div className="auto-toolbar-right">
          {(props.actions || props.toolbar || props.onAdd) && (
            <div className="auto-actions auto-business-actions">
              {props.actions}
              {props.toolbar}
              {props.onAdd && (
                <button
                  type="button"
                  className="auto-primary"
                  data-testid="rac-add"
                  onClick={() =>
                    setEdit({
                      kind: "add",
                    })
                  }
                >
                  {tr("Add")}
                </button>
              )}
            </div>
          )}
          {(props.actions || props.toolbar || props.onAdd) &&
            (showToolbarAction(toolbarActions, "refresh") ||
              showToolbarAction(toolbarActions, "settings") ||
              showToolbarAction(toolbarActions, "export") ||
              showToolbarAction(toolbarActions, "json") ||
              (typeof toolbarActions === "object" &&
                Boolean(toolbarActions?.extra))) && (
              <div className="auto-toolbar-divider" aria-hidden="true" />
            )}
          {(showToolbarAction(toolbarActions, "refresh") ||
            showToolbarAction(toolbarActions, "settings") ||
            showToolbarAction(toolbarActions, "export") ||
            showToolbarAction(toolbarActions, "json") ||
            (typeof toolbarActions === "object" &&
              Boolean(toolbarActions?.extra))) && (
            <div className="auto-actions auto-tools">
              {showToolbarAction(toolbarActions, "refresh") && (
                <button
                  type="button"
                  className="auto-tool-btn"
                  data-testid="rac-refresh"
                  aria-label={tr("Refresh")}
                  title={tr("Refresh")}
                  onClick={source.refresh}
                  disabled={source.loading}
                >
                  {renderTool(
                    <RefreshIcon
                      className={source.loading ? "auto-spin" : undefined}
                    />,
                    tr("Refresh"),
                  )}
                </button>
              )}
              {showToolbarAction(toolbarActions, "settings") && (
                <button
                  type="button"
                  className="auto-tool-btn"
                  data-testid="rac-settings"
                  aria-label={tr("Settings")}
                  title={tr("Settings")}
                  onClick={() => setDraft(structuredClone(settings))}
                >
                  {renderTool(<SettingsIcon />, tr("Settings"))}
                </button>
              )}
              {showToolbarAction(toolbarActions, "export") && (
                <button
                  type="button"
                  className="auto-tool-btn"
                  data-testid="rac-export"
                  aria-label={exporting ? tr("Exporting…") : tr("Export")}
                  title={exporting ? tr("Exporting…") : tr("Export")}
                  disabled={exporting}
                  onClick={() => void doExport(active(settings.export).format)}
                >
                  {renderTool(
                    <ExportIcon />,
                    exporting ? tr("Exporting…") : tr("Export"),
                  )}
                </button>
              )}
              {showToolbarAction(toolbarActions, "json") && (
                <button
                  type="button"
                  className="auto-tool-btn"
                  aria-label={tr("JSON")}
                  title={tr("JSON")}
                  onClick={() => setJson(!json)}
                  aria-pressed={json}
                >
                  {renderTool(<JsonIcon />, tr("JSON"))}
                </button>
              )}
              {typeof toolbarActions === "object" && toolbarActions?.extra}
            </div>
          )}
        </div>
      </div>
      {selectedRows.length > 0 &&
        props.renderSelectionBar !== false &&
        (props.renderSelectionBar ? (
          props.renderSelectionBar(selectedRows, () => setSelected({}))
        ) : (
          <div
            className="auto-selection-bar"
            role="region"
            aria-label={tr("Selection actions")}
          >
            <div className="auto-selection-info">
              <span className="auto-badge">
                {tr("{0} selected", [selectedRows.length])}
              </span>
              <button
                type="button"
                className="auto-selection-clear"
                onClick={() => setSelected({})}
              >
                {tr("Clear selection")}
              </button>
            </div>
            <div className="auto-actions auto-selection-actions">
              {props.batchActions?.(selectedRows)}
              {props.onDelete && (
                <button
                  type="button"
                  className="auto-danger"
                  data-testid="rac-delete-selected"
                  onClick={() => setDeleting(selectedRows)}
                >
                  {tr("Delete selected")}
                </button>
              )}
            </div>
          </div>
        ))}
      {sortTagsLayout === "separate" && sortTags}
      {source.error && (
        <div role="alert" className="auto-error">
          {source.error}{" "}
          <button
            type="button"
            data-testid="rac-retry"
            onClick={source.refresh}
          >
            {tr("Retry")}
          </button>
        </div>
      )}
      {settingsError && (
        <div role="alert" className="auto-error">
          {tr("Could not save settings: ")}
          {settingsError}
          <button onClick={retry}>{tr("Retry save")}</button>
        </div>
      )}
      {message && (
        <div role="status" className="auto-notice">
          {message}
          <button
            aria-label={tr("Dismiss message")}
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {json && showToolbarAction(toolbarActions, "json") ? (
        <div className="auto-json">
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(JSON.stringify(scopeRows("page"), null, 2))
                .then(() => setMessage(tr("Copied")))
                .catch((e) => setMessage(tr(errorMessage(e))))
            }
          >
            {tr("Copy JSON")}
          </button>
          <pre>{JSON.stringify(scopeRows("page"), null, 2)}</pre>
        </div>
      ) : (
        <>
          <div
            className="auto-table-progress"
            data-loading={source.loading ? "true" : "false"}
            aria-hidden="true"
          />
          <div
            ref={scroll}
            className="auto-table-scroll"
            style={{
              height: height === "auto" ? undefined : height,
              overflow: "auto",
            }}
            aria-busy={source.loading}
          >
            <RowContextMenu
              actions={props.rowActions}
              row={contextRow}
              onOpenChange={(open) => {
                if (!open) setContextRow(null);
              }}
              onSelect={(action, row) => {
                void Promise.resolve()
                  .then(() =>
                    resolveRowAction(action, services.rowActions)(row),
                  )
                  .catch((error) => setMessage(tr(errorMessage(error))));
              }}
            >
              <table
                onContextMenu={
                  props.rowActions?.length ? openRowMenu : undefined
                }
                style={{
                  minWidth: ordered.reduce((n, c) => n + width(c), 44),
                  width: "100%",
                  tableLayout: "fixed",
                }}
              >
                <TableHeader
                  tipComponent={tipComponent}
                  columns={ordered}
                  rows={source.rows}
                  sort={query.sort}
                  filter={query.filter}
                  style={cellStyle}
                  hasActions={!!(props.onEdit || props.onDelete)}
                  allSelected={
                    rows.length > 0 && rows.every((r) => selected[r.id])
                  }
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
                  reorderable={props.reorderableColumns ?? true}
                  onReorder={(fromKey, toKey, position) => {
                    if (fromKey === toKey) return;
                    const baseOrder = [...new Set([...layout.order, ...keys])];
                    const fromIndex = baseOrder.indexOf(fromKey);
                    if (fromIndex < 0) return;
                    baseOrder.splice(fromIndex, 1);
                    const toIndex = baseOrder.indexOf(toKey);
                    if (toIndex < 0) return;
                    const insertIndex =
                      position === "after" ? toIndex + 1 : toIndex;
                    baseOrder.splice(insertIndex, 0, fromKey);
                    saveSettings({
                      ...settings,
                      layout: replaceActive(settings.layout, {
                        ...layout,
                        order: baseOrder,
                      }),
                    });
                  }}
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
                  {renderRows.map(({ row, index }) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      index={index}
                      rows={rows}
                      ordered={ordered}
                      current={current}
                      setCurrent={setCurrent}
                      selected={!!selected[row.id]}
                      effectiveVirtual={effectiveVirtual}
                      renderExpanded={props.renderExpanded}
                      rowClassName={props.rowClassName}
                      rowStyle={props.rowStyle}
                      itemHeight={itemHeight}
                      measureRef={virtual.measureElement}
                      cellStyle={cellStyle}
                      formatted={formatted}
                      rowLoading={props.rowLoading}
                      onEdit={
                        props.onEdit
                          ? (row) => setEdit({ kind: "edit", row })
                          : undefined
                      }
                      onDelete={
                        props.onDelete ? (row) => setDeleting([row]) : undefined
                      }
                      colCount={colCount}
                      setMessage={setMessage}
                      tr={tr}
                    />
                  ))}
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
                          (source.loading ? tr("Loading…") : tr("No data"))}
                      </td>
                    </tr>
                  )}
                </tbody>
                {ordered.some((c) => c.summary) && (
                  <tfoot>
                    <tr>
                      <td className="auto-table-cell-selection">
                        {tr("Total")}
                      </td>
                      {ordered.map((c) => (
                        <td key={c.key} style={cellStyle(c)}>
                          {summaryContent(c)}
                        </td>
                      ))}
                      {(props.onEdit || props.onDelete) && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </RowContextMenu>
          </div>
        </>
      )}
      {pagination && (
        <TablePagination
          pageIndex={query.pageIndex}
          pageSize={query.pageSize}
          pages={pages}
          pageSizeOptions={[
            ...new Set([props.pageSize ?? 10, 10, 20, 50, 100]),
          ].sort((a, b) => a - b)}
          onChange={changeQuery}
        />
      )}
      <TableDialogs
        id={id}
        columns={columns}
        formFields={props.formFields}
        tipComponent={tipComponent}
        getId={getId}
        sourceRefresh={source.refresh}
        draft={draft}
        setDraft={setDraft}
        saveSettings={saveSettings}
        query={query}
        setLocalQuery={setLocalQuery}
        onQueryChange={props.onQueryChange}
        edit={edit}
        setEdit={setEdit}
        onAdd={props.onAdd}
        onEdit={props.onEdit}
        deleting={deleting}
        setDeleting={setDeleting}
        onDelete={props.onDelete}
        setSelected={setSelected}
      />
    </section>
  );
}
