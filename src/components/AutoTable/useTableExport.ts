import { useEffect, useRef, useState } from "react";
import { useAutoText } from "../../core/i18n";
import { RacError, userText } from "../../core/errors";
import {
  collectExport,
  download,
  fetchExportRows,
  toCsv,
  toJson,
} from "./export";
import type { AutoColumn, DataSource, RowScope, TableQuery } from "./types";
import type { TableSettings } from "./settings";
import { active } from "./settings";

export interface UseTableExportOptions<T extends object> {
  remoteSource: DataSource<T> | undefined;
  query: TableQuery;
  scopeRows: (scope: RowScope) => readonly T[];
  columns: readonly AutoColumn<T>[];
  settings: TableSettings;
  title?: string;
  exportXlsx?: (
    data: { headers: string[]; rows: unknown[][] },
    options: { fileName: string },
  ) => Promise<ArrayBuffer | Uint8Array>;
  setMessage: (msg: string) => void;
}

export function useTableExport<T extends object>({
  remoteSource,
  query,
  scopeRows,
  columns,
  settings,
  title,
  exportXlsx,
  setMessage,
}: UseTableExportOptions<T>) {
  const tr = useAutoText();
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
        remoteSource && scope === "filtered"
          ? await fetchExportRows(remoteSource, query, controller.signal)
          : scopeRows(scope);
      const data = collectExport(exportRows, columns, config.columns);
      const name = config.fileName || title || tr("Export");
      if (format === "xlsx") {
        if (!exportXlsx)
          throw new RacError(
            "AutoTable",
            "RAC-TABLE-XLSX",
            'export(format="xlsx") requires an XLSX adapter.',
            'Import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx" and pass exportXlsx={exportXlsx}. exceljs is an optionalDependency and is not installed by default.',
            "Configure the XLSX export adapter",
          );
        const buffer = await exportXlsx(data, {
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
      setMessage(tr("Export complete"));
    } catch (e) {
      if (!controller.signal.aborted) setMessage(userText(tr, e));
    } finally {
      exportController.current = null;
      if (!controller.signal.aborted) setExporting(false);
    }
  }

  return { exporting, doExport };
}
