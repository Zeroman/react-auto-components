import { useState } from "react";
import { test, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutoTable,
  type TableQuery,
  type TableToolbarActions,
} from "../src/components/AutoTable";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import { emptyQuery } from "../src/core/query";
const data = [
  { id: "1", name: "A", age: 20 },
  { id: "2", name: "B", age: 10 },
  { id: "3", name: "C", age: 30 },
];
test("pinned columns keep sticky offsets without scanning every cell", () => {
  render(
    <AutoTable
      id="pinned-offsets"
      data={[{ id: "1", a: "A", d: "D", b: "B", c: "C", e: "E" }]}
      rowKey="id"
      virtual={false}
      columns={[
        { key: "a", label: "A", pin: "left", width: 100 },
        { key: "d", label: "D", pin: "left", width: 120 },
        { key: "b", label: "B", width: 80 },
        { key: "c", label: "C", pin: "right", width: 60 },
        { key: "e", label: "E", pin: "right", width: 40 },
      ]}
    />,
  );
  const cell = (name: string) => screen.getByRole("cell", { name });
  expect(cell("A").style.left).toBe("44px");
  expect(cell("D").style.left).toBe("144px");
  expect(cell("B").style.position).toBe("");
  expect(cell("C").style.right).toBe("40px");
  expect(cell("E").style.right).toBe("0px");
});

test("one row menu acts on the row that was opened", async () => {
  const u = userEvent.setup();
  const onClick = vi.fn();
  render(
    <AutoTable
      id="shared-row-menu"
      data={[
        { id: "1", name: "A" },
        { id: "2", name: "B" },
      ]}
      rowKey="id"
      virtual={false}
      columns={[{ key: "name", label: "Name" }]}
      rowActions={[{ id: "edit", label: "Edit", onClick }]}
    />,
  );
  await u.pointer({
    keys: "[MouseRight]",
    target: screen.getByRole("cell", { name: "B" }),
  });
  await u.click(await screen.findByRole("menuitem", { name: "Edit" }));
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onClick).toHaveBeenCalledWith({ id: "2", name: "B" });
});

