import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
test("tree expansion and merged cells render the right rows", async () => {
  type Node = { id: string; name: string; group: string; children?: Node[] };
  const rows: Node[] = [
    {
      id: "1",
      name: "Parent",
      group: "A",
      children: [{ id: "1.1", name: "Child", group: "B" }],
    },
    { id: "2", name: "Same group", group: "A" },
  ];
  const u = userEvent.setup();
  const { container } = render(
    <AutoTable
      id="tree"
      data={rows}
      rowKey="id"
      columns={[{ key: "name" }, { key: "group", merge: true }]}
      getChildren={(r) => r.children}
      pagination={false}
    />,
  );
  expect(container.querySelector("[data-virtual]")).toHaveAttribute(
    "data-virtual",
    "false",
  );
  expect(screen.getByText("A").closest("td")).toHaveAttribute("rowspan", "2");
  await u.click(screen.getByLabelText("Expand row 1"));
  expect(screen.getByText("Child")).toBeVisible();
});
test("default hidden column can be enabled in settings", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="hidden"
      data={[{ id: "1", name: "A" }]}
      rowKey="id"
      columns={[
        { key: "id", label: "Number", hidden: true },
        { key: "name", label: "Name" },
      ]}
      virtual={false}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Sort Number" }),
  ).not.toBeInTheDocument();
  await u.click(screen.getByText("Settings"));
  await u.click(screen.getByLabelText("Number", { exact: true }));
  await u.click(screen.getByText("OK"));
  expect(screen.getByRole("button", { name: "Sort Number" })).toBeVisible();
});

test("merged groups break at expanded detail rows", async () => {
  const u = userEvent.setup();
  const { container } = render(
    <AutoTable
      id="merge-details"
      data={[
        { id: "1", group: "A" },
        { id: "2", group: "A" },
      ]}
      rowKey="id"
      columns={[{ key: "group", merge: true }]}
      renderExpanded={(r) => <p>Details {r.id}</p>}
      pagination={false}
    />,
  );
  await u.click(screen.getByLabelText("Expand row 1"));
  expect(
    container.querySelector('tr[data-row-id="1"] td[rowspan]'),
  ).toHaveAttribute("rowspan", "1");
  expect(
    container.querySelector('tr[data-row-id="2"] td[rowspan]'),
  ).toHaveTextContent("A");
});
