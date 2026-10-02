import type { AutoSearchProps } from "../AutoSearch";
import type { CSSProperties, ReactNode, Ref } from "react";
import type {
  Access,
  ComponentSize,
  Field,
  FieldName,
  Option,
  TableDensity,
} from "../../core/types";
import type { QueryNode } from "../../core/query";
export interface TableSort {
  /** Column key. */
  id: string;
  desc: boolean;
}
/**
 * The query sent to `dataSource` and stored for local filtering.
 * `pageIndex` is zero-based. `pageSize` defaults from the `pageSize` prop (`10`).
 */
export interface TableQuery {
  pageIndex: number;
  pageSize: number;
  sort: TableSort[];
  /** Same AST as `AutoSearch` `onSearch`. */
  filter: QueryNode;
}
/**
 * One page of a remote table. Called again when the query changes; the previous call is aborted.
 * Reject to show `error.message` and a retry button. Resolve `{ rows, total }`.
 * `total` is the full filtered count, not the page length. Export walks pages until `total` is covered.
 */
export type DataSource<T> = (
  query: TableQuery,
  context: { signal: AbortSignal },
) => Promise<{ rows: T[]; total: number }>;
/** `"page"` is the current page. `"filtered"` is every local match, or every remote page when exporting. `"selected"` is the selection. */
export type RowScope = "page" | "filtered" | "selected";
/**
 * One column. `key` must be a field of `T`.
 * `type` only affects formatting (`date`, `percentage`, …). It is not a form field type.
 * Omit `columns` and the table uses the keys of the first row, skipping keys that start with `_auto_`.
 */
export interface AutoColumn<T extends object> extends Access {
  key: FieldName<T>;
  label?: string;
  header?: ReactNode;
  type?: "text" | "number" | "date" | "datetime" | "percentage" | "progress";
  width?: number;
  minWidth?: number;
  hidden?: boolean;
  pin?: "left" | "right";
  align?: "left" | "center" | "right";
  sortable?: boolean;
  filterable?: boolean;
  options?: readonly Option[];
  format?: (value: T[FieldName<T>], row: T) => string | number;
  render?: (value: T[FieldName<T>], row: T, index: number) => ReactNode;
  sort?: (a: T, b: T) => number;
  /**
   * Key in `AutoConfigProvider` `config.columns`.
   * Fills `render`, `format`, `sort`, and `exportFormat` when that function is omitted.
   * A function on the column wins. An unknown key warns `RAC-COLUMN-COMPONENT` and the cell uses the default format.
   */
  component?: string;
  export?: boolean;
  exportFormat?: (row: T) => unknown;
  summary?: boolean | ((rows: readonly T[]) => ReactNode);
  merge?: boolean;
  copyable?: boolean;
}
/**
 * A row menu action. `onClick` rejection is caught and shown in the table status for about 2.5s.
 * The row is not removed unless your handler changes `data`.
 */
export interface RowAction<T> {
  id: string;
  label: string;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  /**
   * Key in `config.rowActions`. Used when `onClick` is omitted. `onClick` wins.
   * Neither one warns `RAC-ROW-ACTION` when the item is chosen.
   */
  action?: string;
  onClick?: (row: T) => void | Promise<void>;
}
/**
 * `refresh` re-runs `dataSource`. `reset` clears sort, filter, selection, and saved layout back to the column defaults.
 * `export` rejects are caught; the status shows the translated message. `"xlsx"` without `exportXlsx` throws `RAC-TABLE-XLSX`.
 */
export interface AutoTableHandle<T> {
  refresh(): void;
  reset(): void;
  /** `id` is the `rowKey` string. No-op when that id is not in the loaded rows. */
  scrollToRow(id: string): void;
  getSelectedRows(): T[];
  export(format: "csv" | "json" | "xlsx", scope?: RowScope): Promise<void>;
}
/**
 * Shared table props. Pass exactly one of `data` or `dataSource` ({@link AutoTableProps}).
 * `id` is required: settings are stored at `${namespace}:table:${id}`. An empty id warns in dev (`RAC-TABLE-ID`).
 * `rowKey` must be unique per loaded row. Duplicates warn in dev (`RAC-TABLE-ROWID`).
 */
export interface TableBaseProps<T extends object> {
  /** Stable id. Becomes the localStorage / settings key together with `namespace`. */
  id: string;
  columns?: readonly AutoColumn<T>[];
  /**
   * Identity of a row. A field name is stringified. A function should return a stable unique string.
   * Selection, expansion, and `scrollToRow` all use it.
   */
  rowKey: FieldName<T> | ((row: T) => string);
  title?: string;
  /** Default `10`. */
  pageSize?: number;
  /** Default `true`. */
  pagination?: boolean;
  query?: TableQuery;
  onQueryChange?: (query: TableQuery) => void;
  virtual?: boolean;
  /** Numeric values size the scroll area; "auto" fills a height-constrained parent. */
  height?: number | "auto";
  rowHeight?: number;
  size?: ComponentSize;
  density?: TableDensity;
  searchFields?: readonly Field<T>[];
  searchLayout?: Pick<
    AutoSearchProps<T>,
    | "columns"
    | "labelPosition"
    | "labelAlign"
    | "labelWidth"
    | "density"
    | "size"
  >;
  formFields?: readonly Field<T>[];
  onAdd?: (values: T) => void | Promise<void>;
  onEdit?: (row: T, values: T) => void | Promise<void>;
  onDelete?: (rows: readonly T[]) => void | Promise<void>;
  getChildren?: (row: T) => T[] | undefined;
  renderExpanded?: (row: T) => ReactNode;
  expandAll?: boolean;
  onSelectionChange?: (rows: T[]) => void;
  toolbar?: ReactNode;
  rowActions?: readonly RowAction<T>[];
  rowClassName?: (row: T) => string;
  rowStyle?: (row: T) => CSSProperties;
  rowLoading?: (row: T) => boolean;
  summaryScope?: RowScope;
  /** Server aggregates for the complete filtered result, keyed by column. */
  summaryValues?: Partial<Record<FieldName<T>, ReactNode>>;
  versions?: Partial<
    Record<"layout" | "sort" | "filter" | "export", string | number>
  >;
  /**
   * Required for `format: "xlsx"`. CSV and JSON work without it.
   * The packaged adapter is `exportXlsx` from `@zeroman.yang/react-auto-components/xlsx` and needs the optional `exceljs` dependency.
   * Missing adapter: thrown `RAC-TABLE-XLSX`, UI string "Configure the XLSX export adapter".
   */
  exportXlsx?: (
    data: { headers: string[]; rows: unknown[][] },
    options: { fileName: string },
  ) => Promise<ArrayBuffer | Uint8Array>;
  empty?: ReactNode;
  ref?: Ref<AutoTableHandle<T>>;
}
/**
 * Local rows, a remote page function, or a `config.sources` key. Pass exactly one.
 * `source` looks up `AutoConfigProvider` `config.sources`. An unknown key warns
 * `RAC-TABLE-SOURCE` and the table shows that message with retry.
 * Passing more than one owner is a type error.
 */
export type AutoTableProps<T extends object> = TableBaseProps<T> &
  (
    | { data: readonly T[]; dataSource?: never; source?: never }
    | { data?: never; dataSource: DataSource<T>; source?: never }
    | { data?: never; dataSource?: never; source: string }
  );