test("toolbar buttons can be hidden and the JSON label is translated", () => {
  const t = (key: string, fallback?: string) =>
    key === "JSON" ? "Datos" : (fallback ?? key);
  const table = (actions?: boolean | TableToolbarActions) => (
    <AutoConfigProvider config={{ t }}>
      <AutoTable
        id="toolbar-actions"
        data={data}
        rowKey="id"
        columns={[{ key: "name", label: "Name" }]}
        toolbarActions={actions}
        virtual={false}
      />
    </AutoConfigProvider>
  );
  const { rerender } = render(table({ export: false, json: false }));
  expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Datos" })).toBeNull();
  rerender(table());
  expect(screen.getByRole("button", { name: "Datos" })).toBeInTheDocument();
  rerender(table(false));
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Datos" })).toBeNull();
});
test.each([undefined, "inline", "separate"] as const)(
  "sort tags support %s layout and can clear sorting",
  async (sortTagsLayout) => {
    const u = userEvent.setup();
    const { container } = render(
      <AutoTable
        id="sort-layout"
        title="People"
        data={data}
        rowKey="id"
        columns={[
          { key: "age", label: "Age" },
          { key: "name", label: "Name" },
        ]}
        sortTagsLayout={sortTagsLayout}
        virtual={false}
      />,
    );
    expect(container.querySelector(".auto-sort-tags")).toBeNull();
    await u.click(screen.getByRole("button", { name: "Sort Age" }));
    expect(container.querySelector(".auto-sort-tags")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Sort Age" }).closest("th"),
    ).toHaveAttribute("aria-sort", "ascending");
    await u.keyboard("{Shift>}");
    await u.click(screen.getByRole("button", { name: "Sort Name" }));
    await u.keyboard("{/Shift}");
    const tag = screen.getByRole("button", { name: "Age ↑ ×" });
    const toolbar = container.querySelector(".auto-toolbar")!;
    expect(toolbar.contains(tag)).toBe(sortTagsLayout !== "separate");
    if (sortTagsLayout === "separate") {
      expect(toolbar.nextElementSibling).toContainElement(tag);
    }
    expect(within(screen.getAllByRole("row")[1]).getByText("10")).toBeVisible();
    await u.click(tag);
    expect(container.querySelector(".auto-sort-tags")).toBeNull();
    expect(within(screen.getAllByRole("row")[1]).getByText("20")).toBeVisible();
  },
);
test("sorting paging and selection keep stable row identity", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="people"
      data={data}
      rowKey="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "age", label: "Age", sortable: true },
      ]}
      pageSize={2}
      virtual={false}
    />,
  );
  expect(screen.queryByText("C")).not.toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "Sort Age" }));
  const rows = screen.getAllByRole("row");
  expect(within(rows[1]).getByText("B")).toBeVisible();
  await u.click(screen.getByLabelText("Select row 2"));
  expect(screen.getByText("1 selected")).toBeVisible();
  await u.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("C")).toBeVisible();
});
test("server mode does not slice returned pages again and ignores stale requests", async () => {
  const source = vi
    .fn()
    .mockResolvedValue({ rows: data.slice(0, 2), total: 8 });
  const u = userEvent.setup();
  render(
    <AutoTable
      id="remote"
      dataSource={source}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      pageSize={2}
      virtual={false}
    />,
  );
  await screen.findByText("A");
  await u.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  expect(screen.getByText("A")).toBeVisible();
  expect(source.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
});

test("column formField configuration and smart type derivation in edit dialog", async () => {
  const onAdd = vi.fn();
  const u = userEvent.setup();
  render(
    <AutoTable<{ id: string; name: string; status: string; birthDate: string }>
      id="smart-columns"
      data={[
        { id: "1", name: "Alice", status: "active", birthDate: "2000-01-01" },
      ]}
      rowKey="id"
      onAdd={onAdd}
      columns={[
        { key: "id", label: "ID", formField: false },
        { key: "name", label: "Full Name" },
        {
          key: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        { key: "birthDate", label: "Birth Date", type: "date" },
      ]}
      virtual={false}
    />,
  );

  await u.click(screen.getByTestId("rac-add"));
  expect(await screen.findByRole("dialog")).toBeVisible();

  // ID column had formField: false, so it should not exist in the dialog
  expect(screen.queryByLabelText("ID")).toBeNull();

  // Name should be an input
  expect(screen.getByRole("textbox", { name: "Full Name" })).toBeVisible();

  // Status should be a select with options
  const statusSelect = screen.getByRole("combobox", { name: "Status" });
  expect(statusSelect).toBeVisible();
  expect(screen.getByRole("option", { name: "Active" })).toBeVisible();

  // Birth Date should have type="date"
  const dateInput = screen.getByLabelText("Birth Date");
  expect(dateInput).toHaveAttribute("type", "date");
});

test("deriveFormFields retains column options when custom formField overrides type", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="test-derive-custom-type"
      rowKey="id"
      data={[{ id: "1", role: "admin" }]}
      onAdd={() => {}}
      columns={[
        {
          key: "role",
          label: "Role",
          options: [
            { value: "admin", label: "Admin" },
            { value: "guest", label: "Guest" },
          ],
          formField: { type: "select", placeholder: "Choose Role" },
        },
      ]}
      virtual={false}
    />,
  );

  await u.click(screen.getByTestId("rac-add"));
  expect(await screen.findByRole("dialog")).toBeVisible();
  const select = screen.getByRole("combobox", { name: "Role" });
  expect(select).toBeVisible();
  expect(screen.getByRole("option", { name: "Admin" })).toBeVisible();
});

