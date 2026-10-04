import { test, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { AutoForm } from "../src/components/AutoForm";
import { AutoTable, type AutoTableHandle } from "../src/components/AutoTable";
import { useAutoDialog } from "../src/components/AutoDialog";
import { defaults, unsafeField } from "../src/core/config";
import { serializeRsql, buildQuery } from "../src/core/query";
import { fetchExportRows } from "../src/components/AutoTable/export";
import { RacError } from "../src/core/errors";
import { resetDevChecks } from "../src/core/dev";
import { emptyQuery } from "../src/core/query";

afterEach(() => {
  resetDevChecks();
  document.documentElement.style.setProperty("--auto-text", "#202e29");
  vi.restoreAllMocks();
});

test("duplicate fields and unsafe RSQL name the code and the fix", () => {
  expect(() => defaults([{ name: "x" }, { name: "x" }], {})).toThrow(
    /"x"[\s\S]*RAC-FIELD-DUPLICATE/,
  );
  expect(() =>
    serializeRsql({
      kind: "condition",
      field: "a b",
      operator: "eq",
      value: 1,
    }),
  ).toThrow(/a b[\s\S]*RAC-QUERY-FIELD/);
});

test("unsafeField still warns when select has no options", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  render(
    <AutoForm
      fields={[
        unsafeField<{ status: string }>({ name: "status", type: "select" }),
      ]}
    />,
  );
  expect(warn.mock.calls.flat().join("\n")).toContain("RAC-FIELD-OPTIONS");
  expect(warn.mock.calls.flat().join("\n")).toContain("Fix:");
});

test("duplicate row keys and a missing stylesheet warn with a fix", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  document.documentElement.style.removeProperty("--auto-text");
  resetDevChecks();
  render(
    <AutoTable
      id=""
      rowKey="id"
      data={[
        { id: "1", name: "a" },
        { id: "1", name: "b" },
      ]}
      columns={[{ key: "name", label: "Name" }]}
    />,
  );
  await waitFor(() => {
    const text = warn.mock.calls.flat().join("\n");
    expect(text).toContain("RAC-TABLE-ROWID");
    expect(text).toContain("RAC-TABLE-ID");
    expect(text).toContain("RAC-CSS-MISSING");
  });
});

test("xlsx export without an adapter keeps the translated status and the English error", async () => {
  const ref = createRef<AutoTableHandle<{ id: string }>>();
  render(
    <AutoTable
      ref={ref}
      id="people"
      rowKey="id"
      data={[{ id: "1" }]}
      columns={[{ key: "id" }]}
    />,
  );
  await ref.current!.export("xlsx");
  expect(
    await screen.findByText("Configure the XLSX export adapter"),
  ).toBeVisible();
  const error = new RacError(
    "AutoTable",
    "RAC-TABLE-XLSX",
    'export(format="xlsx") requires an XLSX adapter.',
    "pass exportXlsx",
    "Configure the XLSX export adapter",
  );
  expect(error.message).toContain("RAC-TABLE-XLSX");
  expect(error.message).toContain("exportXlsx");
});

test("a short remote page aborts export with RAC-TABLE-EXPORT-PAGE", async () => {
  await expect(
    fetchExportRows(
      async () => ({ rows: [], total: 4 }),
      {
        pageIndex: 0,
        pageSize: 2,
        sort: [],
        filter: emptyQuery,
      },
      new AbortController().signal,
    ),
  ).rejects.toThrow(/RAC-TABLE-EXPORT-PAGE/);
});

test("useAutoDialog outside the provider names the fix", () => {
  function Probe() {
    useAutoDialog();
    return null;
  }
  expect(() => render(<Probe />)).toThrow(
    /AutoDialogProvider[\s\S]*RAC-DIALOG-PROVIDER/,
  );
});

test("match between warns when the value is a scalar", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  buildQuery({ amount: 5 }, [{ name: "amount", search: { match: "between" } }]);
  expect(warn.mock.calls.flat().join("\n")).toContain("RAC-FIELD-BETWEEN");
});
