import { test, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutoTable,
  type TableToolbarActions,
} from "../src/components/AutoTable";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
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
      data={[{ id: "1", name: "Alice", status: "active", birthDate: "2000-01-01" }]}
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