test("header toolbar supports title, headerExtra, actions, and divider before tools", () => {
  const { container } = render(
    <AutoTable
      id="test-toolbar-layout"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      title={<span>User Table</span>}
      headerExtra={<span data-testid="header-extra">Live status</span>}
      actions={<button type="button">Custom Action</button>}
      onAdd={() => {}}
      virtual={false}
    />,
  );

  expect(screen.getByText("User Table")).toBeInTheDocument();
  expect(screen.getByTestId("header-extra")).toHaveTextContent("Live status");
  expect(
    screen.getByRole("button", { name: "Custom Action" }),
  ).toBeInTheDocument();
  expect(screen.getByTestId("rac-add")).toBeInTheDocument();
  expect(screen.getByTestId("rac-refresh")).toBeInTheDocument();

  // Divider is present between business actions and system tools
  expect(container.querySelector(".auto-toolbar-divider")).not.toBeNull();
  expect(container.querySelector(".auto-business-actions")).not.toBeNull();
  expect(container.querySelector(".auto-tools")).not.toBeNull();
});

test("divider is omitted when system tools are disabled", () => {
  const { container } = render(
    <AutoTable
      id="test-toolbar-no-tools"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      onAdd={() => {}}
      toolbarActions={false}
      virtual={false}
    />,
  );

  expect(screen.getByTestId("rac-add")).toBeInTheDocument();
  expect(container.querySelector(".auto-toolbar-divider")).toBeNull();
  expect(container.querySelector(".auto-tools")).toBeNull();
});

test("toolbarActions.extra renders custom tool icons/buttons", () => {
  render(
    <AutoTable
      id="test-toolbar-extra"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      toolbarActions={{
        extra: (
          <button type="button" data-testid="custom-tool">
            Fullscreen
          </button>
        ),
      }}
      virtual={false}
    />,
  );

  expect(screen.getByTestId("custom-tool")).toBeInTheDocument();
});

test("selection bar appears on row selection with clear, batch actions and delete", async () => {
  const u = userEvent.setup();
  const onDelete = vi.fn();
  const batchActionClick = vi.fn();

  render(
    <AutoTable
      id="test-selection-bar"
      rowKey="id"
      data={[
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ]}
      onDelete={onDelete}
      batchActions={(selected) => (
        <button type="button" onClick={() => batchActionClick(selected)}>
          Export selected ({selected.length})
        </button>
      )}
      virtual={false}
    />,
  );

  // Initially, no selection bar
  expect(
    screen.queryByRole("region", { name: "Selection actions" }),
  ).toBeNull();
  expect(screen.queryByTestId("rac-delete-selected")).toBeNull();

  // Select first row
  await u.click(screen.getByLabelText("Select row 1"));

  // Selection bar appears
  const selectionBar = screen.getByRole("region", {
    name: "Selection actions",
  });
  expect(selectionBar).toBeVisible();
  expect(screen.getByText("1 selected")).toBeVisible();

  // Batch action is rendered and receives selected rows
  const batchBtn = screen.getByRole("button", { name: "Export selected (1)" });
  await u.click(batchBtn);
  expect(batchActionClick).toHaveBeenCalledWith([{ id: "1", name: "Alice" }]);

  // Delete selected button is in selection bar
  const deleteBtn = screen.getByTestId("rac-delete-selected");
  expect(selectionBar).toContainElement(deleteBtn);
  await u.click(deleteBtn);
  expect(await screen.findByRole("dialog")).toBeVisible();

  // Close dialog by clicking Cancel
  await u.click(screen.getByRole("button", { name: "Cancel" }));

  // Click Clear selection
  await u.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(
    screen.queryByRole("region", { name: "Selection actions" }),
  ).toBeNull();
});

test("renderSelectionBar customizes selection bar", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="test-custom-selection-bar"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      renderSelectionBar={(selected, clear) => (
        <div data-testid="custom-bar">
          <span>Custom selected: {selected.length}</span>
          <button type="button" onClick={clear}>
            Deselect
          </button>
        </div>
      )}
      virtual={false}
    />,
  );

  expect(screen.queryByTestId("custom-bar")).toBeNull();
  await u.click(screen.getByLabelText("Select row 1"));
  expect(screen.getByTestId("custom-bar")).toBeVisible();
  expect(screen.getByText("Custom selected: 1")).toBeVisible();

  await u.click(screen.getByRole("button", { name: "Deselect" }));
  expect(screen.queryByTestId("custom-bar")).toBeNull();
});

