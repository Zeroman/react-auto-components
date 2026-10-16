import { createRef, useState } from "react";
import { test, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
import type { AutoTableHandle } from "../src/components/AutoTable";
import { FilterEditor } from "../src/components/AutoTable/FilterEditor";
import { TableHeader } from "../src/components/AutoTable/TableHeader";
import { SettingsPanel } from "../src/components/AutoTable/SettingsPanel";
import { initialSettings } from "../src/components/AutoTable/settings";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { emptyQuery } from "../src/core/query";

const data = [
  { id: "1", name: "A", age: 20 },
  { id: "2", name: "B", age: 10 },
];

test("default Clear selection button fires onSelectionChange with []", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  render(
    <AutoTable
      id="audit-clear-default"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  expect(onSelectionChange).toHaveBeenCalledWith([data[0]]);
  await u.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(onSelectionChange).toHaveBeenLastCalledWith([]);
});

test("renderSelectionBar clear callback fires onSelectionChange with []", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  render(
    <AutoTable
      id="audit-clear-custom"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      renderSelectionBar={(selected, clear) => (
        <button type="button" onClick={clear}>
          Custom clear {selected.length}
        </button>
      )}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  await u.click(screen.getByRole("button", { name: "Custom clear 1" }));
  expect(onSelectionChange).toHaveBeenLastCalledWith([]);
});

test("deleting the selected row fires onSelectionChange with []", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <AutoTable
      id="audit-delete-selected"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      onDelete={onDelete}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  await u.click(screen.getByLabelText("Delete row 1"));
  await u.click(await screen.findByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith([]));
  expect(
    screen.queryByRole("region", { name: "Selection actions" }),
  ).toBeNull();
});

test("switching the dataSource clears selection and fires onSelectionChange", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  const sourceA = vi.fn().mockResolvedValue({ rows: data, total: 2 });
  const sourceB = vi.fn().mockResolvedValue({ rows: data, total: 2 });
  const { rerender } = render(
    <AutoTable
      id="audit-source-switch"
      dataSource={sourceA}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      virtual={false}
    />,
  );
  await u.click(await screen.findByLabelText("Select row 1"));
  expect(onSelectionChange).toHaveBeenCalledWith([data[0]]);
  rerender(
    <AutoTable
      id="audit-source-switch"
      dataSource={sourceB}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      virtual={false}
    />,
  );
  await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith([]));
  expect(
    screen.queryByRole("region", { name: "Selection actions" }),
  ).toBeNull();
});

test("clear paths leave getSelectedRows empty", async () => {
  const u = userEvent.setup();
  const handle = createRef<AutoTableHandle<{ id: string; name: string }>>();
  render(
    <AutoTable
      ref={handle}
      id="audit-get-selected"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  expect(handle.current?.getSelectedRows()).toEqual([data[0]]);
  await u.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(handle.current?.getSelectedRows()).toEqual([]);
});

test("reset() clears the embedded search inputs", async () => {
  const u = userEvent.setup();
  const handle =
    createRef<AutoTableHandle<{ id: string; name: string; age: number }>>();
  render(
    <AutoTable
      ref={handle}
      id="audit-reset-search"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      searchFields={[{ name: "name", label: "Search name" }]}
      virtual={false}
    />,
  );
  const input = screen.getByLabelText("Search name") as HTMLInputElement;
  await u.type(input, "A");
  expect(input.value).toBe("A");
  handle.current?.reset();
  // The search form remounts, so re-query the input element.
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Search name") as HTMLInputElement).value,
    ).toBe(""),
  );
});

test("reset() fires onSelectionChange with [] when rows were selected", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  const handle = createRef<AutoTableHandle<{ id: string; name: string }>>();
  render(
    <AutoTable
      ref={handle}
      id="audit-reset-selection"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  onSelectionChange.mockClear();
  handle.current?.reset();
  await waitFor(() => expect(onSelectionChange).toHaveBeenLastCalledWith([]));
});

