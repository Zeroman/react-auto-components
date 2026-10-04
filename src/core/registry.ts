import type { ReactNode } from "react";
import type { QueryNode } from "./query";

/**
 * Functions for a column `component` key. A function set on the column wins.
 * `row` is the row object the host registered this renderer for.
 */
export interface ColumnRegistry {
  render?: (value: unknown, row: object, index: number) => ReactNode;
  format?: (value: unknown, row: object) => string | number;
  sort?: (a: object, b: object) => number;
  exportFormat?: (row: object) => unknown;
}

/** Query passed to a registered table source. Same shape as `TableQuery`. */
export interface SourceQuery {
  pageIndex: number;
  pageSize: number;
  sort: { id: string; desc: boolean }[];
  filter: QueryNode;
}

/**
 * Remote page loader registered on `config.sources`.
 * Resolve `{ rows, total }`. `total` is the full filtered count.
 * Reject to show `error.message` and a retry button.
 */
export type SourceLoader = (
  query: SourceQuery,
  context: { signal: AbortSignal },
) => Promise<{ rows: object[]; total: number }>;

/**
 * Tab list loader registered on `config.tabsSources`.
 * Resolve the tab items; reject to show `error.message` and a retry button.
 */
export type TabsSource = (context: {
  signal: AbortSignal;
}) => Promise<readonly object[]>;