test("toolbarActions.mode supports icon, text, and both modes", () => {
  const { rerender } = render(
    <AutoTable
      id="test-tool-modes"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      virtual={false}
    />,
  );

  // Default mode is "icon": has .auto-icon and .auto-sr-only
  const refreshBtn = screen.getByRole("button", { name: "Refresh" });
  expect(refreshBtn.querySelector(".auto-icon")).not.toBeNull();
  expect(refreshBtn.querySelector(".auto-sr-only")).not.toBeNull();
  expect(refreshBtn).toHaveAttribute("title", "Refresh");

  // "text" mode: no .auto-icon, plain text
  rerender(
    <AutoTable
      id="test-tool-modes"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      toolbarActions={{ mode: "text" }}
      virtual={false}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Refresh" }).querySelector(".auto-icon"),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Refresh" })).toHaveTextContent(
    "Refresh",
  );

  // "both" mode: has .auto-icon and visible text
  rerender(
    <AutoTable
      id="test-tool-modes"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      toolbarActions={{ mode: "both" }}
      virtual={false}
    />,
  );
  const bothBtn = screen.getByRole("button", { name: "Refresh" });
  expect(bothBtn.querySelector(".auto-icon")).not.toBeNull();
  expect(bothBtn.querySelector(".auto-sr-only")).toBeNull();
  expect(bothBtn).toHaveTextContent("Refresh");
});

test("column headers support drag-and-drop reordering", () => {
  const { container } = render(
    <AutoTable
      id="test-column-reorder"
      rowKey="id"
      data={[{ id: "1", name: "Alice", age: 25, city: "NYC" }]}
      virtual={false}
      columns={[
        { key: "name", label: "Name" },
        { key: "age", label: "Age" },
        { key: "city", label: "City" },
      ]}
    />,
  );

  const getHeaderKeys = () =>
    Array.from(container.querySelectorAll("thead th"))
      .slice(1) // skip selection checkbox th
      .map((th) => th.textContent?.trim());

  expect(getHeaderKeys()).toEqual(["⋮⋮Name", "⋮⋮Age", "⋮⋮City"]);

  const nameTh = container.querySelectorAll("thead th")[1];
  const cityTh = container.querySelectorAll("thead th")[3];

  expect(nameTh).toHaveAttribute("draggable", "true");
  expect(nameTh).toHaveClass("auto-th-draggable");

  // Mock getBoundingClientRect for cityTh so pos calculation works
  vi.spyOn(cityTh, "getBoundingClientRect").mockReturnValue({
    left: 200,
    width: 100,
    right: 300,
    top: 0,
    bottom: 40,
    height: 40,
    x: 200,
    y: 0,
    toJSON: () => {},
  });

  const dataTransfer = {
    data: {} as Record<string, string>,
    setData(type: string, val: string) {
      this.data[type] = val;
    },
    getData(type: string) {
      return this.data[type] || "";
    },
    effectAllowed: "",
    dropEffect: "",
  };

  // Drag name over city at clientX = 280 (> midpoint 250 -> drop "after")
  fireEvent.dragStart(nameTh, { dataTransfer });
  expect(nameTh).toHaveClass("auto-th-dragging");

  fireEvent.dragOver(cityTh, { clientX: 280, dataTransfer });
  expect(cityTh).toHaveClass("auto-drop-after");

  fireEvent.drop(cityTh, { clientX: 280, dataTransfer });

  // Column "name" should now be after "city"
  expect(getHeaderKeys()).toEqual(["⋮⋮Age", "⋮⋮City", "⋮⋮Name"]);
});

test("reorderableColumns=false disables column dragging", () => {
  const { container } = render(
    <AutoTable
      id="test-column-reorder-disabled"
      rowKey="id"
      data={[{ id: "1", name: "Alice" }]}
      virtual={false}
      reorderableColumns={false}
      columns={[{ key: "name", label: "Name" }]}
    />,
  );

  const nameTh = container.querySelectorAll("thead th")[1];
  expect(nameTh).not.toHaveAttribute("draggable");
  expect(nameTh).not.toHaveClass("auto-th-draggable");
  expect(nameTh.querySelector(".auto-drag-grip")).toBeNull();
});

