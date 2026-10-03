import { devWarn, racMessage } from "../../core/errors";
import type { ColumnRegistry, SourceLoader } from "../../core/registry";
import type { AutoColumn, DataSource, RowAction } from "./types";

/** Copy registry functions onto a column. A function already on the column wins. */
export function resolveColumn<T extends object>(
  column: AutoColumn<T>,
  registry: Record<string, ColumnRegistry>,
): AutoColumn<T> {
  if (!column.component) return column;
  const registered = registry[column.component];
  if (!registered) {
    devWarn(
      "AutoTable",
      "RAC-COLUMN-COMPONENT",
      `columns["${column.key}"] component "${column.component}" is not registered.`,
      "Add it to AutoConfigProvider config.columns, or pass render, format, or sort on the column.",
    );
    return column;
  }
  return {
    ...column,
    render: column.render ?? (registered.render as AutoColumn<T>["render"]),
    format: column.format ?? (registered.format as AutoColumn<T>["format"]),
    sort: column.sort ?? (registered.sort as AutoColumn<T>["sort"]),
    exportFormat:
      column.exportFormat ??
      (registered.exportFormat as AutoColumn<T>["exportFormat"]),
  };
}

export function missingSource(source: string) {
  const problem = `source "${source}" is not registered.`;
  const fix = `Add config.sources["${source}"] on AutoConfigProvider, or pass dataSource.`;
  return {
    problem,
    fix,
    reject: () =>
      Promise.reject(
        new Error(racMessage("AutoTable", "RAC-TABLE-SOURCE", problem, fix)),
      ),
  };
}

/** `data` wins, then `dataSource`, then `config.sources[source]`. */
export function resolveDataSource<T extends object>(
  owner: {
    local?: boolean;
    dataSource?: DataSource<T>;
    source?: string;
  },
  sources: Record<string, SourceLoader>,
): DataSource<T> | undefined {
  if (owner.local) return;
  if (owner.dataSource) return owner.dataSource;
  if (!owner.source) return;
  const registered = sources[owner.source] as DataSource<T> | undefined;
  if (registered) return registered;
  return missingSource(owner.source).reject;
}

/** `onClick` wins. Otherwise call `config.rowActions[action]`. */
export function resolveRowAction<T>(
  action: RowAction<T>,
  registry: Record<string, (row: object) => void | Promise<void>>,
): (row: T) => void | Promise<void> {
  if (action.onClick) return action.onClick;
  const registered = action.action ? registry[action.action] : undefined;
  if (registered) return registered as (row: T) => void | Promise<void>;
  const problem = `rowActions["${action.id}"] has no onClick or registered action.`;
  const fix =
    "Pass onClick, or action: a key on AutoConfigProvider config.rowActions.";
  return () => {
    devWarn("AutoTable", "RAC-ROW-ACTION", problem, fix);
    throw new Error(racMessage("AutoTable", "RAC-ROW-ACTION", problem, fix));
  };
}