test("FilterEditor keeps an empty string for a cleared numeric value", async () => {
  const u = userEvent.setup();
  const onChange = vi.fn();
  render(
    <AutoConfigProvider>
      <FilterEditor
        columns={[{ key: "age", label: "Age", type: "number" }]}
        value={{ kind: "condition", field: "age", operator: "eq", value: 25 }}
        onChange={onChange}
      />
    </AutoConfigProvider>,
  );
  await u.clear(screen.getByLabelText("Filter value 1"));
  const node = onChange.mock.calls.at(-1)?.[0] as {
    children: { value: unknown }[];
  };
  const condition = node.children[0];
  expect(condition.value).toBe("");
  expect(condition.value).not.toBe(0);
});

test("a cleared numeric equals filter does not match zero-valued rows", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="audit-numeric-filter"
      data={[
        { id: "1", name: "A", age: 0 },
        { id: "2", name: "B", age: 20 },
      ]}
      rowKey="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "age", label: "Age", type: "number" },
      ]}
      virtual={false}
    />,
  );
  await u.click(screen.getByText("Settings"));
  await u.click(screen.getByRole("button", { name: "Filter" }));
  await u.click(screen.getByRole("button", { name: "Add condition" }));
  await u.selectOptions(screen.getByLabelText("Filter field 1"), "age");
  await u.selectOptions(screen.getByLabelText("Filter operator 1"), "eq");
  const value = screen.getByLabelText("Filter value 1") as HTMLInputElement;
  await u.type(value, "20");
  await u.clear(value);
  await u.click(screen.getByText("OK"));
  // The cleared filter must not degrade to `eq 0`, which wrongly matched the
  // zero-valued row. With an empty value nothing matches, so no rows show.
  await waitFor(() => {
    expect(screen.queryByLabelText("Select row 1")).toBeNull();
    expect(screen.queryByLabelText("Select row 2")).toBeNull();
  });
  expect(screen.getByText("No data")).toBeVisible();
});

function dragHeader(
  columns: { key: string; label: string; pin?: "left" | "right" }[],
  pin?: Record<string, "left" | "right" | null>,
  from = 1,
  to = 2,
) {
  const onReorder = vi.fn();
  render(
    <table>
      <TableHeader
        columns={columns}
        rows={[]}
        sort={[]}
        filter={emptyQuery}
        onSort={vi.fn()}
        onFilter={vi.fn()}
        onResize={vi.fn()}
        style={() => ({})}
        hasActions={false}
        allSelected={false}
        onSelectAll={vi.fn()}
        onReorder={onReorder}
        pin={pin}
      />
    </table>,
  );
  const ths = screen.getAllByRole("columnheader");
  const transfer = {
    data: "",
    setData: (_: string, v: string) => {
      transfer.data = v;
    },
    getData: () => transfer.data,
    effectAllowed: "",
    dropEffect: "",
  };
  fireEvent.dragStart(ths[from], { dataTransfer: transfer });
  fireEvent.dragOver(ths[to], { dataTransfer: transfer });
  fireEvent.drop(ths[to], { dataTransfer: transfer });
  cleanup();
  return onReorder;
}

test("drag boundary rejects moves across effective pin groups", () => {
  // Runtime-pinned "Name" (left) vs unpinned "Age": static config has no pins.
  const onReorder = dragHeader(
    [
      { key: "name", label: "Name" },
      { key: "age", label: "Age" },
    ],
    { name: "left" },
  );
  expect(onReorder).not.toHaveBeenCalled();
});

test("drag boundary rejects moves using effective pins over static pins", () => {
  // Static config pins both left, but the user unpinned "Age" via settings.
  const onReorder = dragHeader(
    [
      { key: "name", label: "Name", pin: "left" },
      { key: "age", label: "Age", pin: "left" },
    ],
    { name: "left", age: null },
  );
  expect(onReorder).not.toHaveBeenCalled();
});

test("drag boundary allows moves within the same effective pin group", () => {
  // Both effectively left-pinned at runtime, though static config has no pins.
  const onReorder = dragHeader(
    [
      { key: "name", label: "Name" },
      { key: "age", label: "Age" },
    ],
    { name: "left", age: "left" },
  );
  expect(onReorder).toHaveBeenCalledTimes(1);
});