test("controlled query keeps its initial pageIndex on mount: no onQueryChange, one request", async () => {
  const source = vi.fn().mockResolvedValue({
    rows: [
      { id: "e1", name: "Echo 1" },
      { id: "e2", name: "Echo 2" },
    ],
    total: 20,
  });
  const onQueryChange = vi.fn();

  function TestHarness() {
    const [query, setQuery] = useState<TableQuery>({
      pageIndex: 2,
      pageSize: 2,
      sort: [],
      filter: emptyQuery,
    });
    return (
      <AutoTable
        id="test-controlled-mount"
        rowKey="id"
        dataSource={source}
        columns={[{ key: "name", label: "Name" }]}
        query={query}
        onQueryChange={setQuery}
        virtual={false}
      />
    );
  }

  render(<TestHarness />);

  expect(await screen.findByText("Echo 1")).toBeVisible();

  // The caller's initial page is a legitimate condition (e.g. a deep link):
  // the table fetches it exactly once and never rewrites caller state on
  // mount. "pageIndex belongs to the previous request" applies to source
  // changes only, not to mounting.
  expect(onQueryChange).not.toHaveBeenCalled();
  expect(source).toHaveBeenCalledTimes(1);
  expect(source.mock.calls[0][0].pageIndex).toBe(2);
});

test("in-place source switching retains previous rows during flight, resets pageIndex to 0, clears selection, and displays loading indicators", async () => {
  let resolveSourceB: (value: {
    rows: { id: string; name: string }[];
    total: number;
  }) => void;
  const sourceA = vi.fn().mockResolvedValue({
    rows: [
      { id: "a1", name: "Alpha 1" },
      { id: "a2", name: "Alpha 2" },
    ],
    total: 20,
  });
  const sourceB = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolveSourceB = resolve;
    });
  });

  const u = userEvent.setup();

  function TestHarness() {
    const [source, setSource] = useState(() => sourceA);

    return (
      <div>
        <button
          onClick={() => {
            setSource(() => sourceB);
          }}
        >
          Switch to B
        </button>
        <AutoTable
          id="test-swr"
          rowKey="id"
          dataSource={source}
          columns={[{ key: "name", label: "Name" }]}
          pageSize={2}
          virtual={false}
        />
      </div>
    );
  }

  const { container } = render(<TestHarness />);

  // 1. Initial load from Source A
  expect(await screen.findByText("Alpha 1")).toBeVisible();
  expect(screen.getByText("Alpha 2")).toBeVisible();

  // 2. Select a row on Source A
  const checkboxes = screen.getAllByRole("checkbox");
  await u.click(checkboxes[1]);
  expect(screen.getByText("1 selected")).toBeVisible();

  // 3. Paginate to page 2 (index 1) on Source A
  await u.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(sourceA).toHaveBeenCalledTimes(2));

  // 4. Trigger in-place switch to Source B
  await u.click(screen.getByRole("button", { name: "Switch to B" }));

  // Source B should be called with pageIndex: 0!
  await waitFor(() => expect(sourceB).toHaveBeenCalledTimes(1));
  expect(sourceB.mock.calls[0][0].pageIndex).toBe(0);

  // Requirement #2: While Source B is in flight, Alpha rows are STILL visible (retained)!
  expect(screen.getByText("Alpha 1")).toBeVisible();

  // Requirement #2 + #3: Loading indicators are active!
  const scrollContainer = container.querySelector(".auto-table-scroll");
  expect(scrollContainer).toHaveAttribute("aria-busy", "true");
  const progressBar = container.querySelector(".auto-table-progress");
  expect(progressBar).toHaveAttribute("data-loading", "true");

  // Selection is cleared when switching source!
  expect(screen.queryByText("1 selected")).toBeNull();

  // 5. Source B resolves with new rows
  resolveSourceB!({
    rows: [{ id: "b1", name: "Beta 1" }],
    total: 1,
  });

  // Requirement #3: New rows replace old rows seamlessly
  expect(await screen.findByText("Beta 1")).toBeVisible();
  expect(screen.queryByText("Alpha 1")).toBeNull();
  expect(scrollContainer).toHaveAttribute("aria-busy", "false");
  expect(progressBar).toHaveAttribute("data-loading", "false");
});

