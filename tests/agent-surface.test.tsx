import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AutoConfigProvider, AutoForm, AutoTable } from "../src";
import { resetDevChecks } from "../src/core/dev";

test("field, table, and add expose stable test ids", () => {
  render(
    <>
      <AutoForm fields={[{ name: "name", label: "Name" }]} />
      <AutoTable
        id="people"
        data={[{ id: "1", name: "A" }]}
        rowKey="id"
        columns={[{ key: "name", label: "Name" }]}
        onAdd={() => undefined}
        virtual={false}
      />
    </>,
  );
  expect(screen.getByTestId("rac-field-name")).toBeVisible();
  expect(screen.getByTestId("rac-table-people")).toBeVisible();
  expect(screen.getByTestId("rac-add")).toBeVisible();
  expect(screen.getByTestId("rac-submit")).toBeVisible();
});

test("column, row action, and source registries stand in for functions", async () => {
  resetDevChecks();
  const edit = vi.fn();
  const load = vi.fn().mockResolvedValue({
    rows: [{ id: "1", on: true }],
    total: 1,
  });
  const u = userEvent.setup();
  render(
    <AutoConfigProvider
      config={{
        columns: {
          flag: { format: (value) => (value ? "YES" : "NO") },
        },
        rowActions: { edit },
        sources: { people: load },
      }}
    >
      <AutoTable
        id="flags"
        source="people"
        rowKey="id"
        virtual={false}
        columns={[{ key: "on", label: "On", component: "flag" }]}
        rowActions={[{ id: "edit", label: "Edit", action: "edit" }]}
      />
    </AutoConfigProvider>,
  );
  expect(await screen.findByText("YES")).toBeVisible();
  expect(load).toHaveBeenCalled();
  await u.pointer({ keys: "[MouseRight]", target: screen.getByText("YES") });
  await u.click(await screen.findByRole("menuitem", { name: "Edit" }));
  await waitFor(() => expect(edit).toHaveBeenCalled());
});

test("an unknown source shows the repair and does not crash", async () => {
  resetDevChecks();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  render(
    <AutoTable
      id="missing"
      source="missing"
      rowKey="id"
      columns={[{ key: "id", label: "Id" }]}
      virtual={false}
    />,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "RAC-TABLE-SOURCE",
  );
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});
