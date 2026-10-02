import { test, expect } from "vitest";
import { collectExport, toCsv } from "../src/components/AutoTable/export";
test("export order formatting hidden flags and csv quoting", () => {
  const d = collectExport(
    [{ a: 'Zhang,"San', b: 2, c: "secret" }],
    [
      { key: "a", label: "Name" },
      { key: "b", label: "Amount", exportFormat: (row) => row.b * 10 },
      { key: "c", export: false },
    ],
    ["b", "a", "b", "c"],
  );
  expect(d.headers).toEqual(["Amount", "Name"]);
  expect(d.rows).toEqual([[20, 'Zhang,"San']]);
  expect(toCsv(d)).toContain('"Zhang,""San"');
  expect(toCsv({ headers: ["Value"], rows: [["=1+1"], [-2]] })).toContain(
    "'=1+1",
  );
});

test("remote export fetches every matching page without mutating the UI query", async () => {
  const { fetchExportRows } =
    await import("../src/components/AutoTable/export");
  const pages: number[] = [];
  const query = {
    pageIndex: 4,
    pageSize: 2,
    sort: [],
    filter: { kind: "group" as const, operator: "and" as const, children: [] },
  };
  const result = await fetchExportRows(
    async (q) => {
      pages.push(q.pageIndex);
      return {
        rows: [1, 2, 3, 4, 5]
          .slice(q.pageIndex * 2, q.pageIndex * 2 + 2)
          .map((id) => ({ id })),
        total: 5,
      };
    },
    query,
    new AbortController().signal,
  );
  expect(result.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
  expect(pages).toEqual([0, 1, 2]);
  expect(query.pageIndex).toBe(4);
});

test("XLSX adapter round trips unicode text, literal formulas and numbers", async () => {
  const { exportXlsx } = await import("../src/adapters/xlsx");
  const { default: ExcelJS } = await import("exceljs");
  const buffer = await exportXlsx(
    {
      headers: ["Name", "Number value"],
      rows: [
        ["café", -2],
        ["=1+1", 0],
      ],
    },
    { fileName: "Check" },
  );
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  expect(sheet.getCell("A2").value).toBe("café");
  expect(sheet.getCell("B2").value).toBe(-2);
  expect(sheet.getCell("A3").value).toBe("=1+1");
  expect(sheet.getCell("B3").value).toBe(0);
});
