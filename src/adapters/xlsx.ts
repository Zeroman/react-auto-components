export async function exportXlsx(
  data: { headers: string[]; rows: unknown[][] },
  options: { fileName: string; sheetName?: string },
) {
  const { default: ExcelJS } = await import("exceljs");
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
