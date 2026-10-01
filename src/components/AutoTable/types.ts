import type { AutoSearchPanelProps } from "../AutoSearchPanel";
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
  id: string;
  desc: boolean;
}
export interface TableQuery {
  pageIndex: number;
  pageSize: number;
  sort: TableSort[];
  filter: QueryNode;
}
export type DataSource<T> = (
  query: TableQuery,
  context: { signal: AbortSignal },
) => Promise<{ rows: T[]; total: number }>;
export type RowScope = "page" | "filtered" | "selected";
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
  export?: boolean;
  exportFormat?: (row: T) => unknown;
  summary?: boolean | ((rows: readonly T[]) => ReactNode);
  merge?: boolean;
  copyable?: boolean;
}
export interface RowAction<T> {
  id: string;
  label: string;
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
  onClick: (row: T) => void | Promise<void>;
}
export interface AutoTableHandle<T> {
  refresh(): void;
  reset(): void;
  scrollToRow(id: string): void;
  getSelectedRows(): T[];
  export(format: "csv" | "json" | "xlsx", scope?: RowScope): Promise<void>;
}
export interface TableBaseProps<T extends object> {
  id: string;
  columns?: readonly AutoColumn<T>[];
  rowKey: FieldName<T> | ((row: T) => string);
  title?: string;
  pageSize?: number;
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
    AutoSearchPanelProps<T>,
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
  exportXlsx?: (
    data: { headers: string[]; rows: unknown[][] },
    options: { fileName: string },
  ) => Promise<ArrayBuffer | Uint8Array>;
  empty?: ReactNode;
  ref?: Ref<AutoTableHandle<T>>;
}
export type AutoTableProps<T extends object> = TableBaseProps<T> &
  (
    | { data: readonly T[]; dataSource?: never }
    | { data?: never; dataSource: DataSource<T> }
  );