test("empty result on source change only shows empty state when response settles", async () => {
  let resolveEmpty: (value: {
    rows: { id: string; name: string }[];
    total: number;
  }) => void;
  const sourceA = vi.fn().mockResolvedValue({
    rows: [{ id: "a1", name: "Alpha 1" }],
    total: 1,
  });
  const sourceEmpty = vi.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      resolveEmpty = resolve;
    });
  });

  const u = userEvent.setup();

  function TestHarness() {
    const [source, setSource] = useState(() => sourceA);
    return (
      <div>
        <button onClick={() => setSource(() => sourceEmpty)}>
          Switch to Empty
        </button>
        <AutoTable
          id="test-swr-empty"
          rowKey="id"
          dataSource={source}
          columns={[{ key: "name", label: "Name" }]}
          virtual={false}
        />
      </div>
    );
  }

  render(<TestHarness />);

  expect(await screen.findByText("Alpha 1")).toBeVisible();

  // Switch to empty source
  await u.click(screen.getByRole("button", { name: "Switch to Empty" }));
  await waitFor(() => expect(sourceEmpty).toHaveBeenCalledTimes(1));

  // Alpha 1 remains visible during flight, NOT "No data"
  expect(screen.getByText("Alpha 1")).toBeVisible();
  expect(screen.queryByText("No data")).toBeNull();

  // Resolve with empty result
  resolveEmpty!({ rows: [], total: 0 });

  // Now "No data" appears
  expect(await screen.findByText("No data")).toBeVisible();
  expect(screen.queryByText("Alpha 1")).toBeNull();
});
test("searchInline mounts the search panel inside the toolbar row", () => {
  const fields = [
    {
      name: "name",
      label: "Name",
      search: { match: "contains" as const },
    },
  ] as const;
  const { container, unmount } = render(
    <AutoTable
      id="search-panel"
      data={data}
      rowKey="id"
      virtual={false}
      columns={[{ key: "name", label: "Name" }]}
      searchFields={[...fields]}
    />,
  );
  const toolbar = container.querySelector(".auto-toolbar");
  expect(toolbar?.getAttribute("data-search-inline")).toBeNull();
  expect(toolbar?.querySelector(".auto-search")).toBeNull();
  expect(container.querySelector(".auto-root > .auto-search")).not.toBeNull();
  unmount();

  render(
    <AutoTable
      id="search-inline"
      data={data}
      rowKey="id"
      virtual={false}
      columns={[{ key: "name", label: "Name" }]}
      searchFields={[...fields]}
      searchInline
    />,
  );
  const inlineToolbar = container.querySelector(".auto-toolbar");
  expect(inlineToolbar?.getAttribute("data-search-inline")).not.toBeNull();
  expect(
    inlineToolbar?.querySelector(".auto-search"),
  ).not.toBeNull();
  expect(container.querySelector(".auto-root > .auto-search")).toBeNull();
});
test("showRecordCount hides the toolbar record count", () => {
  const first = render(
    <AutoTable
      id="record-count"
      data={data}
      rowKey="id"
      virtual={false}
      columns={[{ key: "name", label: "Name" }]}
    />,
  );
  expect(
    first.container.querySelector(".auto-toolbar")?.textContent,
  ).toContain("3 records");
  first.unmount();
  const second = render(
    <AutoTable
      id="record-count-hidden"
      data={data}
      rowKey="id"
      virtual={false}
      columns={[{ key: "name", label: "Name" }]}
      showRecordCount={false}
    />,
  );
  expect(
    second.container.querySelector(".auto-toolbar")?.textContent,
  ).not.toContain("records");
});
