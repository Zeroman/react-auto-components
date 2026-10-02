import { RacError } from "../core/errors";

/**
 * Optional XLSX writer. Loads `exceljs` on first call.
 * `exceljs` is an optionalDependency: a normal install can omit it, and the failure is this error rather than a missing-module stack.
 * Pass the function to `AutoTable` `exportXlsx`. CSV and JSON do not need it.
 * `sheetName` defaults to `"Data"`. Returns an ArrayBuffer.
 */
export async function exportXlsx(
  data: { headers: string[]; rows: unknown[][] },
  options: { fileName: string; sheetName?: string },
) {
  type WorkbookFactory = new () => {
    addWorksheet(name?: string): {
      addRow(row: readonly unknown[]): unknown;
    };
    xlsx: { writeBuffer(): Promise<ArrayBuffer> };
  };
  let ExcelJS: { Workbook: WorkbookFactory };
  try {
    ExcelJS = (
      (await import("exceljs")) as { default: { Workbook: WorkbookFactory } }
    ).default;
  } catch {
    throw new RacError(
      "exportXlsx",
      "RAC-XLSX-DEP",
      "exceljs could not be loaded.",
      'Add the optional dependency with `pnpm add exceljs`, then import { exportXlsx } from "@zeroman.yang/react-auto-components/xlsx".',
      "Configure the XLSX export adapter",
    );
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(options.sheetName ?? "Data");
  sheet.addRow(data.headers);
  for (const row of data.rows)
    sheet.addRow(
      row.map((v) =>
        v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v,
      ),
    );
  return workbook.xlsx.writeBuffer();
}
