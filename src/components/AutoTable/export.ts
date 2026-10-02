import type { AutoColumn } from "./types";
import { RacError } from "../../core/errors";
export interface ExportData {
  headers: string[];
  rows: unknown[][];
}
export function formatted<T extends object>(
  column: AutoColumn<T>,
  row: T,
): string | number {
  const v = row[column.key];
  if (column.format) return column.format(v, row);
  if (v == null) return "";
  const option = column.options?.find((o) => Object.is(o.value, v));
  if (option) return option.label;
  if (column.type === "date" || column.type === "datetime") {
    const d = new Date(v as string | number);
    if (!Number.isNaN(d.getTime()))
      return column.type === "date"
        ? d.toLocaleDateString()
        : d.toLocaleString();
  }
  if (column.type === "percentage") return `${Number(v) * 100}%`;
  return typeof v === "number"
    ? v
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
}
export function collectExport<T extends object>(
  rows: readonly T[],
  columns: readonly AutoColumn<T>[],
  names?: readonly string[],
): ExportData {
  const ordered = names
    ? [...new Set(names)].flatMap((k) => {
        const c = columns.find((c) => c.key === k);
        return c ? [c] : [];
      })
    : columns;
  const allowed = ordered.filter(
    (c) => c.export !== false && !String(c.key).startsWith("_auto_"),
  );
  return {
    headers: allowed.map((c) => c.label ?? c.key),
    rows: rows.map((row) =>
      allowed.map((c) =>
        c.exportFormat ? c.exportFormat(row) : formatted(c, row),
      ),
    ),
  };
}
export function toCsv(data: ExportData) {
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    "\uFEFF" +
    [data.headers, ...data.rows].map((r) => r.map(cell).join(",")).join("\r\n")
  );
}
export function toJson(data: ExportData) {
  return JSON.stringify(
    data.rows.map((row) =>
      Object.fromEntries(data.headers.map((h, i) => [h, row[i]])),
    ),
    null,
    2,
  );
}
export function download(data: BlobPart, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function fetchExportRows<T extends object>(
  source: import("./types").DataSource<T>,
  query: import("./types").TableQuery,
  signal: AbortSignal,
): Promise<T[]> {
  const result: T[] = [];
  let pages = 1;
  for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
    signal.throwIfAborted();
    const page = await source({ ...query, pageIndex }, { signal });
    signal.throwIfAborted();
    if (pageIndex === 0) pages = Math.ceil(page.total / query.pageSize);
    if (!page.rows.length && pageIndex < pages)
      throw new RacError(
        "AutoTable",
        "RAC-TABLE-EXPORT-PAGE",
        `export page ${pageIndex + 1} of ${pages} returned no rows while total said there were more.`,
        "Return a stable total and the rows for that pageIndex. An empty page before the last page aborts the export so a partial file is not saved.",
        "Export data is incomplete. Try again.",
      );
    result.push(...page.rows);
  }
  return result;
}