test("saving a preset works without crypto.randomUUID (non-secure context)", async () => {
  const u = userEvent.setup();
  const randomUUID = globalThis.crypto.randomUUID;
  // Simulate a plain-HTTP origin where crypto.randomUUID does not exist.
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: undefined,
    configurable: true,
  });
  function Panel() {
    const [value, setValue] = useState(() => initialSettings(["a", "b"]));
    return (
      <AutoConfigProvider>
        <SettingsPanel
          value={value}
          columns={[
            { key: "a", label: "A" },
            { key: "b", label: "B" },
          ]}
          onChange={setValue}
        />
      </AutoConfigProvider>
    );
  }
  try {
    render(<Panel />);
    await u.type(screen.getByLabelText("Preset name"), "My preset");
    await u.click(screen.getByRole("button", { name: "Save as new preset" }));
    expect(
      screen.getByRole("option", { name: "My preset" }),
    ).toBeInTheDocument();
  } finally {
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: randomUUID,
      configurable: true,
    });
  }
});

test("deleting one of several selected rows keeps the other selection", async () => {
  const u = userEvent.setup();
  const onSelectionChange = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <AutoTable
      id="audit-delete-partial"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onSelectionChange={onSelectionChange}
      onDelete={onDelete}
      virtual={false}
    />,
  );
  await u.click(screen.getByLabelText("Select row 1"));
  await u.click(screen.getByLabelText("Select row 2"));
  await u.click(screen.getByLabelText("Delete row 1"));
  await u.click(await screen.findByRole("button", { name: "Delete" }));
  expect(onDelete).toHaveBeenCalledWith([data[0]]);
  await waitFor(() =>
    expect(onSelectionChange).toHaveBeenLastCalledWith([data[1]]),
  );
  expect(screen.getByText("1 selected")).toBeVisible();
});

test("drag boundary allows dragging a settings-unpinned column to an unpinned neighbor", () => {
  // Static config pins "Name" left, but the user unpinned it via settings;
  // dragging it to the unpinned "Age" column must be allowed.
  const onReorder = dragHeader(
    [
      { key: "name", label: "Name", pin: "left" },
      { key: "age", label: "Age" },
    ],
    { name: null },
  );
  expect(onReorder).toHaveBeenCalledTimes(1);
});

test("reset() restores search field defaultValues", async () => {
  const u = userEvent.setup();
  const handle = createRef<AutoTableHandle<{ id: string; name: string }>>();
  render(
    <AutoTable
      ref={handle}
      id="audit-reset-default"
      data={data}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      searchFields={[{ name: "name", label: "Search name", defaultValue: "A" }]}
      virtual={false}
    />,
  );
  const input = screen.getByLabelText("Search name") as HTMLInputElement;
  await u.type(input, "B");
  expect(input.value).toBe("AB");
  handle.current?.reset();
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Search name") as HTMLInputElement).value,
    ).toBe("A"),
  );
});

test("dataSource refetches on refresh and when the source identity changes", async () => {
  const u = userEvent.setup();
  const handle = createRef<AutoTableHandle<{ id: string; name: string }>>();
  const sourceA = vi
    .fn()
    .mockResolvedValue({ rows: [{ id: "1", name: "A" }], total: 1 });
  const sourceB = vi
    .fn()
    .mockResolvedValue({ rows: [{ id: "2", name: "B" }], total: 1 });
  const { rerender } = render(
    <AutoTable
      ref={handle}
      id="audit-source-refetch"
      dataSource={sourceA}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      virtual={false}
    />,
  );
  expect(await screen.findByText("A")).toBeVisible();
  expect(sourceA).toHaveBeenCalledTimes(1);
  handle.current?.refresh();
  await waitFor(() => expect(sourceA).toHaveBeenCalledTimes(2));
  rerender(
    <AutoTable
      ref={handle}
      id="audit-source-refetch"
      dataSource={sourceB}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      virtual={false}
    />,
  );
  expect(await screen.findByText("B")).toBeVisible();
  expect(sourceB).toHaveBeenCalled();
});
